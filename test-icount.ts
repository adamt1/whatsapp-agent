import 'dotenv/config';
import { icount } from './src/services/icount.js';

async function testGetLastDoc() {
    console.log('Testing iCount getLastDocuments with sequential fallback...');
    const doctypes = ['invrec', 'receipt', 'inv', 'offer'];

    for (const doctype of doctypes) {
        try {
            console.log(`Checking ${doctype}...`);
            const result = await icount.getLastDocuments({
                doctype: doctype,
                limit: 1,
            });
            if (result.results_list && result.results_list.length > 0) {
                const doc = result.results_list[0];
                console.log(`Found result for ${doctype}:`, doc.docnum);

                console.log(`Fetching URL for ${doctype} ${doc.docnum}...`);
                try {
                    const urlResult = await icount.getDocUrl({
                        doctype: doctype,
                        docnum: String(doc.docnum)
                    });
                    console.log('URL Result:', urlResult.url);
                } catch (urlErr) {
                    console.error('URL Fetch Failed:', urlErr.message);
                }
                break; // Found one, stop
            }
        } catch (error) {
            console.error(`Failed for ${doctype}:`, error.message);
        }
    }
}

async function testInfo() {
    console.log('\nTesting company info...');
    try {
        const info = await icount.getCompanyInfo();
        console.log('Company Info Success');
    } catch (e) {
        console.error('Info Failed:', e.message);
    }
}

async function run() {
    await testGetLastDoc();
    await testInfo();
}

run();
