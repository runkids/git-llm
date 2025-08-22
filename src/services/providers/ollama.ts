import { BaseLLMProvider } from './base.js';
import type { Message, RoutingInfo } from '../types.js';
import type { Config, ProviderSettings } from '../../config/env.js';

interface OllamaMessage {
  role: string;
  content: string;
}

interface OllamaRequest {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
  options?: {
    temperature?: number;
    num_predict?: number;
  };
}

interface OllamaResponse {
  message?: {
    content: string;
  };
  response?: string;
  done?: boolean;
}

export class OllamaProvider extends BaseLLMProvider {
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

      const ollamaMessages = this.convertToOllamaMessages(messages);
      const requestBody: OllamaRequest = {
        model: this.config.model,
        messages: ollamaMessages,
        stream: true,
        options: {
          temperature: this.settings.temperature,
          num_predict: this.settings.maxTokens,
        },
      };

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        onRoutingUpdate({ currentStep: 'generating', workflowType: 'ollama-chat' });
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line) as OllamaResponse;
            if (data.message?.content) {
              yield data.message.content;
            }
            if (data.done) {
              break;
            }
          } catch (e) {
            // Skip invalid JSON lines
            continue;
          }
        }
      }

      if (onRoutingUpdate) {
        onRoutingUpdate({ currentStep: 'completed', workflowType: 'ollama-chat' });
      }
    } catch (error) {
      console.error('Ollama streaming error:', error);
      throw this.handleError(error, 'Ollama');
    }
  }

  async sendMessage(messages: Message[]): Promise<string> {
    try {
      const ollamaMessages = this.convertToOllamaMessages(messages);
      const requestBody: OllamaRequest = {
        model: this.config.model,
        messages: ollamaMessages,
        stream: false,
        options: {
          temperature: this.settings.temperature,
          num_predict: this.settings.maxTokens,
        },
      };

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json() as OllamaResponse;
      return data.message?.content || data.response || '';
    } catch (error) {
      throw this.handleError(error, 'Ollama');
    }
  }

  getModelInfo(): { model: string; baseUrl?: string; service: string } {
    return {
      model: this.config.model,
      baseUrl: this.baseUrl,
      service: 'Ollama',
    };
  }

  private convertToOllamaMessages(messages: Message[]): OllamaMessage[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json() as { models?: Array<{ name: string }> };
      return data.models?.map(model => model.name) || [];
    } catch (error) {
      console.warn('Could not fetch Ollama models:', error);
      return [];
    }
  }
}