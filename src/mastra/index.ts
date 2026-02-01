import { Mastra } from '@mastra/core/mastra';
import { mayaAgent } from './agents';

export const mastra = new Mastra({
    agents: { mayaAgent },
});
