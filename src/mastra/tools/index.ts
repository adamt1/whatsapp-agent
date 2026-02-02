import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { icountService } from '../../services/icount';

export const registerLeadTool = createTool({
    id: 'register-lead',
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
    id: 'icount-register',
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
    id: 'icount-create-document',
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
    id: 'icount-get-account-info',
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
    id: 'icount-get-income-report',
    description: 'Retrieves an income report from iCount for a specific date range.',
    inputSchema: z.object({
        startDate: z.string().describe('Start date in YYYY-MM-DD format'),
        endDate: z.string().describe('End date in YYYY-MM-DD format'),
        clientId: z.number().optional().describe('Filter by specific client ID'),
    }),
    execute: async ({ startDate, endDate, clientId }) => {
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
    id: 'icount-get-income-tax-report',
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
    id: 'icount-get-full-report',
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
