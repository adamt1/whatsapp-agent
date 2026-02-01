import { Mastra } from '@mastra/core/mastra';
import { rotemAgent } from './agents';

export const mastra = new Mastra({
    agents: { rotemAgent },
});
