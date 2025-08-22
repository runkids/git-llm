/**
 * @jest-environment jsdom
 */
import type { AIServiceInterface } from '../../../types/index.js';
import { ChatInterface } from '../ChatInterface.js';

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

describe('ChatInterface', () => {
  it('should be a React component', () => {
    expect(typeof ChatInterface).toBe('function');
  });

  it('should work with AI service', () => {
    const modelInfo = mockAIService.getModelInfo();
    expect(modelInfo.model).toBe('test-model');
    expect(modelInfo.baseUrl).toBe('http://localhost:1234/v1');
  });
});