const { Client } = require('pg');

async function debugSession() {
    const client = new Client({
        user: 'postgres.mpkhfzmyjycynsqjzswl',
        host: 'aws-1-ap-south-1.pooler.supabase.com',
        database: 'postgres',
        password: 'Maya2026Bot',
        port: 6543,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        const chatId = '972526672663@c.us';

        console.log(`Checking session for ${chatId}...`);
        const res = await client.query('SELECT * FROM session_control WHERE chat_id = $1', [chatId]);

        if (res.rows.length > 0) {
            console.log('Session Status:', res.rows[0]);
        } else {
            console.log('No session found for this chat ID.');
        }

        console.log('\nChecking latest debug logs for this number...');
        const logRes = await client.query(`
            SELECT created_at, payload 
            FROM debug_logs 
            WHERE payload::text LIKE $1 
            ORDER BY created_at DESC 
            LIMIT 5
        `, [`%${chatId}%`]);

        logRes.rows.forEach(log => {
            console.log(`[${log.created_at}] ${JSON.stringify(log.payload)}`);
        });

        await client.end();
    } catch (err) {
        console.error('Error:', err.message);
    }
}

debugSession();
