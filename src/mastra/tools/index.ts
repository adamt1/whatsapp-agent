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
