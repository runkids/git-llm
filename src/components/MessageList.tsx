import { Box, Text } from 'ink';

import { LoadingSpinner } from './ui/index.js';
import { MarkdownMessage } from './MarkdownMessage.js';
import type { Message } from '../services/types.js';
import React from 'react';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  routingInfo?: {
    workflowType?: string;
    currentStep?: string;
  };
}

export const MessageList: React.FC<MessageListProps> = ({ messages, isLoading, routingInfo }) => {
  const getLoadingMessage = (routingInfo?: { workflowType?: string; currentStep?: string }): string => {
    // Combine workflow type and current step into a comprehensive message
    const workflowName = routingInfo?.workflowType === 'commit-help' ? 'Commit Helper' :
                        routingInfo?.workflowType === 'git-analysis' ? 'Git Analysis' :
                        routingInfo?.workflowType === 'code-review' ? 'Code Review' :
                        routingInfo?.workflowType === 'general-chat' ? 'General Chat' :
                        routingInfo?.workflowType || 'Processing';
    
    const currentStepText = routingInfo?.currentStep === 'start' ? 'Initializing' :
                          routingInfo?.currentStep === 'analyze_git_context' ? 'Analyzing Git context' :
                          routingInfo?.currentStep === 'analyze_request' ? 'Understanding your request' :
                          routingInfo?.currentStep === 'execute_analysis' ? 'Running analysis' :
                          routingInfo?.currentStep === 'generate_response' ? 'Generating response' :
                          routingInfo?.currentStep === 'classify_operation' ? 'Classifying operation' :
                          routingInfo?.currentStep || 'Processing';
    
    return `${workflowName} • ${currentStepText}...`;
  };

  const getLogoLine = (lineIndex: number): { text: string; color: string } => {
    const lines = [
      { text: ' ██████╗ ██╗████████╗    ██╗     ██╗     ███╗   ███╗', color: 'blue' },
      { text: '██╔════╝ ██║╚══██╔══╝    ██║     ██║     ████╗ ████║', color: 'blue' },
      { text: '██║  ███╗██║   ██║       ██║     ██║     ██╔████╔██║', color: 'cyan' },
      { text: '██║   ██║██║   ██║       ██║     ██║     ██║╚██╔╝██║', color: 'cyan' },
      { text: '╚██████╔╝██║   ██║       ███████╗███████╗██║ ╚═╝ ██║', color: 'magenta' },
      { text: ' ╚═════╝ ╚═╝   ╚═╝       ╚══════╝╚══════╝╚═╝     ╚═╝', color: 'magenta' }
    ];

    return lines[lineIndex] || { text: '', color: 'gray' };
  };

  const glowText = (text: string, color: string) => {
    return <Text color={color}>{text}</Text>;
  };
  
  return (
    <Box flexDirection="column" width="100%" height="100%">
      {messages.length === 0 ? (
        <Box flexDirection="column" alignItems="center" justifyContent="center" height="100%">
          <Box flexDirection="column" alignItems="center" marginBottom={3} paddingX={3} paddingY={2}>
        {[0, 1, 2, 3, 4, 5].map(lineIndex => {
          const line = getLogoLine(lineIndex);
          return (
            <Box key={lineIndex}>
              {glowText(line.text, line.color)}
            </Box>
          );
        })}
      </Box>
          <Text color="gray" dimColor>
            Type your message and press Enter to chat with your local LLM.
          </Text>
        </Box>
      ) : (
        <Box flexDirection="column" width="100%">
          {messages.map((message, index) => (
            <Box key={index} flexDirection="column" marginBottom={1} width="100%">
              <Text color={message.role === 'user' ? 'blue' : 'green'}>
                {message.role === 'user' ? 'You: ' : 'Git-LLM: '}
              </Text>
              <MarkdownMessage content={message.content} role={message.role} />
            </Box>
          ))}
          {isLoading && (
            <Box flexDirection="column" marginBottom={1}>
              <Box paddingLeft={2}>
                <LoadingSpinner message={getLoadingMessage(routingInfo)} />
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};
