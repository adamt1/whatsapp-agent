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

export interface ICountItem {
    description: string;
    unit_price: number;
    quantity: number;
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
     * Create a document (Invoice, Receipt, Quote, etc.)
     */
    async createDocument(params: {
        doctype: 'invoice' | 'receipt' | 'invrec' | 'offer' | 'deal';
        clientName: string;
        items: ICountItem[];
        email?: string;
    }) {
        if (!this.apiKey || !this.companyId) {
            console.error('iCount credentials missing');
            return null;
        }

        try {
            const response = await fetch(`${ICOUNT_API_URL}/doc/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    cid: this.companyId,
                    key: this.apiKey,
                    doctype: params.doctype,
                    client_name: params.clientName,
                    email: params.email,
                    items: params.items,
                    send_email: !!params.email,
                }),
            });

            const result = await response.json();

            if (result.status === 'success') {
                return {
                    docId: result.doc_id,
                    docUrl: result.doc_url,
                };
            } else {
                console.error('iCount Doc Creation Error:', result.reason || result.message);
                return null;
            }
        } catch (error) {
            console.error('iCount Doc Fetch Exception:', error);
            return null;
        }
    }

    /**
     * Get a simple report (Sales/Balance)
     * For V3, we use /account/info or search documents as a workaround if direct reports are restricted.
     */
    async getAccountInfo() {
        if (!this.apiKey || !this.companyId) return null;

        try {
            const response = await fetch(`https://sl.icount.co.il/api/account?key=${this.apiKey}&cid=${this.companyId}`);
            return await response.json();
        } catch (error) {
            console.error('iCount Report Error:', error);
            return null;
        }
    }

    /**
     * Simple leads to client wrapper
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
