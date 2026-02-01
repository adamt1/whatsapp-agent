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
        const { message, chatId, messageType } = await req.json();

        if (!message || !chatId) {
            return NextResponse.json({ error: 'Missing message or chatId' }, { status: 400 });
        }

        const maya = mastra.getAgent('mayaAgent');
        let memory;
        try {
            memory = await maya.getMemory();
        } catch (memError: any) {
            throw new Error(`Mastra GetMemory Error: ${memError.message}`);
        }

        // Ensure the Postgres tables exist
        if (memory?.storage && 'init' in memory.storage) {
            try {
                await (memory.storage as any).init();
            } catch (initError: any) {
                throw new Error(`Mastra Storage Init Error: ${initError.message}`);
            }
        }

        // Generate reply using Mastra with memory
        let result;
        try {
            result = await maya.generate(message, {
                memory: {
                    thread: chatId,
                    resource: chatId,
                },
            });
        } catch (genError: any) {
            throw new Error(`Mastra Generate Error: ${genError.message}`);
        }

        const replyText = result.text;
        console.log(`Generated reply for ${chatId}: ${replyText}`);

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
