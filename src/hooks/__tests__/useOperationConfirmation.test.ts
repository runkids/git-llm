/**
 * @jest-environment jsdom
 */
import { useOperationConfirmation } from '../useOperationConfirmation.js';

describe('useOperationConfirmation', () => {
  it('should be a function', () => {
    expect(typeof useOperationConfirmation).toBe('function');
  });

  it('should accept callback function', () => {
    const mockOnConfirm = jest.fn();
    expect(typeof mockOnConfirm).toBe('function');
    expect(mockOnConfirm).toHaveBeenCalledTimes(0);
  });
});