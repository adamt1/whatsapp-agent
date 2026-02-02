const { Client } = require('pg');

async function findKarin() {
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

        console.log('Searching for Karin in debug_logs (text cast query)...');
        // Search in the payload's specific fields
        const res = await client.query(`
            SELECT payload->'full'->'senderData' as sender, payload->'full'->'chatId' as chatId, created_at 
            FROM debug_logs 
            WHERE (payload->'full'->'senderData'->>'chatName' ILIKE '%קארין%' 
               OR payload->'full'->'senderData'->>'senderName' ILIKE '%קארין%'
               OR payload->'full'->>'chatId' ILIKE '%קארין%')
            ORDER BY created_at DESC 
            LIMIT 5
        `);

        console.log('Results:', JSON.stringify(res.rows, null, 2));

        if (res.rows.length === 0) {
            console.log('No direct match by name. Listing last 20 incoming messages to help identify...');
            const lastMessages = await client.query(`
                SELECT payload->'full'->'senderData' as sender, payload->'full'->'chatId' as chatId, created_at 
                FROM debug_logs 
                WHERE payload->>'type' = 'incomingMessageReceived'
                ORDER BY created_at DESC 
                LIMIT 20
            `);
            console.log('Last incoming messages:', JSON.stringify(lastMessages.rows, null, 2));
        }

        await client.end();
    } catch (err) {
        console.error('Error:', err.message);
    }
}

findKarin();
