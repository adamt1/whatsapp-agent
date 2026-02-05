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

            if (!response.ok) throw new Error(`n8n error: ${response.statusText}`);
            return { success: true, message: 'המייל נשלח בהצלחה!' };
        } catch (error) {
            console.error('Email error:', error);
            return { success: false, message: 'חלה שגיאה בשליחת המייל.' };
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
