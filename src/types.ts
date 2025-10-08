import { z, ZodObject } from "zod";
import { ToolSet } from 'ai';

export const enum PluginMessageType {
  GET_INITIAL_DATA = 'get_initial_data',
  THEME_CHANGE = 'theme_change',
  USER_DATA = 'user_data',
  PROJECT_DATA = 'project_data',
}

export enum MainStatus {
  INITIALIZING = 'Initializing',
  NOT_CONFIGURED = 'Not Configured',
  ONLINE = 'Online',
  OFFLINE = 'Offline'
}

export enum AssistantAnswerType {
  SIMPLE_ANSWER = 'simple_answer',
  STEP_BY_STEP_TUTORIAL = 'step_by_step_tutorial',
}

export enum AgentToolType {
  RAG = 'RAG',
  PLUGIN_FUNCTION = 'plugin_function',
  AGENT_CALL = 'agent_call',
  IMAGE_ANALYSIS = 'image_analysis',
  IMAGE_GENERATION = 'image_generation',
}

export interface PluginMessage {
  source: string;
  type: PluginMessageType;
  payload: any;
}

export interface UserData {
  id: string;
  name: string;
}

export interface ProjectData {
  id: string;
  name: string;
  shapes?: any;
}

export type ToolSettings = {
  type: AgentToolType;
  name: string;
  description: string;
  inputSchema: ZodObject<any>;
  ragContentsFile?: string;
  functionName?: string;
  agentName?: string;
}
export interface PenpotAgentSettings {
  name: string;
  instructions: string;
  outputSchema: ZodObject<any>;
  tools: ToolSet;
}

export const assistantAnswerSchema = z.object({
  answer: z.object({
    type: z.enum(AssistantAnswerType),
    simple_answer: z.string().optional().describe('Simple answer'),
    steps: z.array(z.object({
      title: z.string(),
      description: z.string(),
    })).optional().describe('Steps of a step by step tutorial'),
    design_tips: z.array(z.string()).optional().describe('Design tips'),
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

export type AssistantAnswer = z.infer<typeof assistantAnswerSchema>;
export interface UserQueryMessage {
  role: 'user';
  content: string;
}

export interface AssistantAnswerMessage {
  role: 'assistant';
  content: AssistantAnswer;
  isStreaming?: boolean;
}

export type ChatMessages = (UserQueryMessage | AssistantAnswerMessage)[];

export interface PluginSettings {
  provider: 'openai' | 'openrouter';
  apiKey: string;
  languageModelName: string;
  imageAnalysisModelName: string;
  imageGenerationModelName: string;
  embeddingModelName: string;
}
