const { icountService } = require('./src/services/icount');
require('dotenv').config({ path: '.env.local' });

async function testReport() {
    console.log('Fetching account info...');
    const info = await icountService.getAccountInfo();
    console.log('Result:', JSON.stringify(info, null, 2));
}

testReport();
