import { Experimental_Agent as Agent, ModelMessage, Output, stepCountIs, ToolSet } from "ai";
import { $chatMessages, $languageModel } from "@/stores";
import { PenpotAgentSettings, UserQueryMessage, AssistantAnswerMessage, AssistantAnswer } from "@/types";

export class PenpotAgent {
  name: string;
  agent: Agent<ToolSet, any, any>;

  constructor(config: PenpotAgentSettings) {
    const { name, instructions, outputSchema, tools } = config;    
    const agentModel = $languageModel.get();
    
    this.name = name;

    this.agent = new Agent({
      model: agentModel,
      system: instructions,
      experimental_output: Output.object({
        schema: outputSchema,
      }),
      stopWhen: stepCountIs(10),
      tools: tools,
    });
  }

  async sendQueryToAgent(userQuery: string) {
    try {
      const userQueryMessage: UserQueryMessage = {
        role: 'user',
        content: userQuery,
      };

      $chatMessages.set([...$chatMessages.get(), userQueryMessage]);

      const messages: ModelMessage[] = $chatMessages.get().map(msg => ({
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
      }));

      console.log('messages', messages);
      const response: any = await this.agent.generate({
        messages: messages,
      });

      const assistantAnswerMessage: AssistantAnswerMessage = {
        role: 'assistant',
        content: response.resolvedOutput as AssistantAnswer,
      };

      $chatMessages.set([...$chatMessages.get(), assistantAnswerMessage]);
    } catch (error) {
      console.error('Error sending query to agent:', error);
    }
  }
}