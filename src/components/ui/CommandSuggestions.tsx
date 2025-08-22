import React from 'react';
import { Box, Text } from 'ink';
import type { CommandSuggestion } from '../../types/commands.js';

interface CommandSuggestionsProps {
  suggestions: CommandSuggestion[];
  selectedIndex: number;
  visible: boolean;
}

export const CommandSuggestions: React.FC<CommandSuggestionsProps> = ({
  suggestions,
  selectedIndex,
  visible
}) => {
  if (!visible || suggestions.length === 0) {
    return null;
  }

  // 使用2欄顯示，指令數量已經減少
  const columns = 2;
  const itemsPerColumn = Math.ceil(suggestions.length / columns);
  
  return (
    <Box 
      flexDirection="column" 
      borderStyle="single" 
      borderColor="cyan"
      paddingX={1}
      paddingY={0}
      marginBottom={1}
    >
      <Box marginBottom={0}>
        <Text color="cyan" bold>Git Commands ({suggestions.length}):</Text>
      </Box>
      
      <Box>
        {/* First Column */}
        <Box flexDirection="column" width="50%" marginRight={2}>
          {suggestions.slice(0, itemsPerColumn).map((suggestion, index) => (
            <Box key={suggestion.command}>
              <Text 
                color={index === selectedIndex ? 'white' : 'cyan'}
                bold={index === selectedIndex}
                inverse={index === selectedIndex}
              >
                {suggestion.command.padEnd(12)}
              </Text>
              <Text 
                color="gray"
                dimColor
              >
                {suggestion.description}
              </Text>
            </Box>
          ))}
        </Box>
        
        {/* Second Column */}
        <Box flexDirection="column" width="50%">
          {suggestions.slice(itemsPerColumn).map((suggestion, index) => {
            const actualIndex = itemsPerColumn + index;
            return (
              <Box key={suggestion.command}>
                <Text 
                  color={actualIndex === selectedIndex ? 'white' : 'cyan'}
                  bold={actualIndex === selectedIndex}
                  inverse={actualIndex === selectedIndex}
                >
                  {suggestion.command.padEnd(12)}
                </Text>
                <Text 
                  color="gray"
                  dimColor
                >
                  {suggestion.description}
                </Text>
              </Box>
            );
          })}
        </Box>
      </Box>
      
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          Use ↑↓ to navigate, Tab/Enter to select
        </Text>
      </Box>
    </Box>
  );
};