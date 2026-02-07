import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { supabase } from '@/services/supabase';

export const registerLeadTool = createTool({
    id: 'registerlead',
    description: 'Registers a new lead in the CRM (n8n) with property details and contact info.',
    inputSchema: z.object({
        customerName: z.string().describe('The name of the customer'),
        phoneNumber: z.string().describe('The phone number of the customer'),
        propertyType: z.enum(['office', 'building', 'other']).describe('Type of property (office/building/other)'),
        propertySize: z.string().describe('Size of the property (e.g. 100 sqm or 5 rooms)'),
        additionalNotes: z.string().optional().describe('Any additional notes from the conversation'),
    }),
    execute: async (args, context) => {
        const WEBHOOK_URL = 'https://akcleaninng.app.n8n.cloud/webhook-test/newlead';
        const messageId = context?.requestContext?.get('messageId');

        try {
            const payload = {
                ...args,
                source: 'WhatsApp Bot',
                idMessage: messageId,
                timestamp: new Date().toISOString(),
            };

            await supabase.from('debug_logs').insert({
                payload: {
                    diag: 'tool-call-n8n',
                    tool: 'register_lead',
                    request: payload
                }
            });

            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const resultText = await response.text();

            await supabase.from('debug_logs').insert({
                payload: {
                    diag: 'tool-response-n8n',
                    tool: 'register_lead',
                    status: response.status,
                    response: resultText
                }
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

export const scheduleMeetingTool = createTool({
    id: 'schedule_meeting',
    description: 'Schedules a meeting or appointment in the calendar via n8n.',
    inputSchema: z.object({
        title: z.string().describe('The title/subject of the meeting'),
        startTime: z.string().describe('Start time in ISO format or descriptive (e.g., 2024-05-20T10:00:00)'),
        duration: z.number().optional().describe('Duration in minutes'),
        attendees: z.array(z.string()).optional().describe('List of attendee emails'),
        description: z.string().optional().describe('Meeting description or location'),
    }),
    execute: async (args, context) => {
        const WEBHOOK_URL = 'https://akcleaninng.app.n8n.cloud/webhook/schedule-meeting';
        const messageId = context?.requestContext?.get('messageId');
        try {
            const payload = { ...args, source: 'Rotem Bot', idMessage: messageId };

            await supabase.from('debug_logs').insert({
                payload: {
                    diag: 'tool-call-n8n',
                    tool: 'schedule_meeting',
                    request: payload
                }
            });

            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const resultText = await response.text();

            await supabase.from('debug_logs').insert({
                payload: {
                    diag: 'tool-response-n8n',
                    tool: 'schedule_meeting',
                    status: response.status,
                    response: resultText
                }
            });

            if (!response.ok) throw new Error(`n8n error: ${response.statusText}`);
            return { success: true, message: 'הפגישה תוזמנה בהצלחה ביומן!' };
        } catch (error) {
            console.error('Meeting scheduling error:', error);
            return { success: false, message: 'חלה שגיאה בקביעת הפגישה.' };
        }
    },
});

export const sendEmailTool = createTool({
    id: 'send_email',
    description: 'Sends an email to a specified recipient via n8n.',
    inputSchema: z.object({
        to: z.string().email().describe('Recipient email address'),
        subject: z.string().describe('Email subject'),
        body: z.string().describe('Email body content'),
        attachmentUrl: z.string().optional().describe('MANDATORY if sending a file: The public download URL of the file (e.g. from the [File Available: URL] marker in the prompt OR from get_recent_attachments)'),
        fileName: z.string().optional().describe('MANDATORY if sending a file: The original name of the file including extension (e.g. from the [File Available: ... (Name: FILENAME)] marker)'),
    }),
    execute: async (args, context) => {
        const WEBHOOK_URL = 'https://akcleaninng.app.n8n.cloud/webhook/send-email';
        const messageId = context?.requestContext?.get('messageId');
        try {
            const payload = { ...args, source: 'Rotem Bot', idMessage: messageId };

            await supabase.from('debug_logs').insert({
                payload: {
                    diag: 'tool-call-n8n',
                    tool: 'send_email',
                    request: payload
                }
            });

            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const resultText = await response.text();

            await supabase.from('debug_logs').insert({
                payload: {
                    diag: 'tool-response-n8n',
                    tool: 'send_email',
                    status: response.status,
                    response: resultText
                }
            });

            const data = JSON.parse(resultText);

            return data;
        } catch (error) {
            console.error('Email error:', error);
            return { success: false, message: 'חלה שגיאה בשליחת המייל.', error: String(error) };
        }
    },
});

export const getRecentAttachmentsTool = createTool({
    id: 'get_recent_attachments',
    description: 'Retrieves metadata about recent files/attachments received from the user on WhatsApp.',
    inputSchema: z.object({
        limit: z.number().default(5).describe('Number of recent attachments to retrieve'),
    }),
    execute: async ({ limit }) => {
        try {
            await supabase.from('debug_logs').insert({
                payload: {
                    diag: 'tool-call-local',
                    tool: 'get_recent_attachments',
                    request: { limit }
                }
            });

            const { data, error } = await supabase
                .from('debug_logs')
                .select('payload, created_at')
                .eq('payload->>diag', 'webhook-received')
                .not('payload->full->messageData->fileMessageData', 'is', null)
                .order('created_at', { ascending: false })
                .limit(limit as number);

            if (error) throw error;

            const attachments = data.map((log: any) => {
                const fileData = log.payload.full.messageData.fileMessageData;
                return {
                    fileName: fileData.fileName,
                    mimeType: fileData.mimeType,
                    downloadUrl: fileData.downloadUrl,
                    timestamp: log.created_at,
                };
            });

            return { success: true, attachments };
        } catch (error) {
            console.error('Error fetching attachments:', error);
            return { success: false, message: 'חלה שגיאה במשיכת הקבצים האחרונים.' };
        }
    },
});

export const setReminderTool = createTool({
    id: 'set_reminder',
    description: 'Sets a reminder for a specific task or event via n8n. Use this whenever the user asks to be reminded of something at a specific time.',
    inputSchema: z.object({
        task: z.string().describe('The task or reminder content'),
        time: z.string().describe('When to remind (ISO format or descriptive). Use the current date/time to calculate relative times.'),
    }),
    execute: async (args, context) => {
        const WEBHOOK_URL = 'https://akcleaninng.app.n8n.cloud/webhook/set-reminder';
        const messageId = context?.requestContext?.get('messageId');
        try {
            const payload = { ...args, source: 'Rotem Bot', idMessage: messageId };

            await supabase.from('debug_logs').insert({
                payload: {
                    diag: 'tool-call-n8n',
                    tool: 'set_reminder',
                    request: payload
                }
            });

            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const resultText = await response.text();

            await supabase.from('debug_logs').insert({
                payload: {
                    diag: 'tool-response-n8n',
                    tool: 'set_reminder',
                    status: response.status,
                    response: resultText
                }
            });

            if (!response.ok) throw new Error(`n8n error: ${response.statusText}`);
            return { success: true, message: 'התזכורת הוגדרה בהצלחה!' };
        } catch (error) {
            console.error('Reminder error:', error);
            return { success: false, message: 'חלה שגיאה בהגדרת התזכורת.' };
        }
    },
});

export * from './icount';
export * from './system';
