require('dotenv').config({ path: '.env.local' });
const { mastra } = require('./dist/mastra/index.js'); // Assuming we can run the compiled JS or use ts-node

async function testAgent() {
    console.log('--- Testing Mastra Agent Initialization ---');
    try {
        const agent = mastra.getAgent('rotemAgent');
        if (!agent) {
            console.error('FAILED: rotemAgent not found in mastra instance');
            return;
        }
        console.log('SUCCESS: rotemAgent initialized');
        console.log('Agent Name:', agent.name);

        // Check tools
        const tools = Object.keys(agent.tools || {});
        console.log('Registered Tools:', tools.join(', '));

        const requiredTools = [
            'icountGetUserInfo',
            'icountTestConnection'
        ];

        for (const tool of requiredTools) {
            if (tools.includes(tool)) {
                console.log(`Tool ${tool}: FOUND`);
            } else {
                console.warn(`Tool ${tool}: MISSING`);
            }
        }

    } catch (error) {
        console.error('Mastra Test Exception:', error);
    }
}

testAgent();
