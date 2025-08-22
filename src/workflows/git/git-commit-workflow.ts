import { BaseWorkflow } from '../base/base-workflow.js';
import { ChatOpenAI } from '@langchain/openai';
import type { WorkflowResult } from '../types.js';
import type { RoutingInfo } from '../../services/types.js';
import { SmartCommitTool } from '../../tools/git/smart-commit-tool.js';

export class GitCommitWorkflow extends BaseWorkflow {
  private smartCommitTool: SmartCommitTool;

  constructor(llm: ChatOpenAI) {
    const smartCommitTool = new SmartCommitTool();
    super(llm, [smartCommitTool]);
    this.smartCommitTool = smartCommitTool;
  }

  async executeWorkflow(
    userInput: string, 
    onRoutingUpdate?: (info: RoutingInfo) => void
  ): Promise<WorkflowResult> {
    const { isExecuteMode, isSuggestMode, actualInput } = this.parseExecutionMode(userInput);
    
    try {
      if (onRoutingUpdate) {
        onRoutingUpdate({ currentStep: 'preparing_commit' });
      }

      let result: string;
      let actions: string[];

      if (isSuggestMode) {
        result = `Smart Commit Instructions:\n\nTo commit your changes manually:\n\n1. Stage all changes:\n   git add .\n\n2. Check what will be committed:\n   git status\n\n3. Create commit with message:\n   git commit -m "your descriptive message"\n\n4. Or let Git-LLM do it automatically:\n   Just say "yes" to let me handle staging, message generation, and committing!`;
        actions = ['Execute smart commit', 'Stage manually', 'Cancel'];
      } else if (isExecuteMode) {
        if (onRoutingUpdate) {
          onRoutingUpdate({ currentStep: 'executing_commit' });
        }
        result = await this.smartCommitTool.func("");
        actions = ['View commit', 'Push changes', 'Create branch'];
      } else {
        // Regular mode - ask for confirmation  
        result = `**Operation:** Smart Commit\n**Description:** This will automatically stage all changes (git add .), generate an intelligent commit message, and create the commit.`;
        actions = ['Confirm commit', 'Get instructions', 'Cancel'];
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
        'commit workflow'
      );
    }
  }
}