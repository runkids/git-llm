import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Box } from 'ink';
import type { Message, AIServiceInterface, RoutingInfo } from '../services/types.js';
import { MessageList } from './MessageList.js';
import { InputBox } from './InputBox.js';
import { GitOperationSelector } from './GitOperationSelector.js';

interface ChatInterfaceProps {
  llmService: AIServiceInterface;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ llmService }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');
  const [showInput, setShowInput] = useState(true);
  const [routingInfo, setRoutingInfo] = useState<{workflowType?: string; currentStep?: string}>({});
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    operation: string;
    description: string;
    originalRequest: string;
  } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleOperationConfirmation = useCallback(async (confirmed: boolean) => {
    if (!pendingConfirmation) return;
    
    const originalRequest = pendingConfirmation.originalRequest;
    const prefixedRequest = confirmed ? `EXECUTE: ${originalRequest}` : `SUGGEST: ${originalRequest}`;
    
    const selectionMessage: Message = {
      role: 'user',
      content: confirmed ? '✅ Yes - Execute the operation' : '📚 No - Show instructions'
    };
    
    setMessages(prev => [...prev, selectionMessage]);
    setPendingConfirmation(null);
    setIsLoading(true);
    setShowInput(false);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      let assistantContent = '';
      const assistantMessage: Message = { role: 'assistant', content: '' };
      setMessages(prev => [...prev, assistantMessage]);

      (async () => {
        try {
          const allMessages = [...messages, selectionMessage];
          for await (const chunk of llmService.streamChat([...allMessages.slice(0, -1), { role: 'user', content: prefixedRequest }], (info: RoutingInfo) => {
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
            setShowInput(true);
            setRoutingInfo({});
          }
        }
      })();
    } catch (error) {
      if (!abortController.signal.aborted) {
        const errorMessage: Message = {
          role: 'assistant',
          content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
        setMessages(prev => [...prev.slice(0, -1), errorMessage]);
        setIsLoading(false);
        setShowInput(true);
      }
    }
  }, [pendingConfirmation, llmService, messages]);

  const sendMessage = useCallback((content: string) => {
    if (!content.trim() || isLoading) return;

    const isSimpleInfoRequest = content.toLowerCase().match(/^(git )?status$|^show |^what |^which |^list /);
    
    if (!isSimpleInfoRequest) {
      const userMessage: Message = { role: 'user', content: content.trim() };
      setMessages(prev => [...prev, userMessage]);
      setInput('');
      
      setPendingConfirmation({
        operation: 'Git Operation',
        description: 'This operation will analyze or modify your repository. You can choose to execute it or see instructions.',
        originalRequest: content.trim()
      });
      
      return;
    }

    const userMessage: Message = { role: 'user', content: content.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setShowInput(false);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      let assistantContent = '';
      const assistantMessage: Message = { role: 'assistant', content: '' };
      setMessages(prev => [...prev, assistantMessage]);

      (async () => {
        try {
          for await (const chunk of llmService.streamChat([...messages, userMessage], (info: RoutingInfo) => {
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
            setShowInput(true);
            setRoutingInfo({});
          }
        }
      })();
    } catch (error) {
      if (!abortController.signal.aborted) {
        const errorMessage: Message = {
          role: 'assistant',
          content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
        setMessages(prev => [...prev.slice(0, -1), errorMessage]);
        setIsLoading(false);
        setShowInput(true);
      }
    }
  }, [isLoading, llmService]);

  return (
    <Box flexDirection="column" height="100%" width="100%">
      <Box flexGrow={1} flexShrink={1} width="100%">
        <MessageList messages={messages} isLoading={isLoading} routingInfo={routingInfo} />
      </Box>
      {pendingConfirmation && (
        <Box flexShrink={0} flexGrow={0} width="100%">
          <GitOperationSelector
            operation={pendingConfirmation.operation}
            description={pendingConfirmation.description}
            onSelect={handleOperationConfirmation}
          />
        </Box>
      )}
      
      {showInput && !pendingConfirmation && (
        <Box flexShrink={0} flexGrow={0} width="100%">
          <InputBox
            value={input}
            onChange={setInput}
            onSubmit={sendMessage}
            disabled={isLoading}
          />
        </Box>
      )}
    </Box>
  );
};