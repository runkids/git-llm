import { BaseLLMProvider } from './base.js';
import type { Message, RoutingInfo } from '../types.js';
import type { Config, ProviderSettings } from '../../config/env.js';

interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface OpenAIResponse {
  choices: Array<{
    message?: {
      content: string;
    };
    delta?: {
      content?: string;
    };
    finish_reason?: string;
  }>;
}

export class LMStudioProvider extends BaseLLMProvider {
  private baseUrl: string;

  constructor(config: Config, settings: ProviderSettings) {
    super(config, settings);
    this.baseUrl = config.baseUrl.replace(/\/+$/, ''); // Remove trailing slashes
  }

  async *streamChat(
    messages: Message[],
    onRoutingUpdate?: (info: RoutingInfo) => void
  ): AsyncGenerator<string, void, unknown> {
    try {
      if (onRoutingUpdate) {
        onRoutingUpdate({ currentStep: 'start' });
      }

      const openaiMessages = this.convertToOpenAIMessages(messages);
      const requestBody: OpenAIRequest = {
        model: this.config.model,
        messages: openaiMessages,
        temperature: this.settings.temperature,
        max_tokens: this.settings.maxTokens,
        stream: true,
      };

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer dummy', // LM Studio doesn't require real auth
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      if (onRoutingUpdate) {
        onRoutingUpdate({ currentStep: 'generating', workflowType: 'lm-studio-chat' });
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6); // Remove 'data: ' prefix
            if (jsonStr.trim() === '[DONE]') {
              break;
            }

            try {
              const data = JSON.parse(jsonStr) as OpenAIResponse;
              const content = data.choices[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch (e) {
              // Skip invalid JSON lines
              continue;
            }
          }
        }
      }

      if (onRoutingUpdate) {
        onRoutingUpdate({ currentStep: 'completed', workflowType: 'lm-studio-chat' });
      }
    } catch (error) {
      console.error('LM Studio streaming error:', error);
      throw this.handleError(error, 'LM Studio');
    }
  }

  async sendMessage(messages: Message[]): Promise<string> {
    try {
      const openaiMessages = this.convertToOpenAIMessages(messages);
      const requestBody: OpenAIRequest = {
        model: this.config.model,
        messages: openaiMessages,
        temperature: this.settings.temperature,
        max_tokens: this.settings.maxTokens,
        stream: false,
      };

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer dummy', // LM Studio doesn't require real auth
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json() as OpenAIResponse;
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      throw this.handleError(error, 'LM Studio');
    }
  }

  getModelInfo(): { model: string; baseUrl?: string; service: string } {
    return {
      model: this.config.model,
      baseUrl: this.baseUrl,
      service: 'LM Studio',
    };
  }

  private convertToOpenAIMessages(messages: Message[]): OpenAIMessage[] {
    return messages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': 'Bearer dummy',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json() as { data?: Array<{ id: string }> };
      return data.data?.map(model => model.id) || [];
    } catch (error) {
      console.warn('Could not fetch LM Studio models:', error);
      return [];
    }
  }
}