const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
async function run() {
    const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await client.connect();
    const res = await client.query('SELECT * FROM debug_logs WHERE created_at > $1 ORDER BY created_at ASC', ['2026-02-05T10:00:00Z']);
    res.rows.forEach(row => {
        const p = row.payload;
        console.log(`--- [${row.created_at}] ---`);
        console.log(`Diag: ${p.diag}`);
        if (p.type) console.log(`Type: ${p.type}`);
        if (p.chatId) console.log(`ChatId: ${p.chatId}`);
        if (p.reason) console.log(`Reason: ${p.reason}`);
        if (p.full && p.full.messageData) {
            const text = p.full.messageData.textMessageData?.textMessage || p.full.messageData.extendedTextMessageData?.text;
            console.log(`Message: ${text}`);
        }
        if (p.sentPayload) {
            console.log(`Sent: ${p.sentPayload.message}`);
        }
    });
    await client.end();
}
run().catch(console.error);
