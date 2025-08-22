import { BaseWorkflow } from '../base/base-workflow.js';
import { ChatOpenAI } from '@langchain/openai';
import type { WorkflowResult } from '../types.js';
import type { RoutingInfo } from '../../services/types.js';
import { GitUndoTool } from '../../tools/git/git-undo-tool.js';

export class GitUndoWorkflow extends BaseWorkflow {
  private gitUndoTool: GitUndoTool;

  constructor(llm: ChatOpenAI) {
    const gitUndoTool = new GitUndoTool();
    super(llm, [gitUndoTool]);
    this.gitUndoTool = gitUndoTool;
  }

  async executeWorkflow(
    userInput: string, 
    onRoutingUpdate?: (info: RoutingInfo) => void
  ): Promise<WorkflowResult> {
    const { isExecuteMode, isSuggestMode, actualInput } = this.parseExecutionMode(userInput);
    
    try {
      if (onRoutingUpdate) {
        onRoutingUpdate({ currentStep: 'analyzing_undo_request' });
      }

      const operation = this.extractUndoOperation(actualInput);
      
      let result: string;
      let actions: string[];

      if (isSuggestMode) {
        result = this.getUndoInstructions(operation);
        actions = ['Execute undo', 'Learn more', 'Cancel'];
      } else if (isExecuteMode) {
        if (onRoutingUpdate) {
          onRoutingUpdate({ currentStep: 'executing_undo_operation' });
        }
        
        result = await this.gitUndoTool.func(operation);
        actions = this.getActionsForOperation(operation);
      } else {
        // Analyze and provide options without confirmation for undo operations
        if (onRoutingUpdate) {
          onRoutingUpdate({ currentStep: 'analyzing_undo_options' });
        }
        
        result = await this.gitUndoTool.func(operation);
        actions = ['Execute suggested command', 'Show alternatives', 'Cancel'];
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
        'undo workflow'
      );
    }
  }

  private extractUndoOperation(userInput: string): string {
    const lower = userInput.toLowerCase();
    
    // English patterns
    if (lower.includes('undo') || lower.includes('revert') || lower.includes('rollback')) {
      if (lower.includes('last commit') || lower.includes('recent commit')) return 'last commit';
      if (lower.includes('merge')) return 'merge';
      if (lower.includes('push')) return 'push';
      if (lower.includes('change')) return 'uncommitted changes';
    }
    
    // Default to last commit
    return 'last commit';
  }

  private getUndoInstructions(operation: string): string {
    const baseInstructions = `Git Undo Instructions:\n\n`;
    
    switch (operation) {
      case 'last commit':
        return baseInstructions + `**Undo Last Commit:**\n\n1. Keep changes staged:\n   \`git reset --soft HEAD~1\`\n\n2. Keep changes unstaged:\n   \`git reset --mixed HEAD~1\`\n\n3. Discard changes completely:\n   \`git reset --hard HEAD~1\`\n\n**Choose --soft to edit and re-commit.**`;
      
      case 'uncommitted changes':
        return baseInstructions + `**Undo Uncommitted Changes:**\n\n1. Stash changes (reversible):\n   \`git stash\`\n\n2. Discard all changes:\n   \`git reset --hard HEAD\`\n\n3. Discard specific file:\n   \`git checkout HEAD -- <file>\``;
      
      case 'merge':
        return baseInstructions + `**Undo Merge:**\n\n1. Revert merge commit:\n   \`git revert -m 1 HEAD\`\n\n2. Reset to before merge:\n   \`git reset --hard HEAD~1\`\n\n**Use revert for shared repositories.**`;
      
      case 'push':
        return baseInstructions + `**Undo Pushed Changes:**\n\n1. Create revert commit (safe):\n   \`git revert HEAD\`\n   \`git push\`\n\n2. Force push reset (dangerous):\n   \`git reset --hard HEAD~1\`\n   \`git push --force-with-lease\`\n\n**Always prefer revert for shared repos.**`;
      
      default:
        return baseInstructions + `**Common Undo Operations:**\n\n• Undo last commit: \`git reset --soft HEAD~1\`\n• Undo changes: \`git stash\`\n• Undo merge: \`git revert -m 1 HEAD\`\n• Undo push: \`git revert HEAD && git push\``;
    }
  }

  private getActionsForOperation(operation: string): string[] {
    switch (operation) {
      case 'last commit':
        return ['View status', 'Re-commit changes', 'Create new branch'];
      case 'uncommitted changes':
        return ['View stash', 'Continue working', 'Check status'];
      case 'merge':
        return ['View branches', 'Create new merge', 'Check conflicts'];
      case 'push':
        return ['View remote status', 'Create new commit', 'Check history'];
      default:
        return ['View status', 'Check history', 'Continue working'];
    }
  }
}