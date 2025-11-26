import { BaseWorkflow } from '../base/base-workflow.js';
import { ChatOpenAI } from '@langchain/openai';
import type { WorkflowResult } from '../types.js';
import type { RoutingInfo } from '../../services/types.js';
import { GitActionsTool } from '../../tools/git/git-actions-tool.js';

export class GitActionsWorkflow extends BaseWorkflow {
  private gitActionsTool: GitActionsTool;

  constructor(llm: ChatOpenAI) {
    const gitActionsTool = new GitActionsTool();
    super(llm, [gitActionsTool]);
    this.gitActionsTool = gitActionsTool;
  }

  async executeWorkflow(
    userInput: string,
    onRoutingUpdate?: (info: RoutingInfo) => void
  ): Promise<WorkflowResult> {
    const { isExecuteMode, isSuggestMode, actualInput } = this.parseExecutionMode(userInput);

    try {
      if (onRoutingUpdate) {
        onRoutingUpdate({ currentStep: 'parsing_action' });
      }

      // Extract action from user input
      const action = this.extractAction(actualInput);

      let result: string;
      let actions: string[];

      if (isSuggestMode) {
        // Show help and available actions
        result = await this.gitActionsTool.func('');
        actions = ['Execute action', 'Show examples', 'Cancel'];
      } else if (isExecuteMode || action) {
        if (onRoutingUpdate) {
          onRoutingUpdate({ currentStep: 'executing_action' });
        }

        result = await this.gitActionsTool.func(action);
        actions = this.suggestNextActions(action, result);
      } else {
        // Show help by default
        result = await this.gitActionsTool.func('');
        actions = ['Quick save', 'Quick push', 'Show status', 'Create feature branch'];
      }

      if (onRoutingUpdate) {
        onRoutingUpdate({ currentStep: 'completed' });
      }

      return {
        response: result,
        state: {
          messages: [],
          analysisResults: [
            {
              type: 'git',
              content: result,
              confidence: 1.0,
              actions,
            },
          ],
          currentStep: 'completed',
          userInput: actualInput,
        },
      };
    } catch (error) {
      return this.handleWorkflowError(
        error instanceof Error ? error : new Error('Unknown error'),
        'git actions workflow'
      );
    }
  }

  /**
   * Extract the git action from user input
   */
  private extractAction(input: string): string {
    const lowerInput = input.toLowerCase();

    // Direct action mappings
    const actionMappings: Record<string, string> = {
      // Quick operations
      'quick save': 'quick-save',
      'quick-save': 'quick-save',
      'qs': 'quick-save',
      'quick push': 'quick-push',
      'quick-push': 'quick-push',
      'qp': 'quick-push',
      'wip': 'wip',
      'work in progress': 'wip',

      // Sync
      'sync': 'sync',
      'sync rebase': 'sync-rebase',
      'sync-rebase': 'sync-rebase',
      'pull': 'pull',
      'push': 'push',
      'fetch': 'fetch',

      // Branch workflows
      'finish': 'finish',
      'finish branch': 'finish',
      'update': 'update',
      'update branch': 'update',

      // History
      'history': 'history',
      'log': 'log',
      'last': 'last',
      'last commit': 'last',
      'contributors': 'contributors',

      // Undo
      'undo': 'undo',
      'undo last commit': 'undo',
      'unstage': 'unstage',
      'discard': 'discard',
      'oops': 'oops',

      // Cleanup
      'clean': 'clean',
      'clean branches': 'clean-branches',
      'clean-branches': 'clean-branches',
      'prune': 'prune',
      'gc': 'gc',
      'garbage collect': 'gc',

      // Tags
      'tags': 'tags',
      'list tags': 'tags',

      // Info
      'info': 'info',
      'whoami': 'whoami',
      'who am i': 'whoami',
      'remote': 'remote',
      'remotes': 'remote',
    };

    // Check for direct matches first
    for (const [key, value] of Object.entries(actionMappings)) {
      if (lowerInput === key || lowerInput.startsWith(key + ' ')) {
        return input.toLowerCase().replace(key, value);
      }
    }

    // Pattern matching for parameterized commands
    if (lowerInput.includes('feature') || lowerInput.includes('feat ')) {
      const match = input.match(/(?:feature|feat)\s+(.+)/i);
      if (match) return `feature ${match[1]}`;
    }

    if (lowerInput.includes('hotfix') || lowerInput.includes('fix ')) {
      const match = input.match(/(?:hotfix|fix)\s+(.+)/i);
      if (match) return `hotfix ${match[1]}`;
    }

    if (lowerInput.includes('release')) {
      const match = input.match(/release\s+(.+)/i);
      if (match) return `release ${match[1]}`;
    }

    if (lowerInput.includes('save')) {
      const match = input.match(/save\s+(.+)/i);
      if (match) return `save ${match[1]}`;
    }

    if (lowerInput.includes('tag ')) {
      const match = input.match(/tag\s+(.+)/i);
      if (match) return `tag ${match[1]}`;
    }

    if (lowerInput.includes('blame')) {
      const match = input.match(/blame\s+(.+)/i);
      if (match) return `blame ${match[1]}`;
    }

    if (lowerInput.includes('show')) {
      const match = input.match(/show\s+(.+)/i);
      if (match) return `show ${match[1]}`;
    }

    if (lowerInput.includes('search')) {
      const match = input.match(/search\s+(.+)/i);
      if (match) return `search ${match[1]}`;
    }

    if (lowerInput.includes('cherry-pick') || lowerInput.includes('cherry pick')) {
      const match = input.match(/cherry[- ]?pick\s+(.+)/i);
      if (match) return `cherry-pick ${match[1]}`;
    }

    if (lowerInput.includes('squash')) {
      const match = input.match(/squash\s+(\d+)/i);
      if (match) return `squash ${match[1]}`;
    }

    if (lowerInput.includes('history') || lowerInput.includes('log')) {
      const match = input.match(/(?:history|log)\s+(\d+)/i);
      if (match) return `history ${match[1]}`;
    }

    // Return original input as fallback
    return input;
  }

  /**
   * Suggest next actions based on the completed action
   */
  private suggestNextActions(action: string, result: string): string[] {
    const lowerAction = action.toLowerCase();

    if (lowerAction.includes('quick-save') || lowerAction.includes('save') || lowerAction.includes('wip')) {
      return ['Push changes', 'View status', 'Create branch'];
    }

    if (lowerAction.includes('quick-push') || lowerAction.includes('push')) {
      return ['View history', 'Create PR', 'View status'];
    }

    if (lowerAction.includes('feature') || lowerAction.includes('hotfix') || lowerAction.includes('release')) {
      return ['View status', 'Quick save', 'Push branch'];
    }

    if (lowerAction.includes('finish')) {
      return ['Push changes', 'Clean branches', 'Create tag'];
    }

    if (lowerAction.includes('sync') || lowerAction.includes('pull')) {
      return ['View status', 'View history', 'Quick save'];
    }

    if (lowerAction.includes('undo')) {
      return ['View status', 'Discard changes', 'Save again'];
    }

    if (lowerAction.includes('history') || lowerAction.includes('log')) {
      return ['Show commit', 'Search commits', 'View blame'];
    }

    if (lowerAction.includes('clean')) {
      return ['View status', 'Prune remotes', 'GC'];
    }

    // Default suggestions
    return ['Quick save', 'View status', 'View history', 'Create branch'];
  }
}
