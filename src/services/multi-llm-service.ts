import type { AIServiceInterface, Message, RoutingInfo } from './types.js';
import { BaseLLMProvider, LLMProviderFactory } from './providers/index.js';
import { getConfig, getProviderSettings } from '../config/env.js';

import { ChatOpenAI } from '@langchain/openai';
import { WorkflowRouter } from '../workflows/router.js';

export class MultiLLMService implements AIServiceInterface {
  private provider: BaseLLMProvider;
  private config = getConfig();
  private settings = getProviderSettings();
  private workflowRouter?: WorkflowRouter;
  private useWorkflows: boolean = true;

  constructor() {
    this.provider = LLMProviderFactory.createProvider(this.config, this.settings);
    
    if (this.shouldUseWorkflows()) {
      this.initializeWorkflowRouter();
    }
  }

  private shouldUseWorkflows(): boolean {
    // Enable workflows for all providers
    return true;
  }

  private initializeWorkflowRouter() {
    try {
      this.initializeLangChainWorkflowRouter();
    } catch (error) {
      console.warn('Failed to initialize workflow router:', error);
      this.workflowRouter = undefined;
    }
  }

  private initializeLangChainWorkflowRouter() {
    try {
      if (!process.env.OPENAI_API_KEY) {
        process.env.OPENAI_API_KEY = 'dummy';
      }

      let llm: ChatOpenAI;
      
      if (this.config.provider === 'lm-studio') {
        llm = new ChatOpenAI({
          model: this.config.model,
          temperature: this.settings.temperature || 0.7,
          streaming: true,
          configuration: {
            baseURL: this.config.baseUrl,
          },
        });
      } else if (this.config.provider === 'ollama') {
        // Ollama also supports OpenAI-compatible API
        llm = new ChatOpenAI({
          model: this.config.model,
          temperature: this.settings.temperature || 0.7,
          streaming: true,
          configuration: {
            baseURL: this.config.baseUrl, // Ollama's OpenAI-compatible endpoint
          },
        });
      } else {
        return;
      }

      this.workflowRouter = new WorkflowRouter(llm);
    } catch (error) {
      console.warn('Failed to initialize LangChain workflow router:', error);
      this.workflowRouter = undefined;
    }
  }


  async *streamChat(
    messages: Message[],
    onRoutingUpdate?: (info: RoutingInfo) => void
  ): AsyncGenerator<string, void, unknown> {
    try {
      // Try using workflows first if available and enabled
      if (this.useWorkflows && messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.role === 'user') {
          if (onRoutingUpdate) {
            onRoutingUpdate({ currentStep: 'start' });
          }

          let workflowResult;
          
          // Use LangChain WorkflowRouter for both providers
          if (this.workflowRouter) {
            workflowResult = await this.workflowRouter.routeAndExecute(
              lastMessage.content,
              onRoutingUpdate,
              messages
            );
          }

          if (workflowResult) {
            // Update with final workflow type
            if (onRoutingUpdate && workflowResult.workflowType) {
              onRoutingUpdate({
                workflowType: workflowResult.workflowType,
                currentStep: 'completed'
              });
            }

            // Stream the workflow response
            for await (const chunk of this.simulateStreamingPublic(workflowResult.response)) {
              yield chunk;
            }
            return;
          }
        }
      }

      // Fallback to provider's streaming
      yield* this.provider.streamChat(messages, onRoutingUpdate);
    } catch (error) {
      console.error('Multi-LLM streaming error:', error);
      const errorMsg = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      yield errorMsg;
    }
  }

  async sendMessage(messages: Message[]): Promise<string> {
    try {
      // Try using workflows first if available and enabled
      if (this.useWorkflows && messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.role === 'user') {
          let workflowResult;
          
          // Use LangChain WorkflowRouter for both providers
          if (this.workflowRouter) {
            workflowResult = await this.workflowRouter.routeAndExecute(
              lastMessage.content,
              undefined,
              messages
            );
          }
          
          if (workflowResult) {
            return workflowResult.response;
          }
        }
      }

      // Fallback to provider's sendMessage
      return await this.provider.sendMessage(messages);
    } catch (error) {
      throw new Error(`Multi-LLM Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getModelInfo(): { model: string; baseUrl?: string; service: string } {
    const providerInfo = this.provider.getModelInfo();
    const workflowSuffix = this.useWorkflows && this.workflowRouter ? ' + LangGraph' : '';
    
    return {
      model: providerInfo.model,
      baseUrl: providerInfo.baseUrl,
      service: `${providerInfo.service}${workflowSuffix}`,
    };
  }

  private async *simulateStreamingPublic(response: string, chunkSize: number = 8): AsyncGenerator<string, void, unknown> {
    for (let i = 0; i < response.length; i += chunkSize) {
      const chunk = response.slice(i, i + chunkSize);
      yield chunk;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
  }

  setUseWorkflows(enabled: boolean) {
    this.useWorkflows = enabled;
    console.log(`🔧 Workflows ${enabled ? 'enabled' : 'disabled'}`);
  }

  getAvailableWorkflows() {
    if (this.workflowRouter) {
      return this.workflowRouter.getAvailableWorkflows();
    }
    return [];
  }

  async getAvailableModels(): Promise<string[]> {
    return await this.provider.getAvailableModels();
  }

  getProviderInfo(): {
    provider: string;
    displayName: string;
    supportsWorkflows: boolean;
    supportsStreaming: boolean;
  } {
    return {
      provider: this.config.provider,
      displayName: LLMProviderFactory.getProviderDisplayName(this.config.provider),
      supportsWorkflows: this.shouldUseWorkflows(),
      supportsStreaming: this.settings.streaming ?? true,
    };
  }
}
