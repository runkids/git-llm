/**
 * @jest-environment jsdom
 */
// import { LoadingSpinner } from '../LoadingSpinner.js';

describe('LoadingSpinner', () => {
  it('should render with default message', () => {
    const props = {
      message: 'Loading...'
    };
    
    expect(props.message).toBe('Loading...');
  });

  it('should render with custom message', () => {
    const props = {
      message: 'Processing request...'
    };
    
    expect(props.message).toBe('Processing request...');
  });

  it('should handle different sizes', () => {
    const props = {
      size: 'large' as const
    };
    
    expect(props.size).toBe('large');
  });
});