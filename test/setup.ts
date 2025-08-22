// Test setup file
// Add global test utilities or configuration here
global.console = {
  ...global.console,
  // Suppress console logs during tests
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};