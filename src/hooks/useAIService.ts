import { useState, useEffect } from 'react';
import type { AIServiceInterface } from '../types/index.js';
import { MultiLLMService } from '../services/multi-llm-service.js';

export interface UseAIServiceReturn {
  llmService: AIServiceInterface | null;
  error: string | null;
  isInitializing: boolean;
}

export const useAIService = (): UseAIServiceReturn => {
  const [llmService, setLlmService] = useState<AIServiceInterface | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeService = async () => {
      try {
        const service = new MultiLLMService();
        setLlmService(service);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize Multi-LLM service');
        setLlmService(null);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeService();
  }, []);

  return {
    llmService,
    error,
    isInitializing
  };
};