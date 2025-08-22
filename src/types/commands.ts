export interface Command {
  name: string;
  description: string;
  aliases?: string[];
  handler: (args: string[], context: CommandContext) => Promise<CommandResult> | CommandResult;
}

export interface CommandContext {
  clearMessages?: () => void;
  sendMessage?: (message: string) => void;
  setConfig?: (key: string, value: string) => void;
  getConfig?: (key: string) => string | undefined;
}

export interface CommandResult {
  type: 'success' | 'error' | 'info';
  message?: string;
  data?: any;
}

export interface CommandSuggestion {
  command: string;
  description: string;
  match: boolean;
}