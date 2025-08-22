import { Box, Text } from 'ink';
import React from 'react';

import { useAIService, useAppVersion } from '../hooks/index.js';
import { ChatInterface } from './chat/index.js';
import { ErrorBoundary } from './ui/index.js';

const App: React.FC = () => {
  const { llmService, error, isInitializing } = useAIService();
  const version = useAppVersion();

  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red">Error: {error}</Text>
        <Text color="gray">
          Make sure LM-Studio is running and check your configuration:
        </Text>
        <Text color="gray">- GIT_LLM_BASE_URL (default: http://localhost:1234/v1)</Text>
        <Text color="gray">- GIT_LLM_MODEL (default: openai/gpt-oss-20b)</Text>
      </Box>
    );
  }

  if (isInitializing || !llmService) {
    return <Text>Initializing LangGraph service...</Text>;
  }

  return (
    <ErrorBoundary>
      <Box flexDirection="column" height="100%">
        <Box paddingX={1} paddingY={1}>
          <Text color="cyan" bold>
            Git-LLM - v{version}
          </Text>
        </Box>
        <Box paddingX={1} marginTop={1}>
          <Text color="gray" dimColor>
            Model: {llmService.getModelInfo().model} | Endpoint: {llmService.getModelInfo().baseUrl}
          </Text>
        </Box>
        <Box flexGrow={1}>
          <ChatInterface llmService={llmService} />
        </Box>
      </Box>
    </ErrorBoundary>
  );
};

export default App;
