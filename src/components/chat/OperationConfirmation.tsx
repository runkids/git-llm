import React from 'react';
import { Box } from 'ink';
import { GitOperationSelector } from '../GitOperationSelector.js';
import type { ConfirmationState } from '../../types/index.js';

interface OperationConfirmationProps {
  confirmation: ConfirmationState;
  onSelect: (confirmed: boolean) => void;
  onCancel?: () => void;
}

export const OperationConfirmation: React.FC<OperationConfirmationProps> = ({
  confirmation,
  onSelect,
  onCancel
}) => {
  return (
    <Box flexShrink={0} flexGrow={0} width="100%">
      <GitOperationSelector
        operation={confirmation.operation}
        description={confirmation.description}
        onSelect={onSelect}
        onCancel={onCancel}
      />
    </Box>
  );
};