import { Box, Text, useInput } from 'ink';
import React from 'react';

interface InputBoxProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const InputBox: React.FC<InputBoxProps> = ({
  value,
  onChange,
  onSubmit,
  disabled = false,
}) => {

  useInput((input, key) => {
    if (key.return) {
      if (key.shift) {
        onChange(value + '\n');
      } else if (value.trim()) {
        onSubmit(value);
      }
    } else if (key.escape) {
      onChange('');
    } else if (key.backspace || key.delete) {
      if (value.length > 0) {
        onChange(value.slice(0, -1));
      }
    } else if (input && !key.ctrl && !key.meta) {
      onChange(value + input);
    }
  }, { isActive: !disabled });

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1} width="100%">
      <Box width="100%">
        <Text color="blue">{'> '}</Text>
        <Text wrap="wrap">{value}</Text>
        {!disabled && <Text color="gray">│</Text>}
      </Box>
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          {disabled
            ? 'Waiting for response...'
            : 'Press Enter to send, Shift+Enter for new line, Esc to clear'}
        </Text>
      </Box>
    </Box>
  );
};
