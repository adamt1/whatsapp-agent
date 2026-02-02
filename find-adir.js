const { Client } = require('pg');

async function checkAdir() {
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

        const adirNumber = '972507445589';

        console.log('Checking every single log matching Adir...');

        const res = await client.query(`
            SELECT * FROM debug_logs 
            WHERE (payload::text LIKE $1)
            AND created_at > NOW() - INTERVAL '4 hours'
            ORDER BY created_at ASC 
        `, [`%${adirNumber}%`]);

        res.rows.forEach(log => {
            console.log(`[${log.created_at}] ${JSON.stringify(log.payload)}`);
        });

        await client.end();
    } catch (err) {
        console.error('Error:', err.message);
    }
}

checkAdir();
