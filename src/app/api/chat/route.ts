import { NextRequest, NextResponse } from 'next/server';
import { mastra } from '@/mastra';
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { supabase } from '@/services/supabase';

const GREEN_API_URL = process.env.NEXT_PUBLIC_GREEN_API_URL;
const ID_INSTANCE = process.env.NEXT_PUBLIC_GREEN_API_ID_INSTANCE;
const API_TOKEN = process.env.NEXT_PUBLIC_GREEN_API_TOKEN_INSTANCE;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';

const elevenlabs = new ElevenLabsClient({
    apiKey: ELEVENLABS_API_KEY,
});


export async function POST(req: NextRequest) {
    try {
        const { message, chatId, messageType, isPaused } = await req.json();

        if (!message || !chatId) {
            return NextResponse.json({ error: 'Missing message or chatId' }, { status: 400 });
        }

        const rotem = mastra.getAgent('rotemAgent');

        // Generate reply using Mastra with memory (always do this to keep context)
        let result;
        const senderId = chatId.split('@')[0];
        const messageWithContext = `[Sender ID: ${senderId}]\n${message}`;

        try {
            console.log(`Calling Mastra generate for ${chatId}...`);
            result = await rotem.generate(messageWithContext, {
                memory: {
                    thread: chatId,
                    resource: chatId,
                },
            });
        } catch (genError: any) {
            console.error('Mastra Generate Detailed Error:', genError);

            const errorDetails: any = {
                message: genError.message,
                name: genError.name,
                stack: genError.stack,
            };

            // Attempt to extract more info from the AI SDK error
            if (genError.response) {
                errorDetails.status = genError.response.status;
                errorDetails.statusText = genError.response.statusText;
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
                        raw: JSON.parse(JSON.stringify(genError)) // Try to capture everything
                    },
                    rawMessage: message
                }
            });

            throw new Error(`Mastra Generate Error: ${genError.message}`);
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
            } catch (elevenError: any) {
                throw new Error(`ElevenLabs Error: ${elevenError.message}`);
            }

            // Convert stream to Buffer
            const chunks = [];
            // @ts-ignore
            for await (const chunk of audioStream) {
                chunks.push(chunk);
            }
            const audioBuffer = Buffer.concat(chunks);

            // Upload to Supabase Storage
            const fileName = `reply_${chatId}_${Date.now()}.mp3`;
            const { data: uploadData, error: uploadError } = await supabase.storage
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
            const greenUrl = `${GREEN_API_URL}/waInstance${ID_INSTANCE}/sendFileByUrl/${API_TOKEN}`;
            const greenRes = await fetch(greenUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId: chatId,
                    urlFile: publicUrl,
                    fileName: 'voice.mp3',
                    typingType: 'recording',
                    typingTime: 3000
                }),
            });

            return NextResponse.json({ success: true, type: 'audio', audioUrl: publicUrl });
        } else {
            // Send Text Message via Green API
            const greenUrl = `${GREEN_API_URL}/waInstance${ID_INSTANCE}/sendMessage/${API_TOKEN}`;
            const greenRes = await fetch(greenUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId: chatId,
                    message: replyText
                }),
            });

            return NextResponse.json({ success: true, type: 'text', reply: replyText });
        }
    } catch (error: any) {
        console.error('Chat API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
