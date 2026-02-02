const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const chatId = '972526672663@c.us';

        console.log('--- Current Session Control ---');
        const res = await client.query('SELECT * FROM session_control WHERE chat_id = $1', [chatId]);
        console.log(res.rows[0] ? res.rows[0] : 'No session found');

        console.log('--- Unpausing ---');
        await client.query(`
      INSERT INTO session_control (chat_id, is_paused, updated_at) 
      VALUES ($1, false, NOW()) 
      ON CONFLICT (chat_id) DO UPDATE SET is_paused = false, updated_at = NOW()
    `, [chatId]);

        const res2 = await client.query('SELECT * FROM session_control WHERE chat_id = $1', [chatId]);
        console.log('New State:', res2.rows[0]);

        console.log('--- Clearing Debug Logs from last hour ---');
        // Not strictly necessary but helpful to see only NEW logs
        // await client.query("DELETE FROM debug_logs WHERE created_at < NOW() - INTERVAL '1 hour'");

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run();
