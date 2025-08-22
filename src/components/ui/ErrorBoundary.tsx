import React from 'react';
import { Box, Text } from 'ink';
import type { ErrorBoundaryProps } from '../../types/index.js';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

const DefaultErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <Box flexDirection="column" padding={1}>
    <Text color="red" bold>
      Something went wrong:
    </Text>
    <Text color="red">
      {error.message}
    </Text>
    <Text color="gray" dimColor>
      Please check the console for more details.
    </Text>
  </Box>
);

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error} />;
    }

    return this.props.children;
  }
}