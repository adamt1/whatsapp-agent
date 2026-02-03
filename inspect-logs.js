const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function inspectLogs() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to Supabase DB');

        const res = await client.query(`
      SELECT * FROM debug_logs 
      ORDER BY created_at DESC 
      LIMIT 10
    `);

        console.log('Latest Debug Logs:');
        res.rows.forEach(row => {
            console.log('---');
            console.log(`[${row.created_at}] Diag: ${row.payload.diag}`);
            if (row.payload.chatId) console.log(`ChatId: ${row.payload.chatId}`);
            if (row.payload.transcribedText) console.log(`Input: ${row.payload.transcribedText}`);
            if (row.payload.error) console.log(`Error: ${JSON.stringify(row.payload.error, null, 2)}`);
            // console.log('Full Payload:', JSON.stringify(row.payload, null, 2));
        });

    } catch (err) {
        console.error('Error querying logs:', err);
    } finally {
        await client.end();
    }
}

inspectLogs();
