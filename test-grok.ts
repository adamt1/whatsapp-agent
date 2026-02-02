import { Agent } from '@mastra/core/agent';
import { createXai } from '@ai-sdk/xai';
import { registerLeadTool, icountTool, icountCreateDocumentTool, icountGetAccountInfoTool, icountGetIncomeReportTool, icountGetIncomeTaxReportTool, icountGetFullReportTool, icountTestConnectionTool } from './src/mastra/tools';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const xai = createXai({
    apiKey: process.env.XAI_API_KEY,
});

async function test() {
    console.log('Testing minimal Agent with Grok-3 (NO MEMORY)...');

    const testAgent = new Agent({
        id: 'test-agent',
        name: 'Test',
        instructions: 'You are a helpful assistant.',
        model: xai('grok-3'),
        tools: {
            registerLead: registerLeadTool,
            icountRegister: icountTool,
            icountCreateDocument: icountCreateDocumentTool,
            icountGetAccountInfo: icountGetAccountInfoTool,
            icountGetIncomeReport: icountGetIncomeReportTool,
            icountGetIncomeTaxReport: icountGetIncomeTaxReportTool,
            icountGetFullReport: icountGetFullReportTool,
            icountTestConnection: icountTestConnectionTool,
        },
    });

    try {
        const response = await testAgent.generate('שלום, רותם את פה?');
        console.log('Response:', response.text);
    } catch (err: any) {
        console.error('Error occurred:');
        if (err.name) console.error('Error Name:', err.name);
        console.error('Message:', err.message);
        if (err.response) {
            console.error('Status:', err.response.status);
            console.error('Data:', JSON.stringify(err.response.data, null, 2));
        }
        // Deep log for inspection
        // console.log(err);
    }
}

test();
