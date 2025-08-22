import type { Message, RoutingInfo } from './chat.types.js';

export interface AIServiceInterface {
  streamChat(messages: Message[], onRoutingUpdate?: (info: RoutingInfo) => void): AsyncGenerator<string, void, unknown>;
  sendMessage(messages: Message[]): Promise<string>;
  getModelInfo(): { model: string; baseUrl?: string; service: string };
}

export interface Config {
  baseUrl: string;
  model: string;
  apiKey?: string;
}

export interface ModelInfo {
  model: string;
  baseUrl?: string;
  service: string;
}