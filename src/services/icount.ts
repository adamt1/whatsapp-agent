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
    unitprice?: number;
    unitprice_incvat?: number;
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
                    items: params.items.map(item => ({
                        description: item.description,
                        unitprice: item.unitprice,
                        unitprice_incvat: item.unitprice_incvat,
                        quantity: item.quantity
                    })),
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
     * Get Income Report for a specific date range
     */
    async getIncomeReport(params: { start_date: string; end_date: string; client_id?: number }) {
        if (!this.apiKey || !this.companyId) {
            const user = process.env.ICOUNT_USER || '';
            const pass = process.env.ICOUNT_PASS || '';
            if (!user || !pass) return null;
        }

        const cid = this.companyId;
        const user = process.env.ICOUNT_USER || '';
        const pass = process.env.ICOUNT_PASS || '';

        try {
            const response = await fetch(`https://api.icount.co.il/api/v3.php/reports/income_report`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    cid,
                    user,
                    pass,
                    start_date: params.start_date,
                    end_date: params.end_date,
                    client_id: params.client_id
                }),
            });

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('iCount getIncomeReport Exception:', error);
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

    /**
     * Get Income Tax Report for a specific date range
     */
    async getIncomeTaxReport(params: { start_month?: string; end_month?: string }) {
        const cid = this.companyId;
        const user = process.env.ICOUNT_USER || '';
        const pass = process.env.ICOUNT_PASS || '';

        try {
            const response = await fetch(`https://api.icount.co.il/api/v3.php/reports/income_tax_report`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    cid,
                    user,
                    pass,
                    start_month: params.start_month,
                    end_month: params.end_month,
                }),
            });

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('iCount getIncomeTaxReport Exception:', error);
            return null;
        }
    }
    /**
     * Get Full Report for a specific date range
     */
    async getFullReport(params: { start_date: string; end_date: string; email?: string }) {
        const cid = this.companyId;
        const user = process.env.ICOUNT_USER || '';
        const pass = process.env.ICOUNT_PASS || '';

        try {
            const response = await fetch(`https://api.icount.co.il/api/v3.php/reports/full_report`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    cid,
                    user,
                    pass,
                    start_date: params.start_date,
                    end_date: params.end_date,
                    email: params.email,
                }),
            });

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('iCount getFullReport Exception:', error);
            return null;
        }
    }
}

export const icountService = new ICountService();
