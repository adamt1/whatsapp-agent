const { Client } = require('pg');

async function listSessions() {
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
        const res = await client.query("SELECT * FROM session_control");
        console.log('All sessions:', JSON.stringify(res.rows, null, 2));
        await client.end();
    } catch (err) {
        console.error('Error:', err.message);
    }
}

listSessions();
