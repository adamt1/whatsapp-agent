import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { mastra } from './src/mastra';

async function simulateAgent() {
    console.log('--- Simulating Rotem Agent Generation ---');
    try {
        const rotem = mastra.getAgent('rotemAgent');
        const chatId = 'test-chat';
        const message = 'היי רותם, תבדקי את החיבור ל-iCount';

        console.log(`Calling generate with model: ${rotem.model.modelId}...`);

        const result = await rotem.generate(message, {
            memory: {
                thread: chatId,
                resource: chatId,
            },
        });

        console.log('SUCCESS!');
        console.log('Reply:', result.text);
    } catch (error: any) {
        console.error('--- GENERATION FAILED ---');
        console.error('Message:', error.message);
        console.error('Details:', JSON.stringify(error, null, 2));
        if (error.stack) {
            console.error('Stack:', error.stack);
        }
    }
}

simulateAgent();
