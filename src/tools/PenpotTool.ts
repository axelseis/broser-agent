import { AgentToolType, ToolSettings } from "@/types";
import { Tool, tool } from "ai";

export class PenpotTool {
  type: AgentToolType;
  name: string;
  description: string;
  tool: Tool;

  constructor(config: ToolSettings) {
    const { type, name, description, inputSchema } = config;

    this.type = type;
    this.name = name;
    this.description = description;
    
    this.tool = tool({
      description: description,
      inputSchema: inputSchema,
      execute: async () => {
        return { output: 'Hello, world!' };
      },
    });


  }
}