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
     * V3 API Internal fetcher helper
     */
    private async v3Fetch(endpoint: string, params: any) {
        const cid = this.companyId;
        const user = process.env.ICOUNT_USER || '';
        const pass = process.env.ICOUNT_PASS || '';

        if (!cid || !user || !pass) {
            return {
                status: false,
                reason: 'missing_credentials',
                error_description: 'נא לוודא שכל פרטי ההתחברות (CID, User, Pass) מוגדרים ב-Vercel.'
            };
        }

        try {
            const response = await fetch(`https://api.icount.co.il/api/v3.php/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    cid,
                    user,
                    pass,
                    ...params
                }),
            });

            if (!response.ok) {
                return {
                    status: false,
                    reason: 'http_error',
                    error_description: `שגיאת תקשורת מול iCount: ${response.status} ${response.statusText}`
                };
            }

            const result = await response.json();
            return result;
        } catch (error: any) {
            console.error(`iCount V3 ${endpoint} Fetch Exception:`, error);
            return {
                status: false,
                reason: 'exception',
                error_description: `חלה שגיאה טכנית בפנייה ל-iCount: ${error.message}`
            };
        }
    }

    /**
     * Test connection to iCount
     */
    async testConnection() {
        return this.v3Fetch('user/info', { username: process.env.ICOUNT_USER });
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
        return this.v3Fetch('reports/income_report', params);
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
        return this.v3Fetch('reports/income_tax_report', params);
    }

    /**
     * Get Full Report for a specific date range
     */
    async getFullReport(params: { start_date: string; end_date: string; email?: string }) {
        return this.v3Fetch('reports/full_report', params);
    }

    /**
     * Get available accounting export types
     */
    async getAccountingExportTypes() {
        return this.v3Fetch('export/accounting_export_types', {});
    }

    /**
     * Export accounting data
     */
    async exportAccountingData(params: {
        export_type: string;
        start_date: string;
        end_date: string;
        export_docs?: boolean;
        export_expenses?: boolean;
        export_clients?: boolean;
        export_suppliers?: boolean;
        webhook_url?: string;
        webhook_method?: 'JSON' | 'POST' | 'GET';
    }) {
        return this.v3Fetch('export/accounting_data', params);
    }

    /**
     * Get user info
     */
    async getUserInfo(params: { user_id?: number; username?: string; user_email?: string }) {
        return this.v3Fetch('user/info', params);
    }

    /**
     * Create a new user
     */
    async createUser(params: {
        new_user: string;
        new_pass: string;
        first_name: string;
        last_name: string;
        email: string;
        first_name_en?: string;
        last_name_en?: string;
        mobile?: string;
        phone?: string;
        address?: string;
        priv_level?: number;
        privs?: Record<string, boolean>;
    }) {
        return this.v3Fetch('user/create', params);
    }

    /**
     * Update user information
     */
    async updateUser(params: {
        user_id: number;
        first_name?: string;
        last_name?: string;
        first_name_en?: string;
        last_name_en?: string;
        email?: string;
        mobile?: string;
        phone?: string;
        address?: string;
        priv_level?: number;
        privs?: Record<string, boolean>;
    }) {
        return this.v3Fetch('user/update', params);
    }

    /**
     * Delete user (deactivate)
     */
    async deleteUser(userId: number) {
        return this.v3Fetch('user/delete', { user_id: userId });
    }

    /**
     * Undelete user (reactivate)
     */
    async undeleteUser(userId: number) {
        return this.v3Fetch('user/undelete', { user_id: userId });
    }

    /**
     * Get users list
     */
    async getUserList(listType: 'array' | 'object' = 'object') {
        return this.v3Fetch('user/get_list', { list_type: listType });
    }

    /**
     * Get user privilege levels
     */
    async getPrivLevels(listType: 'array' | 'object' = 'object') {
        return this.v3Fetch('user/priv_levels', { list_type: listType });
    }

    /**
     * Get Password Policy
     */
    async getPasswordPolicy() {
        return this.v3Fetch('user/password_policy', {});
    }

    /**
     * Upload user profile image
     */
    async uploadProfileImage(profileImage: string) {
        return this.v3Fetch('user/upload_profile_image', { profile_image: profileImage });
    }

    /**
     * Delete user profile image
     */
    async deleteProfileImage() {
        return this.v3Fetch('user/delete_profile_image', {});
    }
}

export const icountService = new ICountService();
