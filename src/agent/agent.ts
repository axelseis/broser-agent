import { checkSettings } from "../settings/settings";
import { Store } from "../store";
import { AgentStatus } from "../types";
import { agentResponseSchema } from "../types";
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { Experimental_Agent as Agent, LanguageModel, Output, stepCountIs, tool, type ModelMessage } from 'ai';
import { z } from 'zod';
import { PenpotRagTool } from '../tools/penpotRagTool';

function getInstructions(userName: string, shapes: any = {}) {
  console.log('shapes', shapes);
  return `
  <instructions>
  You are a Penpot project assistant that focuses on helping users solve specific problems in their current project. You analyze the Penpot shapes to understand what the user is working on and provide targeted solutions, design tips, and step-by-step tutorials to help them achieve their goals.
  Your primary function is to help users solve specific problems in their Penpot projects by providing design tips, step-by-step tutorials, and precise interface guidance using the latest documentation.
  </instructions>
  <user_info>
  name: ${userName}.
  </user_info>
  <project_info>
  shapes: ${JSON.stringify(shapes)}.
  </project_info>
`;
}

const output = Output.object({
  schema: agentResponseSchema,
})

let agent: Agent<any, any, any>;
let penpotRagTool: PenpotRagTool;

export async function initAgent(_userId: string, shapes: string, userName: string) {
  Store.agentStatus = AgentStatus.INITIALIZING;

  const {provider, apiKey} = checkSettings();

  let model;

  if (provider === 'openai') {  
    const openai = createOpenAI({
      apiKey: apiKey,
    });
    model = openai('gpt-4o');
  } else if (provider === 'openrouter') {
    const openrouter = createOpenRouter({
      apiKey: apiKey,
    });
    model = openrouter('auto');
  }

  // Inicializar el RAG tool
  penpotRagTool = new PenpotRagTool();
  const ragInitialized = await penpotRagTool.initialize();
  
  if (!ragInitialized) {
    console.warn('⚠️ RAG tool initialization failed, continuing without RAG capabilities');
  }
  
  // Crear herramientas del agente
  const tools: any = {
    sayHelloTool: tool({
      description: 'Use this tool to say hello to the user',
      inputSchema: z.object({
        userName: z.string().describe('The name of the user'),
      }),
      execute: async ({ userName }) => {
        return {
          answer: `Hello, ${userName}! I am the Penpot AI assistant. How can I help you today?`,
        };
      },
    }),
  };

  // Agregar herramienta RAG solo si se inicializó correctamente
  if (ragInitialized) {
    tools.penpotRagTool = tool({
      description: 'Search the Penpot documentation for relevant information to help answer user questions about Penpot features, usage, and best practices',
      inputSchema: z.object({
        query: z.string().describe('The search query to find relevant documentation'),
        topK: z.number().optional().describe('Number of results to return (default: 5)'),
      }),
      execute: async ({ query, topK = 5 }) => {
        try {
          const results = await penpotRagTool.search(query, topK);
          return {
            results: results.map(result => ({
              title: result.title,
              content: result.content,
              url: result.url,
              sourceFile: result.sourceFile,
              score: result.score
            }))
          };
        } catch (error) {
          return {
            error: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
        }
      },
    });
  }
  
  agent = new Agent({
    model: model as LanguageModel,
    system: getInstructions(userName, shapes),
    experimental_output: output,
    stopWhen: stepCountIs(10),
    tools,
  });

  const initResponse = await agent.generate({
    prompt: 'Say hello to the user',
  });

  if (initResponse) {
    Store.agentStatus = AgentStatus.ONLINE;
    console.log('initResponse', initResponse);
    return initResponse;
  } else {
    return false;
  }
}

export async function sendQueryToAgent(messages: ModelMessage[]) {
  console.log('sendQueryToAgent messages: ', messages);
  try {
    const response = await agent.generate({
      messages: messages,
    });
    console.log('sendQueryToAgent response: ', response);
    return response;
  } catch (error) {
    return error instanceof Error ? error.message : 'Sorry, I encountered an error. Please try again.';
  }
}

export function getRAGStatus() {
  if (!penpotRagTool) {
    return {
      initialized: false,
      error: 'RAG tool not initialized'
    };
  }
  
  return penpotRagTool.getStatus();
}

export async function clearRAGCache() {
  if (!penpotRagTool) {
    return false;
  }
  
  try {
    await penpotRagTool.clearCache();
    return true;
  } catch (error) {
    console.error('Error clearing RAG cache:', error);
    return false;
  }
}
