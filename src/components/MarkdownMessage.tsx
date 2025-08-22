import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';

interface MarkdownMessageProps {
  content: string;
  role: 'user' | 'assistant' | 'system';
}

// Configure marked with terminal renderer using legacy API
marked.setOptions({
  renderer: new TerminalRenderer() as any, // Type assertion to bypass type issue
});

export const MarkdownMessage = React.memo<MarkdownMessageProps>(({ content, role }) => {
  const formattedContent = useMemo(() => {
    if (role === 'user') {
      // User messages don't need markdown formatting
      return content;
    }

    // Assistant messages get markdown formatting
    try {
      const parsed = marked.parse(content);
      if (typeof parsed === 'string') {
        return parsed.trim();
      }
      return content; // If async, fallback to original
    } catch (error) {
      console.error('Markdown parsing error:', error);
      return content; // Fallback to original content
    }
  }, [content, role]);

  return (
    <Box paddingLeft={2} marginBottom={1} width="100%">
      <Text wrap="wrap">{formattedContent}</Text>
    </Box>
  );
});

MarkdownMessage.displayName = 'MarkdownMessage';
