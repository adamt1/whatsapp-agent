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
        try {
            const result = await icount.getLastDocuments({
                doctype: docType as string,
                limit: 1,
            });

            if (!result.results_list || result.results_list.length === 0) {
                return {
                    success: false,
                    message: 'לא נמצאו מסמכים מהסוג המבוקש.',
                };
            }

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
                message: `המסמך האחרון (${docType}) הוא מספר ${doc.docnum} על סך ${doc.total} ש"ח.`,
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
