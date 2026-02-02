const { Client } = require('pg');

async function unpauseUser() {
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

        console.log(`Unpausing session for ${chatId}...`);
        await client.query('UPDATE session_control SET is_paused = false WHERE chat_id = $1', [chatId]);
        console.log('Done.');

        await client.end();
    } catch (err) {
        console.error('Error:', err.message);
    }
}

unpauseUser();
