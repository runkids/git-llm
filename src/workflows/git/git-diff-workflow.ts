import { BaseWorkflow } from '../base/base-workflow.js';
import { ChatOpenAI } from '@langchain/openai';
import type { WorkflowResult } from '../types.js';
import type { RoutingInfo } from '../../services/types.js';
import { GitDiffTool } from '../../tools/git/git-diff-tool.js';

export class GitDiffWorkflow extends BaseWorkflow {
  private gitDiffTool: GitDiffTool;

  constructor(llm: ChatOpenAI) {
    const gitDiffTool = new GitDiffTool();
    super(llm, [gitDiffTool]);
    this.gitDiffTool = gitDiffTool;
  }

  async executeWorkflow(
    userInput: string, 
    onRoutingUpdate?: (info: RoutingInfo) => void
  ): Promise<WorkflowResult> {
    const { actualInput } = this.parseExecutionMode(userInput);
    
    try {
      if (onRoutingUpdate) {
        onRoutingUpdate({ currentStep: 'analyzing_changes' });
      }

      // Get git diff
      const diffResult = await this.gitDiffTool.func("");
      
      if (onRoutingUpdate) {
        onRoutingUpdate({ currentStep: 'completed' });
      }

      const hasChanges = diffResult && diffResult.trim().length > 0;
      const displayResult = hasChanges 
        ? `📝 **Changes Found:**\n\n\`\`\`diff\n${diffResult}\n\`\`\``
        : `✅ **No Changes:** Your working directory is clean with no uncommitted changes.`;

      return {
        response: displayResult,
        state: {
          messages: [],
          analysisResults: [{
            type: 'git',
            content: displayResult,
            confidence: 1.0,
            actions: hasChanges ? ['Review changes', 'Stage files', 'Commit changes'] : ['Create new changes', 'Pull latest', 'Switch branch']
          }],
          currentStep: 'completed',
          userInput: actualInput
        }
      };
    } catch (error) {
      return this.handleWorkflowError(
        error instanceof Error ? error : new Error('Unknown error'),
        'git diff analysis'
      );
    }
  }
}