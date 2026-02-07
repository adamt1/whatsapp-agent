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

export const addIncomeTypeTool = createTool({
    id: 'add_income_type',
    description: 'Adds a new income type (revenue category) to iCount.',
    inputSchema: z.object({
        name: z.string().describe('The name of the new income type (e.g. "Special Services")'),
    }),
    execute: async ({ name }) => {
        try {
            const result = await icount.addIncomeType({
                income_type_name: name
            });

            return {
                success: true,
                incomeTypeId: result.income_type_id,
                message: `סוג הכנסה חדש "${name}" נוסף בהצלחה למערכת (מזהה: ${result.income_type_id}).`,
            };
        } catch (error: unknown) {
            const err = error as Error;
            return {
                success: false,
                message: `שגיאה בהוספת סוג הכנסה: ${err.message}`,
            };
        }
    },
});

export const getUsersTool = createTool({
    id: 'get_users',
    description: 'Fetches the list of users in the iCount company.',
    inputSchema: z.object({}),
    execute: async () => {
        try {
            const result = await icount.getUsersList();
            const usersRaw = result.users || [];
            const usersArr = Array.isArray(usersRaw) ? usersRaw : Object.values(usersRaw);

            const users = usersArr.map((u: unknown) => ({
                id: (u as any).user_id,
                name: (u as any).username,
                email: (u as any).user_email,
                privilegeId: (u as any).privilege_id
            }));

            return {
                success: true,
                users,
                message: `נמצאו ${users.length} משתמשים במערכת.`,
            };
        } catch (error: unknown) {
            const err = error as Error;
            return {
                success: false,
                message: `שגיאה במשיכת רשימת משתמשים: ${err.message}`,
            };
        }
    },
});

export const getPrivLevelsTool = createTool({
    id: 'get_priv_levels',
    description: 'Fetches the list of user privilege levels defined in iCount.',
    inputSchema: z.object({}),
    execute: async () => {
        try {
            const result = await icount.getPrivLevels();
            const levels = result.privilege_levels || [];

            return {
                success: true,
                levels,
                message: `נמצאו ${Object.keys(levels).length} רמות הרשאה במערכת.`,
            };
        } catch (error: unknown) {
            const err = error as Error;
            return {
                success: false,
                message: `שגיאה במשיכת רמות הרשאה: ${err.message}`,
            };
        }
    },
});

export const getUserInfoTool = createTool({
    id: 'get_user_info',
    description: 'Fetches detailed information about a specific iCount user.',
    inputSchema: z.object({
        userId: z.number().optional().describe('User ID'),
        username: z.string().optional().describe('Username'),
        email: z.string().optional().describe('User email'),
    }),
    execute: async ({ userId, username, email }) => {
        try {
            const result = await icount.getUserInfo({
                user_id: userId,
                username,
                user_email: email,
            });

            return {
                success: true,
                user: result.user_info,
                message: `מידע על המשתמש ${result.user_info.username} התקבל בהצלחה.`,
            };
        } catch (error: unknown) {
            const err = error as Error;
            return {
                success: false,
                message: `שגיאה במשיכת מידע על משתמש: ${err.message}`,
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
    description: 'Fetches a list of clients from iCount, optionally filtered by name, email, phone, or specific ID. Can also search for leads.',
    inputSchema: z.object({
        searchQuery: z.string().optional().describe('Filter by client name'),
        clientId: z.number().optional().describe('Filter by specific client ID'),
        email: z.string().optional().describe('Filter by email'),
        phone: z.string().optional().describe('Filter by phone'),
        isLead: z.boolean().optional().describe('If true, searches for leads'),
        detailLevel: z.number().optional().describe('Level of detail (0-10)'),
    }),
    execute: async ({ searchQuery, clientId, email, phone, isLead, detailLevel }) => {
        try {
            const result = await icount.getClients({
                searchQuery,
                client_id: clientId,
                email,
                phone,
                is_lead: isLead,
                detail_level: detailLevel,
            });

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

            const clients = clientData.slice(0, 10).map((c: unknown) => ({
                id: (c as any).client_id,
                name: (c as any).client_name,
                email: (c as any).email || 'אין אימייל',
                phone: (c as any).mobile || (c as any).phone || 'אין טלפון',
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

            const formattedDocs = docs.map((d: unknown) => ({
                id: `${(d as any).doctype}-${(d as any).docnum}`,
                type: (d as any).doctype,
                number: (d as any).docnum,
                date: (d as any).dateissued,
                client: (d as any).client_name,
                total: `${(d as any).total} ${(d as any).currency_code || 'ILS'}`,
                status: (d as any).status === 1 ? 'סגור' : ((d as any).status === 0 ? 'פתוח' : 'סגור חלקית'),
                url: (d as any).doc_url || '',
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

export const getEventsListTool = createTool({
    id: 'get_events_list',
    description: 'Fetches a list of CRM events from iCount, optionally filtered by client, date, or event ID.',
    inputSchema: z.object({
        clientId: z.number().optional().describe('Filter by client ID'),
        eventId: z.number().optional().describe('Filter by specific event ID'),
        startDate: z.string().optional().describe('Filter from this creation date (YYYY-MM-DD)'),
        endDate: z.string().optional().describe('Filter up to this creation date (YYYY-MM-DD)'),
        limit: z.number().optional().describe('Limit the number of results'),
    }),
    execute: async ({ clientId, eventId, startDate, endDate, limit }) => {
        try {
            const result = await icount.getEventsList({
                client_id: clientId,
                event_id: eventId,
                created_date_start: startDate,
                created_date_end: endDate,
                limit,
            });

            const events = result.events || [];

            return {
                success: true,
                events,
                message: `נמצאו ${events.length} אירועי CRM במערכת.`,
            };
        } catch (error: unknown) {
            const err = error as Error;
            return {
                success: false,
                message: `שגיאה במשיכת אירועי CRM: ${err.message}`,
            };
        }
    },
});

export const getClientTypesTool = createTool({
    id: 'get_client_types',
    description: 'Fetches the list of client types defined in iCount.',
    inputSchema: z.object({}),
    execute: async () => {
        try {
            const result = await icount.getClientTypes();
            const types = result.client_types || [];

            return {
                success: true,
                types,
                message: `נמצאו ${Object.keys(types).length} סוגי לקוחות במערכת.`,
            };
        } catch (error: unknown) {
            const err = error as Error;
            return {
                success: false,
                message: `שגיאה במשיכת סוגי לקוחות: ${err.message}`,
            };
        }
    },
});

export const getClientCustomInfoTool = createTool({
    id: 'get_client_custom_info',
    description: 'Fetches custom/additional information for a specific client in iCount.',
    inputSchema: z.object({
        clientId: z.number().optional().describe('The iCount client ID'),
        email: z.string().optional().describe('Client email address'),
        clientName: z.string().optional().describe('Client name'),
    }),
    execute: async ({ clientId, email, clientName }) => {
        try {
            const result = await icount.getClientCustomInfo({
                client_id: clientId,
                email,
                client_name: clientName,
            });

            return {
                success: true,
                customInfo: result.custom_info,
                message: `מידע מותאם אישית עבור הלקוח התקבל בהצלחה.`,
            };
        } catch (error: unknown) {
            const err = error as Error;
            return {
                success: false,
                message: `שגיאה במשיכת מידע מותאם אישית ללקוח: ${err.message}`,
            };
        }
    },
});

export const getContactTypesTool = createTool({
    id: 'get_contact_types',
    description: 'Fetches the list of possible contact types defined in iCount.',
    inputSchema: z.object({}),
    execute: async () => {
        try {
            const result = await icount.getContactTypes();
            return {
                success: true,
                contactTypes: result.contact_types || [],
                message: 'רשימת סוגי אנשי קשר התקבלה בהצלחה.',
            };
        } catch (error: unknown) {
            const err = error as Error;
            return {
                success: false,
                message: `שגיאה במשיכת סוגי אנשי קשר: ${err.message}`,
            };
        }
    },
});

export const addContactTool = createTool({
    id: 'add_contact',
    description: 'Adds a new contact person to an existing client in iCount.',
    inputSchema: z.object({
        clientId: z.number().describe('The iCount client ID to add the contact to'),
        firstName: z.string().describe('Contact first name'),
        lastName: z.string().optional().describe('Contact last name'),
        email: z.string().optional().describe('Contact email'),
        phone: z.string().optional().describe('Contact phone'),
        mobile: z.string().optional().describe('Contact mobile'),
        contactType: z.string().optional().describe('Contact type (retrieve list using get_contact_types)'),
    }),
    execute: async ({ clientId, firstName, lastName, email, phone, mobile, contactType }) => {
        try {
            const result = await icount.addContact({
                client_id: clientId,
                first_name: firstName,
                last_name: lastName,
                email,
                phone,
                mobile,
                contact_type: contactType,
            });

            return {
                success: true,
                contactId: result.contact_id,
                message: `איש קשר חדש ${firstName} ${lastName || ''} נוסף בהצלחה ללקוח (מזהה: ${result.contact_id}).`,
            };
        } catch (error: unknown) {
            const err = error as Error;
            return {
                success: false,
                message: `שגיאה בהוספת איש קשר: ${err.message}`,
            };
        }
    },
});

export const updateContactTool = createTool({
    id: 'update_contact',
    description: 'Updates information for an existing contact person in iCount.',
    inputSchema: z.object({
        contactId: z.number().describe('The iCount contact ID to update'),
        firstName: z.string().optional().describe('Contact first name'),
        lastName: z.string().optional().describe('Contact last name'),
        email: z.string().optional().describe('Contact email'),
        phone: z.string().optional().describe('Contact phone'),
        mobile: z.string().optional().describe('Contact mobile'),
    }),
    execute: async ({ contactId, firstName, lastName, email, phone, mobile }) => {
        try {
            const result = await icount.updateContact({
                contact_id: contactId,
                first_name: firstName,
                last_name: lastName,
                email,
                phone,
                mobile,
            });

            return {
                success: true,
                message: `פרטי איש הקשר (מזהה: ${contactId}) עודכנו בהצלחה.`,
            };
        } catch (error: unknown) {
            const err = error as Error;
            return {
                success: false,
                message: `שגיאה בעדכון איש קשר: ${err.message}`,
            };
        }
    },
});

export const getDeductionTypesTool = createTool({
    id: 'get_deduction_types',
    description: 'Fetches the list of deduction types (withholding tax) from iCount.',
    inputSchema: z.object({}),
    execute: async () => {
        try {
            const result = await icount.getDeductionTypes();
            const types = result.deduction_types || [];

            return {
                success: true,
                deductionTypes: types,
                message: `נמצאו ${Object.keys(types).length} סוגי ניכויים במערכת.`,
            };
        } catch (error: unknown) {
            const err = error as Error;
            return {
                success: false,
                message: `שגיאה במשיכת סוגי ניכויים: ${err.message}`,
            };
        }
    },
});
