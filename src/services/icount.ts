import { z } from 'zod';

const ICOUNT_API_URL = 'https://api.icount.co.il/api/v3.php';

export const iCountConfig = {
    cid: process.env.ICOUNT_COMPANY_ID || 'AK',
    user: process.env.ICOUNT_USER || 'a.k.cleaningg',
    pass: process.env.ICOUNT_PASS || 'ADAMiko2911',
};

export class ICountService {
    private async request(endpoint: string, body: any = {}) {
        const url = `${ICOUNT_API_URL}${endpoint}`;

        const payload = {
            cid: iCountConfig.cid,
            user: iCountConfig.user,
            pass: iCountConfig.pass,
            ...body
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`iCount API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        if (data.status === false) {
            throw new Error(`iCount API business error: ${data.reason || 'Unknown error'}`);
        }

        return data;
    }

    /**
     * Create a document (Quote, Invoice, Receipt, etc.)
     */
    async createDoc(params: {
        doctype: 'offer' | 'invrec' | 'receipt' | 'inv' | 'pro' | 'order';
        client_name: string;
        email?: string;
        items: Array<{
            description: string;
            unitprice: number;
            quantity: number;
        }>;
        send_email?: boolean;
    }) {
        return this.request('/doc/create', {
            ...params,
            send_email: params.send_email ? 1 : 0,
        });
    }

    /**
     * Get income report for a period
     */
    async getIncomeReport(startMonth: string, endMonth: string) {
        return this.request('/reports/income_tax_report', {
            start_month: startMonth,
            end_month: endMonth,
        });
    }

    /**
     * Search items in inventory
     */
    async searchItems(query: string) {
        return this.request('/inventory/get_items', {
            q: query,
        });
    }

    /**
     * Get last documents of a certain type
     */
    async getLastDocuments(params: {
        doctype: string;
        limit?: number;
    }) {
        const data = await this.request('/doc/search', {
            doctype: params.doctype,
            limit: params.limit || 1,
            order_by: 'docnum',
            order_dir: 'DESC'
        });
        return data;
    }

    /**
     * Get monthly profitability chart data
     */
    async getMonthlyProfitability(params: {
        start_date: string;
        end_date: string;
    }) {
        return this.request('/chart/monthly_profitability', params);
    }

    /**
     * Get a signed URL for viewing a document
     */
    async getDocUrl(params: {
        doctype: string;
        docnum: string;
    }) {
        return this.request('/doc/get_url', params);
    }

    /**
     * Get list of clients
     */
    async getClients(params: {
        client_name?: string;
        email?: string;
        mobile?: string;
        phone?: string;
        detail_level?: number;
        list_type?: 'array' | 'object';
        include_leads?: boolean;
    } = {}) {
        return this.request('/client/get_list', params);
    }

    /**
     * Get company info
     */
    async getCompanyInfo() {
        return this.request('/company/info');
    }

    /**
     * Send an existing document by email
     */
    async sendDocEmail(params: {
        doctype: string;
        docnum: number;
        email_to?: string;
        email_to_client?: boolean;
        email_comment?: string;
        email_subject?: string;
    }) {
        return this.request('/doc/email', params);
    }
}

export const icount = new ICountService();
