import React from 'react';
import { Box, Text } from 'ink';
import type { LoadingSpinnerProps } from '../../types/index.js';

const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = 'Loading...' 
}) => {
  const [frame, setFrame] = React.useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setFrame(prev => (prev + 1) % spinnerFrames.length);
    }, 100);

    return () => clearInterval(timer);
  }, []);


  return (
    <Box flexDirection="row" alignItems="center">
      <Text color="cyan">{spinnerFrames[frame]}</Text>
      <Box paddingLeft={1}>
        <Text color="gray" dimColor>
          {message}
        </Text>
      </Box>
    </Box>
  );
};