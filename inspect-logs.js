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
      WHERE payload->>'diag' = 'chat-api-entry' OR payload->>'diag' = 'chat-api-error'
      ORDER BY created_at DESC 
      LIMIT 10
    `);

        console.log('Latest Chat API Entry/Error Logs:');
        res.rows.forEach(row => {
            console.log('---');
            console.log(`[${row.created_at}] Diag: ${row.payload.diag}`);
            console.log(`ChatId: ${row.payload.chatId}`);
            console.log(`Input: ${row.payload.transcribedText || 'N/A'}`);
            if (row.payload.error) console.log(`Error: ${JSON.stringify(row.payload.error, null, 2)}`);
        });

        // Also look for forward success to see the reply text if possible
        // Wait, the reply text is not in forward-success in the Edge function, 
        // it's in the NEXT.JS API response.
        // Let's check the Next.js API outputs if they are logged.
        // Actually, I don't see a log for the generated reply text in route.ts except console.log.

    } catch (err) {
        console.error('Error querying logs:', err);
    } finally {
        await client.end();
    }
}

inspectLogs();
