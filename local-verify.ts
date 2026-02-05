
import { rotemAgent } from './src/mastra/agents';
import { RequestContext } from '@mastra/core/request-context';

async function test() {
    const nowStr = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });
    const requestContext = new RequestContext();
    requestContext.set('now', nowStr);

    const message = `[Current Date/Time: ${nowStr}]\n[Sender ID: 972526672663]\nרותם תזכירי לי להתקשר לאמא עוד 5 דקות`;

    console.log('Sending message to agent...');

    // We increase maxSteps to 5 to allow tool usage
    const result = await rotemAgent.generate(message, {
        requestContext,
        maxSteps: 5,
    });

    console.log('--- Agent Response ---');
    console.log(result.text);
    console.log('--- Tool Calls ---');
    // Mastra response has toolCalls in the result if they were made
    if (result.toolCalls && result.toolCalls.length > 0) {
        console.log(JSON.stringify(result.toolCalls, null, 2));
    } else {
        console.log('No tool calls detected.');
    }
}

test().catch(console.error);
