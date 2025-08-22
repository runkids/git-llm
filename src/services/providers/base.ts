import type { Message, RoutingInfo } from '../types.js';
import type { Config, ProviderSettings } from '../../config/env.js';

export abstract class BaseLLMProvider {
  protected config: Config;
  protected settings: ProviderSettings;

  constructor(config: Config, settings: ProviderSettings) {
    this.config = config;
    this.settings = settings;
  }

  abstract streamChat(
    messages: Message[],
    onRoutingUpdate?: (info: RoutingInfo) => void
  ): AsyncGenerator<string, void, unknown>;

  abstract sendMessage(messages: Message[]): Promise<string>;

  abstract getModelInfo(): { model: string; baseUrl?: string; service: string };

  async getAvailableModels(): Promise<string[]> {
    // Default implementation returns the current model
    return [this.config.model];
  }

  protected async *simulateStreaming(response: string, chunkSize: number = 8): AsyncGenerator<string, void, unknown> {
    for (let i = 0; i < response.length; i += chunkSize) {
      const chunk = response.slice(i, i + chunkSize);
      yield chunk;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
  }

  protected handleError(error: unknown, provider: string): Error {
    if (error instanceof Error) {
      return new Error(`${provider} Error: ${error.message}`);
    }
    return new Error(`${provider} Error: Unknown error occurred`);
  }
}