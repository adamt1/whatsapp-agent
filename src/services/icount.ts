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
     * Get VAT report for a period
     */
    async getVatReport(startMonth: string, endMonth: string) {
        return this.request('/reports/vat_report', {
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
     * Search documents with various filters
     */
    async searchDocuments(params: {
        doctype?: string | string[];
        docnum?: string | number | (string | number)[];
        client_name?: string;
        client_id?: number;
        start_date?: string;
        end_date?: string;
        status?: number;
        limit?: number;
        sort_field?: string;
        sort_order?: 'ASC' | 'DESC';
        get_doc_url?: boolean;
        detail_level?: number;
    }) {
        return this.request('/doc/search', {
            limit: 20,
            sort_field: 'dateissued',
            sort_order: 'DESC',
            get_doc_url: true,
            detail_level: 1,
            ...params
        });
    }

    /**
     * Get last documents of a certain type (helper using search)
     */
    async getLastDocuments(params: {
        doctype: string;
        limit?: number;
    }) {
        return this.searchDocuments({
            doctype: params.doctype,
            limit: params.limit || 1
        });
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
        docnum: string | number;
    }) {
        return this.request('/doc/get_doc_url', params);
    }

    /**
     * Get available document types
     */
    async getDocTypes(list_type: 'array' | 'object' = 'array') {
        return this.request('/doc/types', { list_type });
    }

    /**
     * Get next document numbers for every type
     */
    async getNextDocNums() {
        return this.request('/doc/get_next_docnums');
    }

    /**
     * Get list of clients
     */
    async getClients(params: {
        searchQuery?: string;
        include_leads?: boolean;
    } = {}) {
        const query: any = {
            list_type: 'array',
            include_leads: params.include_leads ?? true,
        };

        if (params.searchQuery) {
            query.client_name = params.searchQuery;
        }

        return this.request('/client/get_list', query);
    }

    /**
     * Get company info
     */
    async getCompanyInfo() {
        return this.request('/company/info');
    }

    /**
     * Get user info
     */
    async getUserInfo(params: {
        user_id?: number;
        username?: string;
        user_email?: string;
    }) {
        return this.request('/user/info', params);
    }

    /**
     * Get users list
     */
    async getUsersList(list_type: 'array' | 'object' = 'array') {
        return this.request('/user/get_list', { list_type });
    }

    /**
     * Get user privilege levels
     */
    async getPrivLevels(list_type: 'array' | 'object' = 'array') {
        return this.request('/user/priv_levels', { list_type });
    }

    /**
     * Get list of income types
     */
    async getIncomeTypes(list_type: 'array' | 'object' = 'array') {
        return this.request('/income_type/get_list', { list_type });
    }

    /**
     * Add a new income type
     */
    async addIncomeType(params: {
        income_type_name: string;
        sortcode_id?: number;
        main_account?: number;
        faccount?: number;
    }) {
        return this.request('/income_type/add', params);
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
