import { GoogleGenerativeAI } from '@google/generative-ai';
import { BaseLLMProvider } from './base.js';
import type { Message, RoutingInfo } from '../types.js';
import type { Config, ProviderSettings } from '../../config/env.js';

export class GeminiProvider extends BaseLLMProvider {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(config: Config, settings: ProviderSettings) {
    super(config, settings);

    if (!config.apiKey) {
      throw new Error('Gemini API key is required. Set GEMINI_API_KEY or GOOGLE_API_KEY environment variable.');
    }

    this.genAI = new GoogleGenerativeAI(config.apiKey);
    this.modelName = config.model;
  }

  async *streamChat(
    messages: Message[],
    onRoutingUpdate?: (info: RoutingInfo) => void
  ): AsyncGenerator<string, void, unknown> {
    try {
      if (onRoutingUpdate) {
        onRoutingUpdate({ currentStep: 'start' });
      }

      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          temperature: this.settings.temperature,
          maxOutputTokens: this.settings.maxTokens,
        },
      });

      const geminiMessages = this.convertToGeminiMessages(messages);

      // Start chat with history (all messages except the last one)
      const history = geminiMessages.slice(0, -1);
      const lastMessage = geminiMessages[geminiMessages.length - 1];

      const chat = model.startChat({
        history: history.map(msg => ({
          role: msg.role,
          parts: [{ text: msg.content }],
        })),
      });

      if (onRoutingUpdate) {
        onRoutingUpdate({ currentStep: 'generating', workflowType: 'gemini-chat' });
      }

      const result = await chat.sendMessageStream(lastMessage.content);

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield text;
        }
      }

      if (onRoutingUpdate) {
        onRoutingUpdate({ currentStep: 'completed', workflowType: 'gemini-chat' });
      }
    } catch (error) {
      console.error('Gemini streaming error:', error);
      throw this.handleError(error, 'Gemini');
    }
  }

  async sendMessage(messages: Message[]): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          temperature: this.settings.temperature,
          maxOutputTokens: this.settings.maxTokens,
        },
      });

      const geminiMessages = this.convertToGeminiMessages(messages);

      // Start chat with history (all messages except the last one)
      const history = geminiMessages.slice(0, -1);
      const lastMessage = geminiMessages[geminiMessages.length - 1];

      const chat = model.startChat({
        history: history.map(msg => ({
          role: msg.role,
          parts: [{ text: msg.content }],
        })),
      });

      const result = await chat.sendMessage(lastMessage.content);
      const response = await result.response;

      return response.text();
    } catch (error) {
      throw this.handleError(error, 'Gemini');
    }
  }

  getModelInfo(): { model: string; baseUrl?: string; service: string } {
    return {
      model: this.modelName,
      service: 'Google Gemini',
    };
  }

  private convertToGeminiMessages(messages: Message[]): Array<{ role: 'user' | 'model'; content: string }> {
    return messages.map(msg => ({
      // Gemini uses 'model' instead of 'assistant'
      role: msg.role === 'assistant' ? 'model' : 'user' as const,
      content: msg.content,
    }));
  }

  async getAvailableModels(): Promise<string[]> {
    // Gemini available models
    return [
      'gemini-2.5-pro-preview-05-06',
      'gemini-2.5-flash-preview-05-20',
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-1.5-pro',
    ];
  }
}
