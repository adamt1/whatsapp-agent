const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
async function run() {
    const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await client.connect();
    const res = await client.query('SELECT * FROM mastra_messages WHERE thread_id = $1 AND "createdAt" > $2 ORDER BY "createdAt" ASC', ['972526672663@c.us', '2026-02-05T00:00:00Z']);
    res.rows.forEach(row => {
        console.log('---');
        console.log(`[${row.createdAt}] Role: ${row.role}`);
        console.log(`Content: ${row.content}`);
    });
    await client.end();
}
run().catch(console.error);
