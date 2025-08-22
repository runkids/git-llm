import { AIMessage, HumanMessage } from '@langchain/core/messages';
import type { AIServiceInterface, Message, RoutingInfo } from './types.js';

import { ChatOpenAI } from '@langchain/openai';
import { WorkflowRouter } from '../workflows/router.js';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { getLegacyConfig } from '../config/env.js';

export class LangGraphService implements AIServiceInterface {
  private agent: any;
  private config = getLegacyConfig();
  private llm: ChatOpenAI;
  private workflowRouter: WorkflowRouter;
  private useWorkflows: boolean = true;

  constructor() {
    // Set environment variable to satisfy LangChain's requirement
    if (!process.env.OPENAI_API_KEY) {
      process.env.OPENAI_API_KEY = 'dummy';
    }

    // Create LangChain OpenAI client with our local LM-Studio configuration
    this.llm = new ChatOpenAI({
      model: this.config.model,
      temperature: 0.7,
      streaming: true,
      configuration: {
        baseURL: this.config.baseUrl,
      },
    });

    // Initialize workflow router
    this.workflowRouter = new WorkflowRouter(this.llm);

    // Keep the original agent as fallback
    this.agent = createReactAgent({
      llm: this.llm,
      tools: [], // No tools initially
    });
  }

  /**
   * Convert our Message format to LangChain message format
   */
  private convertToLangChainMessages(messages: Message[]) {
    return messages.map(msg => {
      if (msg.role === 'user') {
        return new HumanMessage(msg.content);
      } else if (msg.role === 'assistant') {
        return new AIMessage(msg.content);
      } else {
        // system messages - for now treat as human messages
        return new HumanMessage(msg.content);
      }
    });
  }

  /**
   * Stream chat responses using workflows or fallback to agent
   * Simulates streaming by getting full response and yielding it chunk by chunk
   */
  async *streamChat(messages: Message[], onRoutingUpdate?: (info: RoutingInfo) => void): AsyncGenerator<string, void, unknown> {
    try {
      let response: string;
      
      if (this.useWorkflows && messages.length > 0) {
        // Use workflows for enhanced responses
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.role === 'user') {
          // Notify about routing start
          if (onRoutingUpdate) {
            onRoutingUpdate({ currentStep: 'start' });
          }
          
          const workflowResult = await this.workflowRouter.routeAndExecute(
            lastMessage.content,
            onRoutingUpdate,
            messages
          );
          response = workflowResult.response;
          
          // Update with final workflow type
          if (onRoutingUpdate && workflowResult.workflowType) {
            onRoutingUpdate({ 
              workflowType: workflowResult.workflowType,
              currentStep: 'completed'
            });
          }
        } else {
          // Fallback to regular agent for non-user messages
          response = await this.sendMessage(messages);
        }
      } else {
        // Use original agent behavior
        response = await this.sendMessage(messages);
      }
      
      // Simulate streaming by yielding chunks of the response
      const chunkSize = 8; // slightly larger chunks for better UX
      for (let i = 0; i < response.length; i += chunkSize) {
        const chunk = response.slice(i, i + chunkSize);
        yield chunk;
        // Add small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 25));
      }
    } catch (error) {
      console.error('LangGraph streaming error:', error);
      
      // Yield error message as fallback
      const errorMsg = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      yield errorMsg;
    }
  }

  /**
   * Send a single message (non-streaming)
   * Uses workflows when available, fallback to original agent
   */
  async sendMessage(messages: Message[]): Promise<string> {
    try {
      // Try workflows first for user messages
      if (this.useWorkflows && messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.role === 'user') {
          const workflowResult = await this.workflowRouter.routeAndExecute(lastMessage.content, undefined, messages);
          return workflowResult.response;
        }
      }

      // Fallback to original agent behavior
      const langChainMessages = this.convertToLangChainMessages(messages);

      const result = await this.agent.invoke({
        messages: langChainMessages,
      });

      // Extract the final response
      if (result && result.messages && result.messages.length > 0) {
        const lastMessage = result.messages[result.messages.length - 1];
        return lastMessage.content || '';
      }

      // If no messages, try to find content in other ways
      if (result && typeof result === 'string') {
        return result;
      }

      if (result && result.content) {
        return result.content;
      }

      return '';
    } catch (error) {
      throw new Error(`LangGraph Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Enable or disable workflow usage
   */
  setUseWorkflows(enabled: boolean) {
    this.useWorkflows = enabled;
    console.log(`🔧 Workflows ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get available workflows
   */
  getAvailableWorkflows() {
    return this.workflowRouter.getAvailableWorkflows();
  }

  getModelInfo(): { model: string; baseUrl?: string; service: string } {
    return {
      model: this.config.model,
      baseUrl: this.config.baseUrl,
      service: this.useWorkflows ? 'LangGraph + Workflows' : 'LangGraph',
    };
  }
}
