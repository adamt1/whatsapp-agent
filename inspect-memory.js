const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function inspectMemory() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to Supabase DB');

        // Query messages for the manager
        const res = await client.query(`
      SELECT * FROM mastra_messages 
      WHERE thread_id = '972526672663@c.us'
      ORDER BY "createdAt" DESC 
      LIMIT 20
    `);

        console.log('Latest Conversation Memory for Manager:');
        res.rows.forEach(row => {
            console.log('---');
            console.log(`[${row.createdAt}] Role: ${row.role}`);
            console.log(`Content Sample: ${row.content.substring(0, 500)}`);
        });

    } catch (err) {
        console.error('Error querying memory:', err);
    } finally {
        await client.end();
    }
}

inspectMemory();
