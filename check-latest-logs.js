const { Client } = require('pg');

async function checkLatestLogs() {
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

        console.log(`\n--- Absolute Latest Logs ---`);
        const logsRes = await client.query(`
            SELECT created_at, payload 
            FROM debug_logs 
            ORDER BY created_at DESC 
            LIMIT 30
        `);

        logsRes.rows.forEach(log => {
            console.log(`[${log.created_at}] ${JSON.stringify(log.payload)}`);
        });

        await client.end();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

checkLatestLogs();
