import type { Command, CommandContext, CommandResult, CommandSuggestion } from '../types/commands.js';

export class CommandService {
  private commands = new Map<string, Command>();

  constructor() {
    this.registerBuiltInCommands();
  }

  registerCommand(command: Command): void {
    this.commands.set(command.name, command);
    
    // Register aliases
    if (command.aliases) {
      command.aliases.forEach(alias => {
        this.commands.set(alias, command);
      });
    }
  }

  async executeCommand(input: string, context: CommandContext): Promise<CommandResult> {
    const parsed = this.parseCommand(input);
    if (!parsed) {
      return { type: 'error', message: 'Invalid command format' };
    }

    const { command, args } = parsed;
    const commandHandler = this.commands.get(command);
    
    if (!commandHandler) {
      return { type: 'error', message: `Unknown command: /${command}` };
    }

    try {
      return await commandHandler.handler(args, context);
    } catch (error) {
      return { 
        type: 'error', 
        message: `Command failed: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  getSuggestions(input: string): CommandSuggestion[] {
    if (!input.startsWith('/')) {
      return [];
    }

    const query = input.slice(1).toLowerCase();
    const suggestions: CommandSuggestion[] = [];
    const seen = new Set<string>();

    for (const [, command] of this.commands) {
      // Skip aliases for the same command
      if (seen.has(command.name)) continue;
      seen.add(command.name);

      const match = !query || command.name.toLowerCase().includes(query);
      suggestions.push({
        command: `/${command.name}`,
        description: command.description,
        match
      });
    }

    return suggestions
      .filter(s => s.match)
      .sort((a, b) => a.command.localeCompare(b.command));
  }

  isCommand(input: string): boolean {
    return input.trim().startsWith('/');
  }

  private parseCommand(input: string): { command: string; args: string[] } | null {
    const trimmed = input.trim();
    if (!trimmed.startsWith('/')) {
      return null;
    }

    const parts = trimmed.slice(1).split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1);

    return { command: command.toLowerCase(), args };
  }

  private registerBuiltInCommands(): void {
    // Git Status - uses GitStatusTool
    this.registerCommand({
      name: 'status',
      description: 'Analyze git repository status',
      handler: async () => {
        return { type: 'info', message: 'Show me the current git status with analysis' };
      }
    });

    // Git Diff - uses GitDiffTool  
    this.registerCommand({
      name: 'diff',
      description: 'Analyze current changes',
      handler: async () => {
        return { type: 'info', message: 'Show me what has changed and analyze the differences' };
      }
    });

    // Smart Commit - uses SmartCommitTool
    this.registerCommand({
      name: 'commit',
      description: 'Smart commit with auto-generated message',
      handler: async (args) => {
        const userHint = args.length > 0 ? ` about: ${args.join(' ')}` : '';
        return { type: 'info', message: `Create a smart commit${userHint}` };
      }
    });

    // Git Branch - uses GitBranchTool
    this.registerCommand({
      name: 'branch',
      description: 'Manage git branches',
      handler: async (args) => {
        if (args.length === 0) {
          return { type: 'info', message: 'Show me all branches and their status' };
        } else {
          return { type: 'info', message: `Help me work with branch: ${args[0]}` };
        }
      }
    });

    // Git Stash - uses GitStashTool
    this.registerCommand({
      name: 'stash',
      description: 'Manage git stash',
      handler: async (args) => {
        const action = args[0] || 'list';
        return { type: 'info', message: `Help me with git stash ${action}` };
      }
    });

    // Git Remote - uses GitRemoteTool
    this.registerCommand({
      name: 'remote',
      description: 'Manage remote repositories',
      handler: async () => {
        return { type: 'info', message: 'Show me remote repositories and their status' };
      }
    });

    // Code Review - uses CodeReviewTool
    this.registerCommand({
      name: 'review',
      description: 'Perform intelligent code review',
      handler: async () => {
        return { type: 'info', message: 'Please review my code changes and provide feedback' };
      }
    });

    // Git Undo/Revert - intelligent undo operations
    this.registerCommand({
      name: 'undo',
      description: 'Undo last Git operation',
      aliases: ['revert', 'rollback'],
      handler: async (args) => {
        const operation = args.length > 0 ? args.join(' ') : 'last commit';
        return { type: 'info', message: `Help me undo or revert: ${operation}` };
      }
    });

    // Clear command
    this.registerCommand({
      name: 'clear',
      description: 'Clear conversation history',
      handler: async (_, context) => {
        if (context.clearMessages) {
          context.clearMessages();
        }
        return { type: 'success', message: 'Conversation cleared' };
      }
    });

    // Help command
    this.registerCommand({
      name: 'help',
      description: 'Show available commands',
      handler: async () => {
        const commands = Array.from(this.commands.values())
          .filter((cmd, index, array) => array.findIndex(c => c.name === cmd.name) === index)
          .sort((a, b) => a.name.localeCompare(b.name));

        const helpText = commands
          .map(cmd => `/${cmd.name.padEnd(12)} ${cmd.description}`)
          .join('\n');

        return { 
          type: 'info', 
          message: `Available commands:\n\n${helpText}\n\nThese commands use real tools and workflows for intelligent Git operations.` 
        };
      }
    });
  }
}