import React from 'react';
import { Box, Text } from 'ink';

export const Logo: React.FC = () => (
  <Box flexDirection="column" alignItems="center" paddingBottom={1}>
    <Text color="cyan" bold>
      ╭─────────────────────────────────╮
    </Text>
    <Text color="cyan" bold>
      │  🤖 Git-LLM - AI Git Assistant  │
    </Text>
    <Text color="cyan" bold>
      ╰─────────────────────────────────╯
    </Text>
  </Box>
);