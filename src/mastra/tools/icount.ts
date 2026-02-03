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
        docType: z.enum(['invrec', 'receipt', 'inv', 'offer']).default('invrec').describe('Type of document to fetch. Default is invrec (Invoice & Receipt).'),
    }),
    execute: async ({ docType }) => {
        const doctypesToTry = docType ? [docType] : ['invrec', 'receipt', 'inv', 'offer'];

        for (const currentType of doctypesToTry) {
            try {
                console.log(`[iCount Tool] Trying to fetch last document for type: ${currentType}`);
                const result = await icount.getLastDocuments({
                    doctype: currentType as string,
                    limit: 1,
                });

                if (result.results_list && result.results_list.length > 0) {
                    const doc = result.results_list[0];

                    // Try to get a viewing URL
                    let viewUrl = doc.doc_url || '';
                    if (!viewUrl) {
                        try {
                            const urlResult = await icount.getDocUrl({
                                doctype: currentType,
                                docnum: String(doc.docnum)
                            });
                            viewUrl = urlResult.url;
                        } catch (e) {
                            console.error(`[iCount Tool] Failed to get URL for ${currentType} ${doc.docnum}:`, (e as Error).message);
                        }
                    }

                    return {
                        success: true,
                        doc: {
                            docnum: String(doc.docnum),
                            client_name: doc.client_name || 'לקוח כללי',
                            total: doc.total,
                            date: doc.dateissued,
                            url: viewUrl,
                        },
                        message: `המסמך האחרון (${currentType}) הוא מספר ${doc.docnum} על סך ${doc.total} ש"ח.`,
                    };
                }
            } catch (error: unknown) {
                console.warn(`[iCount Tool] doctype ${currentType} failed:`, (error as Error).message);
                // Continue to next doctype unless it was an explicit request
                if (docType) {
                    return { success: false, message: `שגיאה: ${(error as Error).message}` };
                }
            }
        }

        return {
            success: false,
            message: 'לא נמצאו מסמכים באף אחד מהסוגים (חשבונית מס קבלה, קבלה, חשבונית, הצעת מחיר).',
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
            const params: any = { detail_level: 1 };
            if (searchQuery) {
                params.client_name = searchQuery;
            }

            const result = await icount.getClients(params);

            if (!result.client_list || (Array.isArray(result.client_list) && result.client_list.length === 0)) {
                return {
                    success: false,
                    message: searchQuery ? `לא נמצאו לקוחות התואמים לחיפוש "${searchQuery}".` : 'לא נמצאו לקוחות במערכת.',
                };
            }

            // client_list can be an object with IDs as keys
            const clientData = Array.isArray(result.client_list)
                ? result.client_list
                : Object.values(result.client_list);

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
                message: `נמצאו ${result.client_list.length} לקוחות. מציג את ה-10 הראשונים.`,
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
