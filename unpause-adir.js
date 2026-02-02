const { Client } = require('pg');

async function checkAndUnpause() {
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

        const chatId = '972507445589@c.us';

        console.log('Checking session_control for:', chatId);
        const res = await client.query("SELECT * FROM session_control WHERE chat_id = $1", [chatId]);

        if (res.rows.length > 0) {
            console.log('Current status:', res.rows[0]);
            if (res.rows[0].is_paused) {
                console.log('Unpausing session...');
                await client.query("UPDATE session_control SET is_paused = false WHERE chat_id = $1", [chatId]);
                console.log('Session unpaused successfully.');
            } else {
                console.log('Session is not paused.');
            }
        } else {
            console.log('No session record found (meaning it is not paused by default).');
        }

        await client.end();
    } catch (err) {
        console.error('Error:', err.message);
    }
}

checkAndUnpause();
