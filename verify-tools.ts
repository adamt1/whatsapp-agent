import { rotemAgent } from './src/mastra/agents';

async function verifyTools() {
    const tools = rotemAgent.tools;
    const toolIds = Object.keys(tools);

    const expectedTools = [
        'get_events_list',
        'get_client_types',
        'get_client_custom_info'
    ];

    console.log('Registered tools:', toolIds);

    const missingTools = expectedTools.filter(id => !toolIds.includes(id));

    if (missingTools.length === 0) {
        console.log('✅ All new iCount tools are successfully registered in rotemAgent.');
    } else {
        console.error('❌ Missing tools:', missingTools);
        process.exit(1);
    }
}

verifyTools().catch(err => {
    console.error('Verification failed:', err);
    process.exit(1);
});
