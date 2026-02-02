import { icountService } from './src/services/icount.js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testReport() {
    console.log('Testing iCount V3 Connection...');
    const info = await icountService.testConnection();
    console.log('Result:', JSON.stringify(info, null, 2));
}

testReport();
