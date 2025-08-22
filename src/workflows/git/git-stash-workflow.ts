import { BaseWorkflow } from '../base/base-workflow.js';
import { ChatOpenAI } from '@langchain/openai';
import type { WorkflowResult } from '../types.js';
import type { RoutingInfo } from '../../services/types.js';
import { GitStashTool } from '../../tools/git/git-stash-tool.js';

export class GitStashWorkflow extends BaseWorkflow {
  private gitStashTool: GitStashTool;

  constructor(llm: ChatOpenAI) {
    const gitStashTool = new GitStashTool();
    super(llm, [gitStashTool]);
    this.gitStashTool = gitStashTool;
  }

  async executeWorkflow(
    userInput: string, 
    onRoutingUpdate?: (info: RoutingInfo) => void
  ): Promise<WorkflowResult> {
    const { isExecuteMode, isSuggestMode, actualInput } = this.parseExecutionMode(userInput);
    
    try {
      if (onRoutingUpdate) {
        onRoutingUpdate({ currentStep: 'analyzing_stash_operation' });
      }

      const operation = this.extractStashOperation(actualInput);
      
      let result: string;
      let actions: string[];

      if (isSuggestMode) {
        result = this.getStashInstructions(operation);
        actions = ['Execute operation', 'Learn more', 'Cancel'];
      } else if (isExecuteMode || this.isReadOnlyOperation(operation)) {
        // Execute immediately for read-only operations or when explicitly requested
        if (onRoutingUpdate) {
          onRoutingUpdate({ currentStep: 'executing_stash_operation' });
        }
        
        result = await this.gitStashTool.func(operation);
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
        'stash workflow'
      );
    }
  }

  private extractStashOperation(userInput: string): string {
    const lower = userInput.toLowerCase();
    
    if (lower.includes('save') || lower.includes('stash changes')) {
      // Extract message if provided
      const match = lower.match(/(?:save|stash)\s+"([^"]+)"/);
      return match ? `save ${match[1]}` : 'save';
    }
    
    if (lower.includes('pop')) return 'pop';
    if (lower.includes('apply')) return 'apply';
    if (lower.includes('drop')) return 'drop';
    if (lower.includes('clear')) return 'clear';
    if (lower.includes('list')) return 'list';
    
    return 'save'; // Default to save for stash operations
  }

  private isReadOnlyOperation(operation: string): boolean {
    return operation === 'list' || operation.startsWith('show');
  }

  private getStashInstructions(operation: string): string {
    const baseInstructions = `Git Stash Instructions:\n\nTo manually stash your changes:\n\n`;
    
    switch (operation.split(' ')[0]) {
      case 'save':
        return baseInstructions + `1. Save current changes:\n   git stash\n\n2. Save with message:\n   git stash push -m "your message"\n\n3. Save specific files:\n   git stash push -m "message" -- <file1> <file2>`;
      case 'pop':
        return baseInstructions + `1. Restore latest stash:\n   git stash pop\n\n2. Restore specific stash:\n   git stash pop stash@{0}\n\n3. Restore without removing:\n   git stash apply stash@{0}`;
      case 'apply':
        return baseInstructions + `1. Apply latest stash:\n   git stash apply\n\n2. Apply specific stash:\n   git stash apply stash@{0}\n\n3. Apply to different branch:\n   git stash branch <new-branch> stash@{0}`;
      case 'drop':
        return baseInstructions + `1. Delete latest stash:\n   git stash drop\n\n2. Delete specific stash:\n   git stash drop stash@{0}\n\n3. Delete all stashes:\n   git stash clear`;
      case 'list':
        return baseInstructions + `1. View stashes:\n   git stash list\n\n2. View stash content:\n   git stash show\n\n3. View detailed diff:\n   git stash show -p stash@{0}`;
      default:
        return baseInstructions + `1. Save current changes:\n   git stash\n\n2. View stashes:\n   git stash list\n\n3. Restore stash:\n   git stash pop\n\n4. Delete stash:\n   git stash drop stash@{0}`;
    }
  }

  private getOperationDescription(operation: string): { name: string; description: string } {
    const baseOp = operation.split(' ')[0];
    
    switch (baseOp) {
      case 'save':
        return {
          name: 'Git Stash Save',
          description: 'This will temporarily save your current changes and clean your working directory.'
        };
      case 'pop':
        return {
          name: 'Git Stash Pop',
          description: 'This will restore the most recent stash and remove it from the stash list.'
        };
      case 'apply':
        return {
          name: 'Git Stash Apply',
          description: 'This will restore a stash without removing it from the stash list.'
        };
      case 'drop':
        return {
          name: 'Git Stash Drop',
          description: 'This will permanently delete a stash (cannot be undone).'
        };
      case 'clear':
        return {
          name: 'Git Stash Clear',
          description: 'This will permanently delete all stashes (cannot be undone).'
        };
      default:
        return {
          name: 'List Stashes',
          description: 'This will show all saved stashes (read-only operation).'
        };
    }
  }

  private getActionsForOperation(operation: string): string[] {
    const baseOp = operation.split(' ')[0];
    
    switch (baseOp) {
      case 'save':
        return ['View stashes', 'Apply stash', 'Continue work'];
      case 'pop':
      case 'apply':
        return ['View status', 'Commit changes', 'Stash again'];
      case 'drop':
      case 'clear':
        return ['View remaining stashes', 'Create new stash', 'Continue work'];
      default:
        return ['Save stash', 'Apply stash', 'Drop stash'];
    }
  }
}