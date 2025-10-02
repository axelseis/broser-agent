import { checkSettings } from "../settings/settings";
import { Store } from "../store";
import { AgentStatus } from "../types";
import { agentResponseSchema } from "../types";
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { Experimental_Agent as Agent, LanguageModel, Output, stepCountIs, tool, type ModelMessage } from 'ai';
import { z } from 'zod';

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
