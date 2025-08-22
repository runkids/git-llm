import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface GitOperationSelectorProps {
  operation: string;
  description: string;
  onSelect: (confirmed: boolean) => void;
  onCancel?: () => void;
}

export const GitOperationSelector: React.FC<GitOperationSelectorProps> = ({
  operation,
  description,
  onSelect,
  onCancel,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const options = [
    { 
      label: '✅ Yes - Execute the operation', 
      value: true, 
      color: 'green',
      description: 'This will run the actual Git command'
    },
    { 
      label: '📚 No - Show me how to do it manually', 
      value: false, 
      color: 'yellow',
      description: 'This will show step-by-step instructions'
    },
    { 
      label: '❌ Cancel - Go back to input', 
      value: 'cancel', 
      color: 'red',
      description: 'Cancel this operation and return to the input prompt'
    },
  ];

  useInput((input, key) => {
    if (key.upArrow || input === 'k') {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    } else if (key.downArrow || input === 'j') {
      setSelectedIndex(Math.min(options.length - 1, selectedIndex + 1));
    } else if (key.return) {
      const selectedOption = options[selectedIndex];
      if (selectedOption.value === 'cancel') {
        onCancel?.();
      } else {
        onSelect(selectedOption.value as boolean);
      }
    } else if (key.escape) {
      onCancel?.();
    } else if (input === 'y' || input === 'Y') {
      onSelect(true);
    } else if (input === 'n' || input === 'N') {
      onSelect(false);
    } else if (input === 'c' || input === 'C') {
      onCancel?.();
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1} marginY={1}>
      {/* Header */}
      <Box flexDirection="column" marginBottom={1}>
        <Text color="cyan" bold>
          ⚠️  Git Operation Confirmation
        </Text>
        <Text color="white">
          Operation: {operation}
        </Text>
        <Text color="gray" wrap="wrap">
          {description}
        </Text>
      </Box>

      {/* Options */}
      <Box flexDirection="column">
        {options.map((option, index) => (
          <Box key={index} marginY={0}>
            <Box width={3}>
              <Text color={selectedIndex === index ? 'cyan' : 'gray'}>
                {selectedIndex === index ? '→ ' : '  '}
              </Text>
            </Box>
            <Box flexDirection="column" flexGrow={1}>
              <Text color={selectedIndex === index ? option.color : 'gray'}>
                {option.label}
              </Text>
              {selectedIndex === index && (
                <Text color="gray" dimColor>
                  {option.description}
                </Text>
              )}
            </Box>
          </Box>
        ))}
      </Box>

      {/* Instructions */}
      <Box marginTop={1} borderTop borderColor="gray" paddingTop={1}>
        <Text color="gray" dimColor>
          Use ↑↓ or j/k to navigate, Enter to select, Y/N for direct choice, or Esc/C to cancel
        </Text>
      </Box>
    </Box>
  );
};