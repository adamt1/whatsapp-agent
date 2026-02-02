const { Client } = require('pg');

async function checkAndUnpauseKarin() {
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

        const chatId = '972542619636@c.us';

        console.log('Checking session_control for Karin:', chatId);
        const res = await client.query("SELECT * FROM session_control WHERE chat_id = $1", [chatId]);

        if (res.rows.length > 0 && res.rows[0].is_paused) {
            console.log('Karin is paused. Unpausing...');
            await client.query("DELETE FROM session_control WHERE chat_id = $1", [chatId]);
            console.log('Karin unpaused.');
        } else {
            console.log('Karin is not paused.');
        }

        await client.end();
    } catch (err) {
        console.error('Error:', err.message);
    }
}

checkAndUnpauseKarin();
