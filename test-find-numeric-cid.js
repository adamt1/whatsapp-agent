require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.ICOUNT_API_KEY;
const cid = process.env.ICOUNT_COMPANY_ID;

console.log('Fetching account info to find numeric ID...');

async function testReport() {
    try {
        const url = `https://sl.icount.co.il/api/account?key=${apiKey}&cid=${cid}`;
        const response = await fetch(url);

        const result = await response.json();
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

testReport();
