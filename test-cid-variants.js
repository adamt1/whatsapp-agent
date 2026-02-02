require('dotenv').config({ path: '.env.local' });

const cid = process.env.ICOUNT_COMPANY_ID;
const user = process.env.ICOUNT_USER;
const pass = process.env.ICOUNT_PASS;

const strippedCid = cid.replace(/\./g, '');

console.log('Testing with Original CID:', cid);
console.log('Testing with Stripped CID:', strippedCid);

async function testReport(testCid) {
    console.log(`\n--- Testing CID: ${testCid} ---`);
    try {
        const response = await fetch(`https://api.icount.co.il/api/v3.php/reports/income_tax_report`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                cid: testCid,
                user,
                pass,
                start_month: '2025-11',
                end_month: '2025-12',
            }),
        });

        const result = await response.json();
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

async function runTests() {
    await testReport(cid);
    await testReport(strippedCid);
}

runTests();
