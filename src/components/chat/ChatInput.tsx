import React, { useState, useCallback } from 'react';
import { Box } from 'ink';
import { InputBox } from '../InputBox.js';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = 'Type your message...'
}) => {
  const [input, setInput] = useState('');

  const handleSubmit = useCallback((content: string) => {
    if (!content.trim() || disabled) return;
    
    onSendMessage(content);
    setInput('');
  }, [onSendMessage, disabled]);

  return (
    <Box flexShrink={0} flexGrow={0} width="100%">
      <InputBox
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        disabled={disabled}
        placeholder={placeholder}
      />
    </Box>
  );
};