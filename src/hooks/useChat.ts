import { useState, useCallback, useRef, useEffect } from 'react';
import type { Message, AIServiceInterface, RoutingInfo } from '../types/index.js';

export interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  routingInfo: RoutingInfo;
  sendMessage: (content: string) => void;
  sendConfirmedMessage: (confirmed: boolean, originalRequest: string) => void;
  actions: {
    clearMessages: () => void;
    setLoading: (loading: boolean) => void;
    addMessage: (message: Message) => void;
  };
}

export const useChat = (llmService: AIServiceInterface): UseChatReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [routingInfo, setRoutingInfo] = useState<RoutingInfo>({});
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const streamResponse = useCallback(async (
    messagesToSend: Message[],
    onStart?: () => void,
    onComplete?: () => void
  ) => {
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    onStart?.();

    try {
      let assistantContent = '';
      const assistantMessage: Message = { role: 'assistant', content: '' };
      setMessages(prev => [...prev, assistantMessage]);

      for await (const chunk of llmService.streamChat(messagesToSend, (info: RoutingInfo) => {
        setRoutingInfo(info);
      })) {
        if (abortController.signal.aborted) break;
        
        assistantContent += chunk;
        setMessages(prev => {
          if (prev.length === 0) return prev;
          return [
            ...prev.slice(0, -1),
            { role: 'assistant', content: assistantContent }
          ];
        });
      }
    } catch (streamError) {
      if (!abortController.signal.aborted) {
        const errorMessage: Message = {
          role: 'assistant',
          content: `Error: ${streamError instanceof Error ? streamError.message : 'Unknown error'}`,
        };
        setMessages(prev => [...prev.slice(0, -1), errorMessage]);
      }
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoading(false);
        setRoutingInfo({});
        onComplete?.();
      }
    }
  }, [llmService]);

  const sendMessage = useCallback((content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: content.trim() };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    streamResponse([...messages, userMessage]);
  }, [isLoading, messages, streamResponse]);

  const sendConfirmedMessage = useCallback((confirmed: boolean, originalRequest: string) => {
    const prefixedRequest = confirmed ? `EXECUTE: ${originalRequest}` : `SUGGEST: ${originalRequest}`;
    
    const selectionMessage: Message = {
      role: 'user',
      content: confirmed ? '✅ Yes - Execute the operation' : '📚 No - Show instructions'
    };
    
    setMessages(prev => [...prev, selectionMessage]);
    setIsLoading(true);

    const allMessages = [...messages, selectionMessage];
    const messagesToSend = [...allMessages.slice(0, -1), { role: 'user' as const, content: prefixedRequest }];
    
    streamResponse(messagesToSend);
  }, [messages, streamResponse]);

  const actions = {
    clearMessages: useCallback(() => setMessages([]), []),
    setLoading: useCallback((loading: boolean) => setIsLoading(loading), []),
    addMessage: useCallback((message: Message) => setMessages(prev => [...prev, message]), [])
  };

  return {
    messages,
    isLoading,
    routingInfo,
    sendMessage,
    sendConfirmedMessage,
    actions
  };
};