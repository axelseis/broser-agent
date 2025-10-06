import { z } from "zod";

export enum AgentResponseType {
  THINKING = 'thinking',
  SIMPLE_RESPONSE = 'simple_response',
  STEP_BY_STEP_TUTORIAL = 'step_by_step_tutorial',
  DESIGN_TIPS = 'design_tips',
}

export const agentResponseSchema = z.object({
  answer: z.object({
    type: z.enum(AgentResponseType),
    title: z.string(),
    description: z.string().optional(),
    steps: z.array(z.object({
      title: z.string(),
      description: z.string(),
    })).optional().describe('Steps of the answer when type is step_by_step_tutorial'),
    items: z.array(z.string()).optional().describe('Items of the answer when type is design_tips'),
  }),
  penpot_user_guide_sources: z.array(z.object({
    title: z.string(),
    section_title: z.string(),
    section_path: z.string(),
    url: z.string().optional(),
    summary: z.string().optional(),
    relevanceScore: z.number().optional(),
  })).optional(),
});

export interface AgentSettings {
  provider: 'openai' | 'openrouter';
  apiKey: string;
  agentModel?: string;
  imageModel?: string;
  embeddingsModel?: string;
}
export interface PluginMessage {
  source: string;
  type: string;
  payload: any;
}

export type AgentResponse = z.infer<typeof agentResponseSchema>;
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string | AgentResponse;
  isStreaming?: boolean;
}

export enum AgentStatus {
  INITIALIZING = 'Initializing',
  NOT_CONFIGURED = 'Not Configured',
  ONLINE = 'Online',
  OFFLINE = 'Offline'
}

