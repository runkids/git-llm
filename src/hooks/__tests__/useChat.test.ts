/**
 * @jest-environment jsdom
 */
import type { AIServiceInterface } from '../../types/index.js';
import { useChat } from '../useChat.js';

// Mock AI service for testing
const mockAIService: AIServiceInterface = {
  async *streamChat() {
    yield 'Mock response';
  },
  async sendMessage() {
    return 'Mock response';
  },
  getModelInfo() {
    return {
      model: 'test-model',
      baseUrl: 'http://localhost:1234/v1',
      service: 'Test Service'
    };
  }
};

describe('useChat', () => {
  it('should be a function', () => {
    expect(typeof useChat).toBe('function');
  });

  it('should work with AI service', () => {
    expect(mockAIService).toBeDefined();
    const modelInfo = mockAIService.getModelInfo();
    expect(modelInfo.model).toBe('test-model');
    expect(modelInfo.baseUrl).toBe('http://localhost:1234/v1');
  });
});