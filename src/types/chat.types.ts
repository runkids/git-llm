export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface RoutingInfo {
  workflowType?: string;
  currentStep?: string;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  routingInfo: RoutingInfo;
}

export interface ConfirmationState {
  operation: string;
  description: string;
  request: string;
}