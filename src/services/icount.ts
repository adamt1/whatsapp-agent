/**
 * iCount Service
 * Handles interactions with the iCount API for customer and document management.
 */

const ICOUNT_API_URL = 'https://api.icount.co.il/api/v3';

export interface ICountClient {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
}

export class ICountService {
    private apiKey: string;
    private companyId: string;

    constructor() {
        this.apiKey = process.env.ICOUNT_API_KEY || '';
        this.companyId = process.env.ICOUNT_COMPANY_ID || '';
    }

    /**
     * Create or update a client in iCount
     */
    async createClient(clientData: ICountClient) {
        if (!this.apiKey || !this.companyId) {
            console.error('iCount credentials missing');
            return null;
        }

        try {
            const response = await fetch(`${ICOUNT_API_URL}/client/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    cid: this.companyId,
                    key: this.apiKey,
                    client_name: clientData.name,
                    email: clientData.email,
                    phone: clientData.phone,
                    address: clientData.address,
                }),
            });

            const result = await response.json();

            if (result.status === 'success') {
                return result.client_id;
            } else {
                console.error('iCount Error:', result.reason || result.message);
                return null;
            }
        } catch (error) {
            console.error('iCount Fetch Exception:', error);
            return null;
        }
    }

    /**
     * Create a lead (if iCount supports leads via specialized API)
     * For iCount, clients can often be used as leads.
     */
    async createLead(name: string, phone: string, notes: string) {
        return this.createClient({
            name,
            phone,
            address: notes
        });
    }
}

export const icountService = new ICountService();
