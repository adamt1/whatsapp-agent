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
    console.log('POST /api/chat started');
    try {
        const { message, chatId } = await req.json();

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
        try {
            // @ts-ignore
            for await (const chunk of audioStream) {
                chunks.push(chunk);
            }
        } catch (streamError: any) {
            throw new Error(`Audio Stream Error: ${streamError.message}`);
        }
        const audioBuffer = Buffer.concat(chunks);

        // Upload to Supabase Storage
        const fileName = `reply_${chatId}_${Date.now()}.mp3`;
        console.log(`Uploading to Supabase: ${fileName}`);
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('audio-messages')
            .upload(fileName, audioBuffer, {
                contentType: 'audio/mpeg',
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            console.error('Supabase Storage Upload Detail:', uploadError);
            throw new Error(`Supabase Storage Error: ${uploadError.message || JSON.stringify(uploadError)}`);
        }

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('audio-messages')
            .getPublicUrl(fileName);

        console.log(`Audio uploaded. Public URL: ${publicUrl}`);

        // Send Voice Message via Green API
        const greenUrl = `${GREEN_API_URL}/waInstance${ID_INSTANCE}/sendFileByUrl/${API_TOKEN}`;
        console.log(`Sending voice to Green API: ${greenUrl}`);

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

        const greenData = await greenRes.json();
        console.log('Green API Response:', greenData);

        if (!greenRes.ok) {
            throw new Error(`Green API Error: ${JSON.stringify(greenData)}`);
        }

        return NextResponse.json({ success: true, reply: replyText, audioUrl: publicUrl, greenData });
    } catch (error: any) {
        console.error('Chat API Error:', error);
        return NextResponse.json({ error: `MAYA_CRITICAL_DEBUG: ${error.message}` }, { status: 500 });
    }
}
