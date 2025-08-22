export interface BaseComponentProps {
  children?: React.ReactNode;
  className?: string;
}

export interface ButtonProps extends BaseComponentProps {
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error }>;
}

export interface GitOperationSelectorProps {
  operation: string;
  description: string;
  onSelect: (confirmed: boolean, request: string) => void;
}

export interface MessageListProps {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  isLoading: boolean;
}

export interface InputBoxProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}