const fetch = require('node-fetch');

const WEBHOOK_URL = 'https://mpkhfzmyjycynsqjzswl.supabase.co/functions/v1/whatsapp-webhook';

async function test(name, payload) {
    console.log(`\n--- Testing: ${name} ---`);
    try {
        const res = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        console.log(`Status: ${res.status}`);
        console.log(`Response:`, data);
    } catch (e) {
        console.error(`Error:`, e.message);
    }
}

async function runTests() {
    // 1. Allowed (Whitelist)
    await test('Whitelist (Office)', {
        typeWebhook: 'incomingMessageReceived',
        senderData: {
            chatId: '123@c.us',
            sender: '123@c.us',
            senderName: 'משרד כרמלה'
        },
        messageData: { textMessageData: { textMessage: 'הצעת מחיר' } }
    });

    // 2. Ignored (Blacklist)
    await test('Blacklist (Mom)', {
        typeWebhook: 'incomingMessageReceived',
        senderData: {
            chatId: '456@c.us',
            sender: '456@c.us',
            senderName: 'אמא'
        },
        messageData: { textMessageData: { textMessage: 'מתי אתה בא?' } }
    });

    // 3. Ignored (Group)
    await test('Group', {
        typeWebhook: 'incomingMessageReceived',
        senderData: {
            chatId: '789@g.us',
            sender: '123@c.us',
            chatName: 'ועד בית'
        },
        messageData: { textMessageData: { textMessage: 'הודעה קבוצתית' } }
    });
}

runTests();
