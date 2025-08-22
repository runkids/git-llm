import { useState, useCallback } from 'react';
import type { ConfirmationState } from '../types/index.js';

export interface UseOperationConfirmationReturn {
  pendingConfirmation: ConfirmationState | null;
  requestConfirmation: (operation: string, description: string, request: string) => void;
  handleConfirmation: (confirmed: boolean) => void;
  handleCancel: () => void;
  clearConfirmation: () => void;
}

export const useOperationConfirmation = (
  onConfirm: (confirmed: boolean, request: string) => void
): UseOperationConfirmationReturn => {
  const [pendingConfirmation, setPendingConfirmation] = useState<ConfirmationState | null>(null);

  const requestConfirmation = useCallback((operation: string, description: string, request: string) => {
    setPendingConfirmation({
      operation,
      description,
      request
    });
  }, []);

  const handleConfirmation = useCallback((confirmed: boolean) => {
    if (!pendingConfirmation) return;
    
    const { request } = pendingConfirmation;
    setPendingConfirmation(null);
    onConfirm(confirmed, request);
  }, [pendingConfirmation, onConfirm]);

  const handleCancel = useCallback(() => {
    setPendingConfirmation(null);
    // 不調用 onConfirm，直接清除確認狀態
  }, []);

  const clearConfirmation = useCallback(() => {
    setPendingConfirmation(null);
  }, []);

  return {
    pendingConfirmation,
    requestConfirmation,
    handleConfirmation,
    handleCancel,
    clearConfirmation
  };
};