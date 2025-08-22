import { BaseWorkflow } from '../base/base-workflow.js';
import { ChatOpenAI } from '@langchain/openai';
import type { WorkflowResult } from '../types.js';
import type { RoutingInfo } from '../../services/types.js';

export class GeneralChatWorkflow extends BaseWorkflow {
  constructor(llm: ChatOpenAI) {
    super(llm, []);
  }

  async executeWorkflow(
    userInput: string, 
    onRoutingUpdate?: (info: RoutingInfo) => void
  ): Promise<WorkflowResult> {
    const { actualInput } = this.parseExecutionMode(userInput);
    
    try {
      if (onRoutingUpdate) {
        onRoutingUpdate({ currentStep: 'redirecting_to_git_topics' });
      }

      const response = `Hi! I'm Git-LLM, your intelligent Git and code assistant.

I notice your question "${actualInput}" doesn't seem to be related to Git or code development.

I specialize in:

🔧 **Git Operations:**
- Repository status and branch information
- File changes and differences
- Commit assistance and message generation
- Branch management and Git workflows

📋 **Code Review:**
- Code quality analysis
- File and function review
- Bug detection and suggestions
- Best practice recommendations

🚀 **Development Assistance:**
- Repository analysis
- Change tracking
- Staging and commit workflows
- Git history exploration

Please ask me something related to Git version control or code review, and I'll provide intelligent assistance with my advanced workflow system!

*I work with any programming language and can understand requests in multiple languages.*`;

      if (onRoutingUpdate) {
        onRoutingUpdate({ currentStep: 'completed' });
      }

      return {
        response,
        state: {
          messages: [],
          analysisResults: [{
            type: 'suggestion',
            content: 'Guided user to ask Git/code related questions',
            confidence: 1.0
          }],
          currentStep: 'completed',
          userInput: actualInput,
          workflowType: 'general'
        }
      };
    } catch (error) {
      return this.handleWorkflowError(
        error instanceof Error ? error : new Error('Unknown error'),
        'general chat workflow'
      );
    }
  }
}