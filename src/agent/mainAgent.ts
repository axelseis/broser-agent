import { PenpotAgent } from "./PenpotAgent";
import { assistantAnswerSchema } from "../types";
import { penpotRagTool } from "../tools/penpotRagTool";
import { tool } from "ai";
import { z } from "zod";
import { $mainAgent, $projectData, $userData } from "../stores";

export async function initMainAgent() {
  const mainAgent = new PenpotAgent({
    name: "Penpot Assistant",
    instructions: `
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
    `,
    outputSchema: assistantAnswerSchema,
    tools: {
      sayHelloTool: tool({
        description: 'Use this tool to compose a hello message for the user',
        inputSchema: z.object({
          dailyMessage: z.string().describe('The daily message for the user'),
        }),
        execute: async ({ dailyMessage }) => {
          const userName = $userData.get()?.name;
          return `Hello, ${userName}! ${dailyMessage}`;
        },
      }),
      penpotRagTool: penpotRagTool,
    },
  });

  $mainAgent.set(mainAgent);

  return mainAgent;
}