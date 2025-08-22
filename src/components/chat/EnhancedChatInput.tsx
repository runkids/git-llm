import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { CommandService } from '../../services/CommandService.js';
import { CommandSuggestions } from '../ui/CommandSuggestions.js';
import type { CommandContext, CommandSuggestion } from '../../types/commands.js';

interface EnhancedChatInputProps {
  onSendMessage: (message: string) => void;
  onCommand?: (result: any, originalCommand?: string) => void;
  disabled?: boolean;
  placeholder?: string;
  commandContext?: CommandContext;
}

export const EnhancedChatInput: React.FC<EnhancedChatInputProps> = ({
  onSendMessage,
  onCommand,
  disabled = false,
  commandContext = {}
}) => {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<CommandSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [commandService] = useState(() => new CommandService());

  const updateSuggestions = useCallback((value: string) => {
    if (value.startsWith('/')) {
      const newSuggestions = commandService.getSuggestions(value);
      setSuggestions(newSuggestions);
      setShowSuggestions(newSuggestions.length > 0);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  }, [commandService]);

  // 監聽input變化並立即更新建議
  useEffect(() => {
    updateSuggestions(input);
  }, [input, updateSuggestions]);

  const handleSubmit = useCallback(async (content: string) => {
    if (!content.trim() || disabled) return;
    
    const originalContent = content.trim();
    setShowSuggestions(false);
    setInput('');

    if (commandService.isCommand(originalContent)) {
      try {
        const result = await commandService.executeCommand(originalContent, commandContext);
        if (onCommand) {
          // Pass both the result and the original command for display
          onCommand(result, originalContent);
        }
      } catch (error) {
        if (onCommand) {
          onCommand({ type: 'error', message: `Command failed: ${error}` });
        }
      }
    } else {
      // For normal messages, show the user input
      onSendMessage(originalContent);
    }
  }, [onSendMessage, onCommand, disabled, commandService, commandContext]);

  const selectSuggestion = useCallback(() => {
    if (showSuggestions && suggestions[selectedIndex]) {
      const command = suggestions[selectedIndex].command;
      setInput(command + ' ');
      setShowSuggestions(false);
    }
  }, [showSuggestions, suggestions, selectedIndex]);

  useInput((inputChar, key) => {
    if (disabled) return;

    if (key.return) {
      if (showSuggestions && suggestions.length > 0) {
        selectSuggestion();
      } else if (key.shift) {
        // Shift+Enter for new line
        setInput(prev => prev + '\n');
      } else if (input.trim()) {
        // Enter to submit
        handleSubmit(input);
      }
    } else if (key.escape) {
      if (showSuggestions) {
        setShowSuggestions(false);
      } else {
        setInput('');
      }
    } else if (key.upArrow && showSuggestions) {
      setSelectedIndex(prev => 
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (key.downArrow && showSuggestions) {
      setSelectedIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (key.tab && showSuggestions) {
      selectSuggestion();
    } else if (key.backspace || key.delete) {
      if (input.length > 0) {
        const newValue = input.slice(0, -1);
        setInput(newValue);
      }
    } else if (inputChar && !key.ctrl && !key.meta) {
      // Regular character input
      const newValue = input + inputChar;
      setInput(newValue);
    }
  }, { isActive: !disabled });

  return (
    <Box flexDirection="column" width="100%">
      <CommandSuggestions 
        suggestions={suggestions}
        selectedIndex={selectedIndex}
        visible={showSuggestions}
      />
      
      <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1} width="100%">
        <Box width="100%">
          <Text color="blue">{'> '}</Text>
          <Text wrap="wrap">{input}</Text>
          {!disabled && <Text color="gray">│</Text>}
        </Box>
        <Box marginTop={1}>
          <Text color="gray" dimColor>
            {disabled
              ? 'Waiting for response...'
              : showSuggestions 
                ? 'Use ↑↓ to navigate, Tab/Enter to select, Esc to close'
                : 'Press Enter to send, "/" for commands, Shift+Enter for new line, Esc to clear'
            }
          </Text>
        </Box>
      </Box>
    </Box>
  );
};