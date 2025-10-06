import { checkSettings } from "../settings/settings";
import { $agentStatus, $agentModel } from "../stores";
import { AgentStatus } from "../types";
import { agentResponseSchema } from "../types";
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { Experimental_Agent as Agent, LanguageModel, Output, stepCountIs, tool, type ModelMessage } from 'ai';
import { z } from 'zod';
import { penpotRagTool } from "../tools/penpotRagTool";

function getInstructions(userName: string, shapes: any = {}) {
  console.log('shapes', shapes);
  return `
  <instructions>
  You are a Penpot project assistant that focuses on helping users solve specific problems in their current project. You analyze the Penpot shapes to understand what the user is working on and provide targeted solutions, design tips, and step-by-step tutorials to help them achieve their goals.
  
  Your primary function is to help users solve specific problems in their Penpot projects by providing design tips, step-by-step tutorials, and precise interface guidance using the latest documentation.
  
  IMPORTANT: When users ask questions about Penpot features, functionality, or how to do something, ALWAYS use the penpotRagTool to search the official documentation first. This ensures you provide accurate, up-to-date information based on the official Penpot user guide.
  
  Response Guidelines:
  - For feature questions: Use penpotRagTool to find relevant documentation sections
  - For how-to questions: Use penpotRagTool to find step-by-step instructions
  - For design tips: Combine penpotRagTool results with your knowledge
  - Always cite sources from the documentation when available
  - Provide specific, actionable advice based on the documentation
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
  $agentStatus.set(AgentStatus.INITIALIZING);

  const {provider, apiKey} = checkSettings();
  const agentModel = $agentModel.get();

  let model;

  if (provider === 'openai') {  
    const openai = createOpenAI({
      apiKey: apiKey,
    });
    model = openai(agentModel);
  } else if (provider === 'openrouter') {
    const openrouter = createOpenRouter({
      apiKey: apiKey,
    });
    model = openrouter(agentModel);
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
    penpotRagTool: penpotRagTool,
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
    $agentStatus.set(AgentStatus.ONLINE);
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
