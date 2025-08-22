import { BaseWorkflow } from '../base/base-workflow.js';
import { ChatOpenAI } from '@langchain/openai';
import type { WorkflowResult } from '../types.js';
import type { RoutingInfo } from '../../services/types.js';
import { CodeReviewTool } from '../../tools/code/code-review-tool.js';

export class CodeReviewWorkflow extends BaseWorkflow {
  private codeReviewTool: CodeReviewTool;

  constructor(llm: ChatOpenAI) {
    const codeReviewTool = new CodeReviewTool();
    super(llm, [codeReviewTool]);
    this.codeReviewTool = codeReviewTool;
  }

  async executeWorkflow(
    userInput: string, 
    onRoutingUpdate?: (info: RoutingInfo) => void
  ): Promise<WorkflowResult> {
    const { isExecuteMode, isSuggestMode, actualInput } = this.parseExecutionMode(userInput);
    
    try {
      if (onRoutingUpdate) {
        onRoutingUpdate({ currentStep: 'analyzing_code' });
      }

      let result: string;
      let actions: string[];

      if (isSuggestMode) {
        result = this.getCodeReviewInstructions();
        actions = ['Execute review', 'Learn more', 'Cancel'];
      } else if (isExecuteMode) {
        if (onRoutingUpdate) {
          onRoutingUpdate({ currentStep: 'executing_code_review' });
        }
        
        result = await this.codeReviewTool.func("");
        actions = ['Fix issues', 'Run linter', 'Commit changes'];
      } else {
        // Ask for confirmation
        result = `**Operation:** Code Review\n**Description:** This will analyze your code quality and suggest improvements.`;
        actions = ['Confirm review', 'Get instructions', 'Cancel'];
      }

      if (onRoutingUpdate) {
        onRoutingUpdate({ currentStep: 'completed' });
      }

      return {
        response: result,
        state: {
          messages: [],
          analysisResults: [{
            type: 'code',
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
        'code review workflow'
      );
    }
  }

  private getCodeReviewInstructions(): string {
    return `Code Review Instructions:\n\nTo manually review your code:\n\n1. Check modified files:\n   git status\n\n2. View changes:\n   git diff\n\n3. Review specific file:\n   git diff <filename>\n\n4. Use linting tools:\n   npm run lint (if available)\n   npm run typecheck (if available)\n\n5. Run tests:\n   npm test (if available)\n\n6. Check code quality:\n   - Look for code smells\n   - Check for security issues\n   - Verify error handling\n   - Review performance implications`;
  }
}