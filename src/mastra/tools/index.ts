import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { icountService } from '../../services/icount';

export const registerLeadTool = createTool({
    id: 'register_lead',
    description: 'Registers a new lead in the CRM (n8n) with property details and contact info.',
    inputSchema: z.object({
        customerName: z.string().describe('The name of the customer'),
        phoneNumber: z.string().describe('The phone number of the customer'),
        propertyType: z.enum(['office', 'building', 'other']).describe('Type of property (office/building/other)'),
        propertySize: z.string().describe('Size of the property (e.g. 100 sqm or 5 rooms)'),
        additionalNotes: z.string().optional().describe('Any additional notes from the conversation'),
    }),
    execute: async (args) => {
        const WEBHOOK_URL = 'https://akcleaninng.app.n8n.cloud/webhook-test/newlead';

        try {
            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...args,
                    source: 'WhatsApp Bot',
                    timestamp: new Date().toISOString(),
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to send lead to n8n: ${response.statusText}`);
            }

            return {
                success: true,
                message: 'הליד נרשם בהצלחה במערכת!',
            };
        } catch (error) {
            console.error('n8n error:', error);
            return {
                success: false,
                message: 'חלה שגיאה ברישום הליד במערכת העסקית.',
            };
        }
    },
});

export const icountTool = createTool({
    id: 'icount_register',
    description: 'Registers a new client or lead in the iCount invoicing system.',
    inputSchema: z.object({
        name: z.string().describe('Full name of the client'),
        phone: z.string().describe('Phone number of the client'),
        email: z.string().optional().describe('Email of the client'),
        notes: z.string().optional().describe('Additional details about the lead/client'),
    }),
    execute: async ({ name, phone, email, notes }) => {
        try {
            const clientId = await icountService.createClient({
                name,
                phone,
                email,
                address: notes
            });

            if (clientId) {
                return {
                    success: true,
                    message: `הלקוח נרשם ב-iCount בהצלחה! (מזהה: ${clientId})`,
                    clientId
                };
            }
            return {
                success: false,
                message: 'חלה שגיאה ברישום הלקוח ב-iCount.'
            };
        } catch (error) {
            console.error('iCount tool error:', error);
            return {
                success: false,
                message: 'חלה שגיאה טכנית בחיבור ל-iCount.'
            };
        }
    }
});

export const icountCreateDocumentTool = createTool({
    id: 'icount_create_document',
    description: 'Creates an invoice, receipt, or price quote in iCount.',
    inputSchema: z.object({
        doctype: z.enum(['invoice', 'receipt', 'invrec', 'offer', 'deal']).describe('The type of document to create (invoice=חשבונית מס, receipt=קבלה, invrec=חשבונית מס קבלה, offer=הצעת מחיר, deal=חשבון עסקה)'),
        clientName: z.string().describe('The name of the client in iCount'),
        email: z.string().optional().describe('Client email to send the document to'),
        items: z.array(z.object({
            description: z.string().describe('Item description'),
            unitprice: z.number().optional().describe('Price per unit (before VAT)'),
            unitprice_incvat: z.number().optional().describe('Price per unit (including VAT)'),
            quantity: z.number().describe('Quantity'),
        })).describe('List of items in the document'),
    }),
    execute: async (args) => {
        try {
            const result = await icountService.createDocument(args);
            if (result) {
                return {
                    success: true,
                    message: `המסמך (${args.doctype}) נוצר בהצלחה!`,
                    docId: result.docId,
                    docUrl: result.docUrl,
                };
            }
            return {
                success: false,
                message: 'חלה שגיאה ביצירת המסמך ב-iCount.'
            };
        } catch (error) {
            console.error('iCount create doc tool error:', error);
            return {
                success: false,
                message: 'חלה שגיאה טכנית ביצירת המסמך.'
            };
        }
    }
});

export const icountGetAccountInfoTool = createTool({
    id: 'icount_get_account_info',
    description: 'Retrieves account balance and general business info from iCount (used for reports).',
    inputSchema: z.object({}),
    execute: async () => {
        try {
            const info = await icountService.getAccountInfo();
            if (info) {
                return {
                    success: true,
                    info,
                };
            }
            return {
                success: false,
                message: 'לא ניתן היה לקבל את נתוני החשבון מ-iCount.'
            };
        } catch (error) {
            console.error('iCount get info tool error:', error);
            return {
                success: false,
                message: 'חלה שגיאה טכנית בחיבור ל-iCount.'
            };
        }
    }
});
export const icountGetIncomeReportTool = createTool({
    id: 'icount_get_income_report',
    description: 'Retrieves an income report from iCount for a date range (YYYY-MM-DD).',
    inputSchema: z.object({
        startDate: z.string().describe('Start date (YYYY-MM-DD)'),
        endDate: z.string().describe('End date (YYYY-MM-DD)'),
        clientId: z.number().optional().describe('Filter by client ID (optional)'),
    }),
    execute: async ({ startDate, endDate, clientId }) => {
        console.log('Tool: icount-get-income-report', { startDate, endDate, clientId });
        try {
            const report = await icountService.getIncomeReport({
                start_date: startDate,
                end_date: endDate,
                client_id: clientId
            });

            if (report && report.status) {
                return {
                    success: true,
                    report: report.income_report,
                };
            }
            return {
                success: false,
                message: report?.error_description || 'חלה שגיאה בקבלת דוח ההכנסות מ-iCount.'
            };
        } catch (error) {
            console.error('iCount get income report tool error:', error);
            return {
                success: false,
                message: 'חלה שגיאה טכנית בחיבור ל-iCount.'
            };
        }
    }
});
export const icountGetIncomeTaxReportTool = createTool({
    id: 'icount_get_income_tax_report',
    description: 'Retrieves an income tax report from iCount for a specific month range.',
    inputSchema: z.object({
        startMonth: z.string().optional().describe('Start month in YYYY-MM format. Defaults to last month.'),
        endMonth: z.string().optional().describe('End month in YYYY-MM format. Defaults to last month.'),
    }),
    execute: async ({ startMonth, endMonth }) => {
        try {
            const report = await icountService.getIncomeTaxReport({
                start_month: startMonth,
                end_month: endMonth,
            });

            if (report && report.status) {
                return {
                    success: true,
                    report: report.income_tax_report,
                    startMonth: report.start_month,
                    endMonth: report.end_month,
                };
            }
            return {
                success: false,
                message: report?.error_description || 'חלה שגיאה בקבלת דוח המע"מ מ-iCount.'
            };
        } catch (error) {
            console.error('iCount get income tax report tool error:', error);
            return {
                success: false,
                message: 'חלה שגיאה טכנית בחיבור ל-iCount.'
            };
        }
    }
});
export const icountGetFullReportTool = createTool({
    id: 'icount_get_full_report',
    description: 'Retrieves a full comprehensive report from iCount for a specific date range.',
    inputSchema: z.object({
        startDate: z.string().describe('Start date in YYYY-MM-DD format'),
        endDate: z.string().describe('End date in YYYY-MM-DD format'),
        email: z.string().email().optional().describe('If provided, the report will be sent to this email address'),
    }),
    execute: async ({ startDate, endDate, email }) => {
        try {
            const report = await icountService.getFullReport({
                start_date: startDate,
                end_date: endDate,
                email,
            });

            if (report && report.status) {
                return {
                    success: true,
                    report: report.full_report,
                    emailStatus: report.email_status,
                    emailAddress: report.email_address,
                };
            }
            return {
                success: false,
                message: report?.error_description || 'חלה שגיאה בקבלת הדוח המלא מ-iCount.'
            };
        } catch (error) {
            console.error('iCount get full report tool error:', error);
            return {
                success: false,
                message: 'חלה שגיאה טכנית בחיבור ל-iCount.'
            };
        }
    }
});

export const icountGetAccountingExportTypesTool = createTool({
    id: 'icount_get_accounting_export_types',
    description: 'Retrieves available accounting export types from iCount.',
    inputSchema: z.object({}),
    execute: async () => {
        try {
            const result = await icountService.getAccountingExportTypes();
            if (result && result.status) {
                return {
                    success: true,
                    exportTypes: result.export_types,
                };
            }
            return {
                success: false,
                message: result?.error_description || 'חלה שגיאה בקבלת סוגי הייצוא מ-iCount.'
            };
        } catch (error) {
            console.error('iCount get accounting export types tool error:', error);
            return {
                success: false,
                message: 'חלה שגיאה טכנית בחיבור ל-iCount.'
            };
        }
    }
});

export const icountExportAccountingDataTool = createTool({
    id: 'icount_export_accounting_data',
    description: 'Initiates an accounting data export from iCount to external software.',
    inputSchema: z.object({
        exportType: z.string().describe('The export type (retrieved from get-accounting-export-types)'),
        startDate: z.string().describe('Start date in YYYY-MM-DD format'),
        endDate: z.string().describe('End date in YYYY-MM-DD format'),
        exportDocs: z.boolean().optional().describe('Export accounting documents (default: true)'),
        exportExpenses: z.boolean().optional().describe('Export expenses (default: false)'),
        exportClients: z.boolean().optional().describe('Export client cards (default: false)'),
        exportSuppliers: z.boolean().optional().describe('Export supplier cards (default: false)'),
        webhookUrl: z.string().url().optional().describe('URL to send the export result to'),
        webhookMethod: z.enum(['JSON', 'POST', 'GET']).optional().describe('Method to send the webhook (default: JSON)'),
    }),
    execute: async (params) => {
        try {
            const result = await icountService.exportAccountingData({
                export_type: params.exportType,
                start_date: params.startDate,
                end_date: params.endDate,
                export_docs: params.exportDocs,
                export_expenses: params.exportExpenses,
                export_clients: params.exportClients,
                export_suppliers: params.exportSuppliers,
                webhook_url: params.webhookUrl,
                webhook_method: params.webhookMethod,
            });

            if (result && result.status) {
                return {
                    success: true,
                    message: 'תהליך הייצוא החל בהצלחה.',
                    result: result,
                };
            }
            return {
                success: false,
                message: result?.error_description || 'חלה שגיאה בהפעלת הייצוא מ-iCount.'
            };
        } catch (error) {
            console.error('iCount export accounting data tool error:', error);
            return {
                success: false,
                message: 'חלה שגיאה טכנית בחיבור ל-iCount.'
            };
        }
    }
});

export const icountGetUserInfoTool = createTool({
    id: 'icount_get_user_info',
    description: 'Retrieves information about a specific iCount user.',
    inputSchema: z.object({
        userId: z.number().optional().describe('The numeric ID of the user'),
        username: z.string().optional().describe('The username of the user'),
        userEmail: z.string().email().optional().describe('The email address of the user'),
    }),
    execute: async (params) => {
        try {
            const result = await icountService.getUserInfo({
                user_id: params.userId,
                username: params.username,
                user_email: params.userEmail,
            });

            if (result && result.status) {
                return {
                    success: true,
                    user: result.user_info,
                };
            }
            return {
                success: false,
                message: result?.error_description || 'חלה שגיאה בקבלת פרטי המשתמש מ-iCount.'
            };
        } catch (error) {
            console.error('iCount get user info tool error:', error);
            return {
                success: false,
                message: 'חלה שגיאה טכנית בחיבור ל-iCount.'
            };
        }
    }
});

export const icountCreateUserTool = createTool({
    id: 'icount_create_user',
    description: 'Creates a new user in iCount.',
    inputSchema: z.object({
        newUser: z.string().describe('The username for the new user'),
        newPass: z.string().describe('The password for the new user'),
        firstName: z.string().describe('First name of the user'),
        lastName: z.string().describe('Last name of the user'),
        email: z.string().email().describe('Email address of the user'),
        mobile: z.string().optional().describe('Mobile phone number'),
        privLevel: z.number().optional().describe('Privilege level ID (retrieved from get-priv-levels)'),
    }),
    execute: async (params) => {
        try {
            const result = await icountService.createUser({
                new_user: params.newUser,
                new_pass: params.newPass,
                first_name: params.firstName,
                last_name: params.lastName,
                email: params.email,
                mobile: params.mobile,
                priv_level: params.privLevel,
            });

            if (result && result.status) {
                return {
                    success: true,
                    message: `המשתמש ${params.newUser} נוצר בהצלחה.`,
                    userId: result.user_id,
                };
            }
            return {
                success: false,
                message: result?.error_description || 'חלה שגיאה ביצירת המשתמש ב-iCount.'
            };
        } catch (error) {
            console.error('iCount create user tool error:', error);
            return {
                success: false,
                message: 'חלה שגיאה טכנית בחיבור ל-iCount.'
            };
        }
    }
});

export const icountUpdateUserTool = createTool({
    id: 'icount_update_user',
    description: 'Updates an existing iCount user.',
    inputSchema: z.object({
        userId: z.number().describe('The numeric ID of the user to update'),
        firstName: z.string().optional().describe('Updated first name'),
        lastName: z.string().optional().describe('Updated last name'),
        email: z.string().email().optional().describe('Updated email address'),
        mobile: z.string().optional().describe('Updated mobile number'),
        privLevel: z.number().optional().describe('Updated privilege level'),
    }),
    execute: async (params) => {
        try {
            const result = await icountService.updateUser({
                user_id: params.userId,
                first_name: params.firstName,
                last_name: params.lastName,
                email: params.email,
                mobile: params.mobile,
                priv_level: params.privLevel,
            });

            if (result && result.status) {
                return {
                    success: true,
                    message: 'פרטי המשתמש עודכנו בהצלחה.',
                };
            }
            return {
                success: false,
                message: result?.error_description || 'חלה שגיאה בעדכון המשתמש ב-iCount.'
            };
        } catch (error) {
            console.error('iCount update user tool error:', error);
            return {
                success: false,
                message: 'חלה שגיאה טכנית בחיבור ל-iCount.'
            };
        }
    }
});

export const icountGetUserListTool = createTool({
    id: 'icount_get_user_list',
    description: 'Retrieves a list of all iCount users in the company.',
    inputSchema: z.object({}),
    execute: async () => {
        try {
            const result = await icountService.getUserList('array');
            if (result && result.status) {
                return {
                    success: true,
                    users: result.users,
                };
            }
            return {
                success: false,
                message: result?.error_description || 'חלה שגיאה בקבלת רשימת המשתמשים מ-iCount.'
            };
        } catch (error) {
            console.error('iCount get user list tool error:', error);
            return {
                success: false,
                message: 'חלה שגיאה טכנית בחיבור ל-iCount.'
            };
        }
    }
});

export const icountGetPrivLevelsTool = createTool({
    id: 'icount_get_priv_levels',
    description: 'Retrieves available privilege levels for users in iCount.',
    inputSchema: z.object({}),
    execute: async () => {
        try {
            const result = await icountService.getPrivLevels('array');
            if (result && result.status) {
                return {
                    success: true,
                    privLevels: result.priv_levels,
                };
            }
            return {
                success: false,
                message: result?.error_description || 'חלה שגיאה בקבלת דרגות ההרשאה מ-iCount.'
            };
        } catch (error) {
            console.error('iCount get priv levels tool error:', error);
            return {
                success: false,
                message: 'חלה שגיאה טכנית בחיבור ל-iCount.'
            };
        }
    }
});

export const icountTestConnectionTool = createTool({
    id: 'icount_test_connection',
    description: 'Tests the connection to iCount and verifies if the credentials are valid.',
    inputSchema: z.object({}),
    execute: async () => {
        try {
            const result = await icountService.testConnection();
            if (result && result.status) {
                return {
                    success: true,
                    message: 'החיבור ל-iCount תקין! המערכת זיהתה אותך כמשתמש: ' + result.user_info?.full_name,
                };
            }
            return {
                success: false,
                message: result?.error_description || 'החיבור ל-iCount נכשל. נא לוודא את ה-Environment Variables ב-Vercel.'
            };
        } catch (error) {
            console.error('iCount test connection tool error:', error);
            return {
                success: false,
                message: 'חלה שגיאה טכנית בבדיקת החיבור ל-iCount.'
            };
        }
    }
});
