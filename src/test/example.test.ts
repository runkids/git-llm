// Test file for commit
export function testFunction() {
  return 'test';
}

describe('Example Test', () => {
  it('should pass', () => {
    expect(testFunction()).toBe('test');
  });
});
