import type { Message, RoutingInfo } from '../../types/index.js';

import { Box } from 'ink';
import { MessageList } from '../MessageList.js';
import React from 'react';

interface MessageContainerProps {
  messages: Message[];
  isLoading: boolean;
  routingInfo: RoutingInfo;
}

export const MessageContainer: React.FC<MessageContainerProps> = ({
  messages,
  isLoading,
  routingInfo
}) => {
  return (
    <Box flexGrow={1} flexShrink={1} width="100%">
      <MessageList messages={messages} isLoading={isLoading} routingInfo={routingInfo} />
    </Box>
  );
};
