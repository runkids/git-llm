import React from 'react';
import { Box } from 'ink';
import { useChat, useOperationConfirmation } from '../../hooks/index.js';
import type { AIServiceInterface } from '../../types/index.js';
import type { CommandContext, CommandResult } from '../../types/commands.js';
import { MessageContainer } from './MessageContainer.js';
import { EnhancedChatInput } from './EnhancedChatInput.js';
import { OperationConfirmation } from './OperationConfirmation.js';

interface ChatInterfaceProps {
  llmService: AIServiceInterface;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ llmService }) => {
  const chat = useChat(llmService);
  const confirmation = useOperationConfirmation(chat.sendConfirmedMessage);

  const handleSendMessage = (content: string) => {
    if (!content.trim() || chat.isLoading) return;

    // Simple confirmation detection - let LLM handle the detailed analysis  
    const isSimpleInfoRequest = content.toLowerCase().match(/^(git )?(status|diff)$|^show |^what |^which |^list |^diff |^changes|^please show|^help me|^give me|^based on/);
    
    if (!isSimpleInfoRequest) {
      // Request confirmation for potentially modifying operations
      confirmation.requestConfirmation(
        'Git Operation',
        'This operation will analyze or modify your repository. You can choose to execute it or see instructions.',
        content.trim()
      );
      return;
    }

    // For safe operations, proceed normally
    chat.sendMessage(content);
  };

  const handleCommand = (result: CommandResult, originalCommand?: string) => {
    if (result.type === 'success' && result.message === 'Conversation cleared') {
      // Handle clear command specially - don't add message
      return;
    }
    
    if (result.type === 'info' && result.message) {
      // Check if this is a help message (contains newlines and "Available")
      if (result.message.includes('Available commands:')) {
        // For help command, show the original command and add as assistant message
        if (originalCommand) {
          const userMessage = {
            role: 'user' as const,
            content: originalCommand
          };
          chat.actions.addMessage(userMessage);
        }
        const message = {
          role: 'assistant' as const,
          content: result.message
        };
        chat.actions.addMessage(message);
      } else {
        // For all other commands, ONLY show the original command, then send directly
        if (originalCommand) {
          const userMessage = {
            role: 'user' as const,
            content: originalCommand
          };
          chat.actions.addMessage(userMessage);
        }
        // Send directly without showing the intermediate message
        handleSendMessage(result.message);
      }
    }
  };

  const commandContext: CommandContext = {
    clearMessages: chat.actions.clearMessages,
    sendMessage: chat.sendMessage,
    // Add more context methods as needed
  };

  return (
    <Box flexDirection="column" height="100%" width="100%">
      {/* 只在沒有確認對話框時顯示消息 */}
      {!confirmation.pendingConfirmation && (
        <MessageContainer 
          messages={chat.messages} 
          isLoading={chat.isLoading}
          routingInfo={chat.routingInfo}
        />
      )}
      
      {confirmation.pendingConfirmation && (
        <Box flexDirection="column" height="100%">
          {/* 顯示簡化的消息歷史（沒有當前確認相關的消息） */}
          <Box flexGrow={1}>
            <MessageContainer 
              messages={chat.messages.slice(0, -1)} // 移除最後一條可能的確認消息
              isLoading={false}
              routingInfo={{}}
            />
          </Box>
          
          <OperationConfirmation
            confirmation={confirmation.pendingConfirmation}
            onSelect={confirmation.handleConfirmation}
            onCancel={confirmation.handleCancel}
          />
        </Box>
      )}
      
      {!confirmation.pendingConfirmation && (
        <EnhancedChatInput
          onSendMessage={handleSendMessage}
          onCommand={handleCommand}
          disabled={chat.isLoading}
          commandContext={commandContext}
        />
      )}
    </Box>
  );
};