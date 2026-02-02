require('dotenv').config({ path: '.env.local' });

async function testXAI() {
    const apiKey = process.env.XAI_API_KEY;
    const model = 'grok-3';

    console.log(`Testing xAI with model: ${model}`);

    try {
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: 'Say hello' }]
            })
        });

        const data = await response.json();
        console.log('Response Status:', response.status);
        console.log('Response Data:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Test Error:', error);
    }
}

testXAI();
