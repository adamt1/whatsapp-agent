export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { mastra } from '@/mastra';
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { supabase } from '@/services/supabase';
import { greenApi } from '@/services/greenapi';

// const GREEN_API_URL = process.env.NEXT_PUBLIC_GREEN_API_URL;
// const ID_INSTANCE = process.env.NEXT_PUBLIC_GREEN_API_ID_INSTANCE;
// const API_TOKEN = process.env.NEXT_PUBLIC_GREEN_API_TOKEN_INSTANCE;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';

const elevenlabs = new ElevenLabsClient({
    apiKey: ELEVENLABS_API_KEY,
});



export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { message, chatId, messageType, isPaused, downloadUrl } = body;

        console.log(`[Next.js API] Received request for chatId: ${chatId}, type: ${messageType}`);

        // Set typing status immediately (unless in background mode)
        if (!isPaused) {
            greenApi.sendTyping(chatId, messageType === 'audio' ? 'recording' : 'typing', 8000);
        }

        let incomingText = message;

        // If audio, transcribe it first
        if (messageType === 'audio' && downloadUrl) {
            console.log(`Downloading audio from ${downloadUrl}...`);
            try {
                const audioRes = await fetch(downloadUrl);
                if (!audioRes.ok) throw new Error(`Failed to download audio: ${audioRes.statusText}`);

                const audioBlob = await audioRes.blob();

                console.log(`Transcribing audio with ElevenLabs [scribe_v2]...`);
                const transcription = await elevenlabs.speechToText.convert({
                    file: audioBlob,
                    modelId: "scribe_v2",
                    languageCode: "he",
                    tagAudioEvents: true,
                });

                if ('text' in transcription) {
                    incomingText = (transcription as unknown as { text: string }).text;
                } else if ('transcripts' in transcription) {
                    incomingText = (transcription as unknown as { transcripts: Array<{ text: string }> }).transcripts.map((t) => t.text).join(' ');
                }

                console.log(`Transcribed text: ${incomingText}`);
            } catch (sttError: unknown) {
                console.error('STT Error:', sttError);
                // Fallback to placeholder if transcription fails
                incomingText = message || "שלחת לי הודעה קולית (נכשלה המרת הטקסט)";
            }
        }

        // Log entry to Supabase for tracking the chain
        await supabase.from('debug_logs').insert({
            payload: {
                diag: 'chat-api-entry',
                chatId,
                messageType,
                isPaused,
                transcribedText: incomingText !== message ? incomingText : undefined
            }
        });

        if (!incomingText || !chatId) {
            return NextResponse.json({ error: 'Missing message or chatId' }, { status: 400 });
        }

        const rotem = mastra.getAgent('rotemAgent');

        // Generate reply using Mastra with memory
        let result;
        const senderId = chatId.split('@')[0];
        const nowInIsrael = new Date().toLocaleString('he-IL', {
            timeZone: 'Asia/Jerusalem',
            dateStyle: 'full',
            timeStyle: 'medium'
        });
        const messageWithContext = `[Current Date/Time: ${nowInIsrael}]\n[Sender ID: ${senderId}]\n${incomingText}`;

        try {
            console.log(`Calling Mastra generate for ${chatId}...`);
            // Show bot is thinking
            if (!isPaused) {
                greenApi.sendTyping(chatId, 'typing', 10000);
            }
            result = await rotem.generate(messageWithContext, {
                memory: {
                    thread: chatId,
                    resource: chatId,
                },
            });
        } catch (genError: unknown) {
            const error = genError as Error & { response?: { status: number, statusText: string } };
            console.error('Mastra Generate Detailed Error:', error);

            const errorDetails: Record<string, unknown> = {
                message: error.message,
                name: error.name,
                stack: error.stack,
            };

            // Attempt to extract more info from the AI SDK error
            if (error.response) {
                errorDetails.status = error.response.status;
                errorDetails.statusText = error.response.statusText;
            }

            // Log full error string for debugging
            console.error('JSON Error:', JSON.stringify(genError, null, 2));

            // Keep the direct Supabase logging as it is very helpful for production
            await supabase.from('debug_logs').insert({
                payload: {
                    diag: 'chat-api-error',
                    chatId,
                    error: {
                        ...errorDetails,
                        raw: JSON.parse(JSON.stringify(error)) // Try to capture everything
                    },
                    rawMessage: message
                }
            });

            throw new Error(`Mastra Generate Error: ${error.message}`);
        }

        const replyText = result.text;
        console.log(`Generated reply for ${chatId}: ${replyText}`);

        // BACKGROUND MODE: If paused, don't send the reply
        if (isPaused) {
            console.log(`Background mode active for ${chatId}. Skipping outgoing message.`);
            return NextResponse.json({ success: true, mode: 'background', reply: replyText });
        }

        // Decide output: Audio if requested, else Text
        if (messageType === 'audio') {
            // Generate Audio using ElevenLabs
            console.log(`Generating audio with ElevenLabs [eleven_v3]...`);
            let audioStream;
            try {
                audioStream = await elevenlabs.textToSpeech.convert(ELEVENLABS_VOICE_ID, {
                    outputFormat: "mp3_44100_128",
                    text: replyText,
                    modelId: "eleven_v3",
                });
            } catch (elevenError: unknown) {
                const error = elevenError as Error;
                throw new Error(`ElevenLabs Error: ${error.message}`);
            }

            // Convert stream to Buffer
            const chunks = [];
            for await (const chunk of audioStream as any) {
                chunks.push(chunk);
            }
            const audioBuffer = Buffer.concat(chunks);

            // Upload to Supabase Storage
            const fileName = `reply_${chatId}_${Date.now()}.mp3`;
            const { error: uploadError } = await supabase.storage
                .from('audio-messages')
                .upload(fileName, audioBuffer, {
                    contentType: 'audio/mpeg',
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                throw new Error(`Supabase Storage Error: ${uploadError.message}`);
            }

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('audio-messages')
                .getPublicUrl(fileName);

            // Send Voice Message via Green API
            await greenApi.sendFileByUrl(
                chatId,
                publicUrl,
                'voice.mp3',
                undefined,
                'recording',
                3000
            );

            return NextResponse.json({ success: true, type: 'audio', audioUrl: publicUrl });
        } else {
            // Send Text Message via Green API
            await greenApi.sendMessage(chatId, replyText, 'typing', 3000);

            return NextResponse.json({ success: true, type: 'text', reply: replyText });
        }
    } catch (error: unknown) {
        const err = error as Error;
        console.error('Chat API Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
