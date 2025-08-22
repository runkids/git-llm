export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface RoutingInfo {
  workflowType?: string;
  currentStep?: string;
}

export interface AIServiceInterface {
  streamChat(messages: Message[], onRoutingUpdate?: (info: RoutingInfo) => void): AsyncGenerator<string, void, unknown>;
  sendMessage(messages: Message[]): Promise<string>;
  getModelInfo(): { model: string; baseUrl?: string; service: string };
}