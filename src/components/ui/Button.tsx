import React from 'react';
import { Box, Text } from 'ink';
import type { ButtonProps } from '../../types/index.js';

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  disabled = false, 
  variant = 'primary' 
}) => {
  const getColorForVariant = () => {
    if (disabled) return 'gray';
    
    switch (variant) {
      case 'primary':
        return 'cyan';
      case 'secondary':
        return 'white';
      case 'danger':
        return 'red';
      default:
        return 'white';
    }
  };

  const getBgColorForVariant = () => {
    if (disabled) return undefined;
    
    switch (variant) {
      case 'primary':
        return 'blueBright';
      case 'danger':
        return 'redBright';
      default:
        return undefined;
    }
  };

  return (
    <Box
      borderStyle="round"
      borderColor={getColorForVariant()}
      paddingX={1}
    >
      <Text 
        color={getColorForVariant()}
        backgroundColor={getBgColorForVariant()}
        dimColor={disabled}
      >
        {children}
      </Text>
    </Box>
  );
};