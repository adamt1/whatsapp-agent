const { Client } = require('pg');

async function resumeAll() {
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

        console.log('Resuming all paused conversations...');
        const res = await client.query("DELETE FROM session_control");
        console.log(`Successfully resumed ${res.rowCount} conversation(s).`);

        await client.end();
    } catch (err) {
        console.error('Error:', err.message);
    }
}

resumeAll();
