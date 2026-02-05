import { mastra } from './src/mastra';
import { RequestContext } from '@mastra/core/request-context';

async function testReminder() {
    const agent = mastra.getAgent('rotemAgent');
    const chatId = '972526672663@c.us';
    const nowInIsrael = new Date().toLocaleString('he-IL', {
        timeZone: 'Asia/Jerusalem',
        dateStyle: 'full',
        timeStyle: 'medium'
    });

    const requestContext = new RequestContext();
    requestContext.set('now', nowInIsrael);

    console.log('Testing reminder tool call...');
    const result = await agent.generate(`[Current Date/Time: ${nowInIsrael}]\n[Sender ID: 972526672663]\nרותם תזכירי לי להתקשר בעוד 5 דקות`, {
        requestContext,
        memory: {
            thread: 'test-thread',
            resource: 'test-resource',
        },
    });

    console.log('Agent Response:', result.text);
    console.log('Tool Calls:', JSON.stringify(result.toolCalls, null, 2));

    if (result.toolCalls && result.toolCalls.length > 0) {
        console.log('✅ Tool call triggered!');
    } else {
        console.log('❌ No tool call triggered.');
    }
}

testReminder().catch(console.error);
