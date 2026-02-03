import 'dotenv/config';
import { icount } from './src/services/icount.js';

async function testGetClients() {
    console.log('Testing iCount getClients...');
    try {
        const result = await icount.getClients({
            detail_level: 1,
        });
        console.log('Status:', result.status);
        if (result.client_list) {
            console.log(`Found ${result.client_list.length} clients.`);
            console.log('Sample client:', result.client_list[0]?.client_name);
        } else {
            console.log('No client list returned. Reason:', result.reason);
        }
    } catch (error) {
        console.error('Test Failed:', error.message);
    }
}

testGetClients();
