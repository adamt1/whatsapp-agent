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

        // Log all properties (since AI SDK errors often have custom props)
        const allProps: any = {};
        Object.getOwnPropertyNames(error).forEach(prop => {
            allProps[prop] = error[prop];
        });

        console.error('Full Error Object:', JSON.stringify(allProps, null, 2));

        if (error.response) {
            console.error('Response Status:', error.response.status);
            try {
                const body = await error.response.json();
                console.error('Response Body:', JSON.stringify(body, null, 2));
            } catch (e) {
                console.error('Could not parse response body');
            }
        }
    }
}

simulateAgent();
