import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const currentTimeTool = createTool({
    id: 'get_current_time',
    description: 'Returns the current date, time, and day of the week in Israel (IST). Use this when the user asks about the date, time, or "today".',
    inputSchema: z.object({}),
    execute: async () => {
        const now = new Date();
        const options: Intl.DateTimeFormatOptions = {
            timeZone: 'Asia/Jerusalem',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            weekday: 'long',
            hour12: false
        };

        const formatter = new Intl.DateTimeFormat('he-IL', options);
        const parts = formatter.formatToParts(now);
        const dateStr = formatter.format(now);

        return {
            success: true,
            currentTime: dateStr,
            iso: now.toISOString(),
            message: `הזמן הנוכחי בישראל הוא: ${dateStr}`,
        };
    },
});
