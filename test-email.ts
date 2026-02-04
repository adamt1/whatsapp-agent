import 'dotenv/config';
import { icount } from './src/services/icount.js';

async function testEmail() {
    console.log('Fetching documents...');
    try {
        const types = ['invrec', 'receipt', 'inv', 'offer'];
        let doc = null;

        for (const type of types) {
            try {
                console.log(`Checking for ${type}...`);
                const search = await icount.getLastDocuments({ doctype: type, limit: 1 });
                const results = search.results_list;
                if (results && results.length > 0) {
                    doc = results[0];
                    break;
                }
            } catch (innerError) {
                console.log(`Error or no ${type} found: ${innerError.message}`);
            }
        }

        if (!doc) {
            console.log('No documents found to test with.');
            return;
        }

        console.log(`Found document: ${doc.doctype} #${doc.docnum}`);

        console.log('Attempting to send email to a test address...');
        const result = await icount.sendDocEmail({
            doctype: doc.doctype,
            docnum: parseInt(doc.docnum),
            email_to: 'adam@tayar.me',
            email_comment: 'זהו מסמך בדיקה שנשלח על ידי רותם.'
        });

        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('Test failed:', e.message);
    }
}

testEmail();
