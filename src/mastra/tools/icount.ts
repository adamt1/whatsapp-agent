import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { icount } from '../../services/icount';

export const createQuoteTool = createTool({
    id: 'create_quote',
    description: 'Creates a price offer (quote) in iCount for a customer.',
    inputSchema: z.object({
        clientName: z.string().describe('The name of the customer'),
        email: z.string().optional().describe('Customer email to send the quote to'),
        items: z.array(z.object({
            description: z.string(),
            unitprice: z.number(),
            quantity: z.number(),
        })).describe('List of services/products in the quote'),
    }),
    execute: async ({ clientName, email, items }) => {
        try {
            const result = await icount.createDoc({
                doctype: 'offer',
                client_name: clientName,
                email,
                items: items.map(item => ({
                    description: item.description,
                    unitprice: item.unitprice,
                    quantity: item.quantity
                })),
                send_email: !!email,
            });

            return {
                success: true,
                message: `הצעת מחיר מספר ${result.docnum} נוצרה בהצלחה עבור ${clientName}.`,
                docUrl: result.doc_url,
            };
        } catch (error: unknown) {
            const err = error as Error;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            console.error('iCount error:', (err as any).message);
            return {
                success: false,
                message: `שגיאה: ${err.message}`,
            };
        }
    },
});

export const getIncomeReportTool = createTool({
    id: 'get_income_report',
    description: 'Fetches the income tax report for a specific period to see financial performance.',
    inputSchema: z.object({
        startMonth: z.string().describe('Start month in YYYY-MM format (e.g., 2024-01)'),
        endMonth: z.string().describe('End month in YYYY-MM format (e.g., 2024-12)'),
    }),
    execute: async ({ startMonth, endMonth }) => {
        try {
            const result = await icount.getIncomeReport(startMonth, endMonth);

            return {
                success: true,
                summary: result.summary || 'לא נמצא סיכום בדוח',
                message: `דוח הכנסות לתקופה ${startMonth} עד ${endMonth} התקבל.`,
            };
        } catch (error: unknown) {
            const err = error as Error;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            console.error('iCount error:', (err as any).message);
            return {
                success: false,
                message: `שגיאה: ${err.message}`,
            };
        }
    },
});

export const getVatReportTool = createTool({
    id: 'get_vat_report',
    description: 'Fetches the VAT report for a specific period to see VAT payments or refunds.',
    inputSchema: z.object({
        startMonth: z.string().describe('Start month in YYYY-MM format (e.g., 2024-01)'),
        endMonth: z.string().describe('End month in YYYY-MM format (e.g., 2024-12)'),
    }),
    execute: async ({ startMonth, endMonth }) => {
        try {
            const result = await icount.getVatReport(startMonth, endMonth);

            return {
                success: true,
                report: result,
                message: `דוח מע"מ לתקופה ${startMonth} עד ${endMonth} נמשך בהצלחה. סה"כ לתשלום: ${result.total_payment} ש"ח.`,
            };
        } catch (error: unknown) {
            const err = error as Error;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            console.error('iCount error:', (err as any).message);
            return {
                success: false,
                message: `שגיאה במשיכת דוח מע"מ: ${err.message}`,
            };
        }
    },
});

export const getIncomeTypesTool = createTool({
    id: 'get_income_types',
    description: 'Fetches the list of available income types (revenue categories) from iCount.',
    inputSchema: z.object({}),
    execute: async () => {
        try {
            const result = await icount.getIncomeTypes();
            const types = result.income_types || [];

            return {
                success: true,
                incomeTypes: types,
                message: `נמצאו ${types.length || Object.keys(types).length} סוגי הכנסה במערכת.`,
            };
        } catch (error: unknown) {
            const err = error as Error;
            return {
                success: false,
                message: `שגיאה במשיכת סוגי הכנסה: ${err.message}`,
            };
        }
    },
});

export const searchInventoryTool = createTool({
    id: 'search_inventory',
    description: 'Search for items, price lists, or services in the iCount inventory.',
    inputSchema: z.object({
        query: z.string().describe('Search term for the item or service'),
    }),
    execute: async ({ query }) => {
        try {
            const result = await icount.searchItems(query);

            return {
                success: true,
                items: (result.items || []).slice(0, 10),
                message: `נמצאו ${result.items?.length || 0} פריטים. מציג את 10 הראשונים.`,
            };
        } catch (error: unknown) {
            const err = error as Error;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            console.error('iCount error:', (err as any).message);
            return {
                success: false,
                message: `שגיאה: ${err.message}`,
            };
        }
    },
});

export const getLastInvoiceTool = createTool({
    id: 'get_last_invoice',
    description: 'Fetches the details of the most recent invoice (last document) issued in iCount.',
    inputSchema: z.object({
        docType: z.enum(['invrec', 'receipt', 'invoice', 'offer']).optional().describe('Type of document to fetch. e.g. invrec (Invoice & Receipt) or invoice (Tax Invoice).'),
        searchQuery: z.string().optional().describe('Optional: filter by client name or partial name'),
        clientId: z.number().optional().describe('Optional: filter by specific client ID'),
    }),
    execute: async ({ docType, searchQuery, clientId }) => {
        const doctypesToTry = docType ? [docType] : ['invrec', 'invoice', 'receipt', 'offer'];

        try {
            console.log(`[iCount Tool] Fetching last document. Search types: ${doctypesToTry.join(', ')}`);
            const result = await icount.searchDocuments({
                doctype: doctypesToTry,
                client_id: clientId,
                client_name: searchQuery,
                limit: 1,
                get_doc_url: true,
                detail_level: 1,
            });

            if (result.results_list && result.results_list.length > 0) {
                const doc = result.results_list[0];

                return {
                    success: true,
                    doc: {
                        docnum: String(doc.docnum),
                        client_name: doc.client_name || 'לקוח כללי',
                        total: doc.total,
                        date: doc.dateissued,
                        url: doc.doc_url || '',
                    },
                    message: `המסמך האחרון (${doc.doctype}) הוא מספר ${doc.docnum} על סך ${doc.total} ש"ח.`,
                };
            }
        } catch (error: unknown) {
            console.error(`[iCount Tool] getLastInvoice failed:`, (error as Error).message);
            return { success: false, message: `שגיאה במשיכת המסמך: ${(error as Error).message}` };
        }

        return {
            success: false,
            message: 'לא נמצאו מסמכים התואמים לחיפוש.',
        };
    },
});

export const getClientsTool = createTool({
    id: 'get_clients',
    description: 'Fetches a list of clients from iCount, optionally filtered by name, email, or phone.',
    inputSchema: z.object({
        searchQuery: z.string().optional().describe('Filter by client name, email, or phone number'),
    }),
    execute: async ({ searchQuery }) => {
        try {
            const result = await icount.getClients({ searchQuery });

            // iCount API uses 'clients' key, but we handle 'client_list' for legacy support
            const clientsRaw = result.clients || result.client_list;

            if (!clientsRaw || (Array.isArray(clientsRaw) && clientsRaw.length === 0)) {
                return {
                    success: false,
                    message: searchQuery ? `לא נמצאו לקוחות התואמים לחיפוש "${searchQuery}".` : 'לא נמצאו לקוחות במערכת.',
                };
            }

            // client data can be an object with IDs as keys, though we request 'array'
            const clientData = Array.isArray(clientsRaw)
                ? clientsRaw
                : Object.values(clientsRaw);

            if (clientData.length === 0) {
                return {
                    success: false,
                    message: searchQuery ? `לא נמצאו לקוחות התואמים לחיפוש "${searchQuery}".` : 'לא נמצאו לקוחות במערכת.',
                };
            }

            const clients = clientData.slice(0, 10).map((c: any) => ({
                id: c.client_id,
                name: c.client_name,
                email: c.email || 'אין אימייל',
                phone: c.mobile || c.phone || 'אין טלפון',
            }));

            return {
                success: true,
                clients,
                message: `נמצאו ${clientData.length} לקוחות. מציג את ה-10 הראשונים.`,
            };
        } catch (error: unknown) {
            const err = error as Error;
            console.error('iCount error:', err.message);
            return {
                success: false,
                message: `שגיאה במשיכת לקוחות: ${err.message}`,
            };
        }
    },
});

export const sendDocumentEmailTool = createTool({
    id: 'send_document_email',
    description: 'Sends an existing iCount document (invoice, receipt, offer, etc.) to a client via email.',
    inputSchema: z.object({
        doctype: z.enum(['invrec', 'receipt', 'invoice', 'offer', 'pro', 'order']).describe('Type of document to send'),
        docnum: z.number().describe('The document number'),
        email: z.string().optional().describe('Recipient email address. If not provided, it will be sent to the clients default email in iCount.'),
        comment: z.string().optional().describe('Optional comment/text to include in the email body'),
    }),
    execute: async ({ doctype, docnum, email, comment }) => {
        try {
            const params: any = {
                doctype,
                docnum,
                email_comment: comment,
            };

            if (email) {
                params.email_to = email;
            } else {
                params.email_to_client = true;
            }

            const result = await icount.sendDocEmail(params);

            return {
                success: true,
                message: `המסמך (${doctype} ${docnum}) נשלח בהצלחה${email ? ` לכתובת ${email}` : ' לכתובת המייל של הלקוח'}.`,
                result
            };
        } catch (error: unknown) {
            const err = error as Error;
            return {
                success: false,
                message: `שגיאה בשליחת המסמך במייל: ${err.message}`,
            };
        }
    },
});

export const getProfitabilityReportTool = createTool({
    id: 'get_profitability_report',
    description: 'Fetches monthly profitability data (invoices, receipts, expenses, profit) for a specific date range.',
    inputSchema: z.object({
        startDate: z.string().describe('Report start date (YYYY-MM-DD)'),
        endDate: z.string().describe('Report end date (YYYY-MM-DD)'),
    }),
    execute: async ({ startDate, endDate }) => {
        try {
            const result = await icount.getMonthlyProfitability({
                start_date: startDate,
                end_date: endDate,
            });

            if (!result.monthly_profitability) {
                return {
                    success: false,
                    message: 'לא נמצאו נתוני רווחיות לתקופה זו.',
                };
            }

            const chart = result.monthly_profitability;
            const latestIndex = chart.labels.length - 1;

            // Get latest non-zero profit for summary
            let summary = '';
            if (latestIndex >= 0) {
                summary = `בחודש האחרון בדוח (${chart.labels[latestIndex]}), ההכנסות מחשבוניות היו ${chart.data.invoice[latestIndex]} ש"ח והרווח היה ${chart.data.profit[latestIndex]} ש"ח.`;
            }

            return {
                success: true,
                data: chart,
                message: summary || 'דוח רווחיות התקבל בהצלחה.',
            };
        } catch (error: unknown) {
            const err = error as Error;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            console.error('iCount error:', (err as any).message);
            return {
                success: false,
                message: `שגיאה: ${err.message}`,
            };
        }
    },
});

export const searchDocumentsTool = createTool({
    id: 'search_documents',
    description: 'Searches for iCount documents (invoices, receipts, offers, etc.) based on flexible filters like client name, dates, document number or status.',
    inputSchema: z.object({
        searchQuery: z.string().optional().describe('Filter by client name or partial name'),
        clientId: z.number().optional().describe('Filter by specific client ID (recommended if you have it)'),
        doctype: z.enum(['invrec', 'receipt', 'invoice', 'offer', 'pro', 'order']).optional().describe('Filtered by specific document type'),
        docnum: z.number().optional().describe('Search for a specific document number'),
        startDate: z.string().optional().describe('Filter from this date (YYYY-MM-DD)'),
        endDate: z.string().optional().describe('Filter up to this date (YYYY-MM-DD)'),
        status: z.number().optional().describe('Document status: 0=open, 1=closed, 2=partially closed'),
    }),
    execute: async ({ searchQuery, clientId, doctype, docnum, startDate, endDate, status }) => {
        try {
            const results = await icount.searchDocuments({
                client_id: clientId,
                client_name: searchQuery,
                doctype,
                docnum,
                start_date: startDate,
                end_date: endDate,
                status,
            });

            const docs = results.results_list || [];

            if (docs.length === 0) {
                return {
                    success: false,
                    message: 'לא נמצאו מסמכים העונים על הגדרות החיפוש.',
                };
            }

            const formattedDocs = docs.map((d: any) => ({
                id: `${d.doctype}-${d.docnum}`,
                type: d.doctype,
                number: d.docnum,
                date: d.dateissued,
                client: d.client_name,
                total: `${d.total} ${d.currency_code || 'ILS'}`,
                status: d.status === 1 ? 'סגור' : (d.status === 0 ? 'פתוח' : 'סגור חלקית'),
                url: d.doc_url || '',
            }));

            return {
                success: true,
                documents: formattedDocs,
                message: `נמצאו ${docs.length} מסמכים התואמים לחיפוש.`,
            };
        } catch (error: unknown) {
            const err = error as Error;
            return {
                success: false,
                message: `שגיאה בחיפוש מסמכים: ${err.message}`,
            };
        }
    },
});
