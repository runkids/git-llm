import { BaseWorkflow } from '../base/base-workflow.js';
import { ChatOpenAI } from '@langchain/openai';
import type { WorkflowResult } from '../types.js';
import type { RoutingInfo } from '../../services/types.js';
import { GitRemoteTool } from '../../tools/git/git-remote-tool.js';

export class GitRemoteWorkflow extends BaseWorkflow {
  private gitRemoteTool: GitRemoteTool;

  constructor(llm: ChatOpenAI) {
    const gitRemoteTool = new GitRemoteTool();
    super(llm, [gitRemoteTool]);
    this.gitRemoteTool = gitRemoteTool;
  }

  async executeWorkflow(
    userInput: string, 
    onRoutingUpdate?: (info: RoutingInfo) => void
  ): Promise<WorkflowResult> {
    const { isExecuteMode, isSuggestMode, actualInput } = this.parseExecutionMode(userInput);
    
    try {
      if (onRoutingUpdate) {
        onRoutingUpdate({ currentStep: 'analyzing_remote_operation' });
      }

      const operation = this.extractRemoteOperation(actualInput);
      
      let result: string;
      let actions: string[];

      if (isSuggestMode) {
        result = this.getRemoteInstructions(operation);
        actions = ['Execute operation', 'Learn more', 'Cancel'];
      } else if (isExecuteMode || operation === 'status') {
        // Execute immediately for status operations or when explicitly requested
        if (onRoutingUpdate) {
          onRoutingUpdate({ currentStep: 'executing_remote_operation' });
        }
        
        result = await this.gitRemoteTool.func(operation);
        actions = this.getActionsForOperation(operation);
      } else {
        // Ask for confirmation for destructive operations
        const description = this.getOperationDescription(operation);
        result = `**Operation:** ${description.name}\n**Description:** ${description.description}`;
        actions = ['Confirm operation', 'Get instructions', 'Cancel'];
      }

      if (onRoutingUpdate) {
        onRoutingUpdate({ currentStep: 'completed' });
      }

      return {
        response: result,
        state: {
          messages: [],
          analysisResults: [{
            type: 'git',
            content: result,
            confidence: 1.0,
            actions
          }],
          currentStep: 'completed',
          userInput: actualInput
        }
      };
    } catch (error) {
      return this.handleWorkflowError(
        error instanceof Error ? error : new Error('Unknown error'),
        'remote workflow'
      );
    }
  }

  private extractRemoteOperation(userInput: string): string {
    const lower = userInput.toLowerCase();
    
    if (lower.includes('push')) return 'push';
    if (lower.includes('pull')) return 'pull';
    if (lower.includes('fetch')) return 'fetch';
    
    return 'status';
  }

  private getRemoteInstructions(operation: string): string {
    const baseInstructions = `Git Remote Instructions:\n\nCommon remote operations:\n\n`;
    
    switch (operation) {
      case 'push':
        return baseInstructions + `1. Push current branch:\n   git push\n\n2. Push specific branch:\n   git push origin <branch-name>\n\n3. Push and set upstream:\n   git push -u origin <branch-name>`;
      case 'pull':
        return baseInstructions + `1. Pull current branch:\n   git pull\n\n2. Pull specific branch:\n   git pull origin <branch-name>\n\n3. Pull with rebase:\n   git pull --rebase`;
      case 'fetch':
        return baseInstructions + `1. Fetch all remotes:\n   git fetch\n\n2. Fetch specific remote:\n   git fetch origin\n\n3. Fetch and prune:\n   git fetch --prune`;
      default:
        return baseInstructions + `1. View remotes:\n   git remote -v\n\n2. Push changes:\n   git push\n\n3. Pull updates:\n   git pull\n\n4. Fetch updates:\n   git fetch`;
    }
  }

  private getOperationDescription(operation: string): { name: string; description: string } {
    switch (operation) {
      case 'push':
        return {
          name: 'Git Push',
          description: 'This will upload your commits to the remote repository.'
        };
      case 'pull':
        return {
          name: 'Git Pull',
          description: 'This will download and merge changes from remote.'
        };
      case 'fetch':
        return {
          name: 'Git Fetch',
          description: 'This will download updates from remote without merging.'
        };
      default:
        return {
          name: 'Remote Status',
          description: 'This will show remote repository information (read-only operation).'
        };
    }
  }

  private getActionsForOperation(operation: string): string[] {
    switch (operation) {
      case 'push':
        return ['View status', 'Create PR', 'Switch branch'];
      case 'pull':
        return ['View changes', 'Merge conflicts', 'Push changes'];
      case 'fetch':
        return ['View status', 'Pull changes', 'Switch branch'];
      default:
        return ['Push changes', 'Pull updates', 'Fetch remote'];
    }
  }
}