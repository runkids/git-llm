import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import type { WorkflowType, WorkflowResult } from './types.js';
import type { RoutingInfo } from '../services/types.js';

import { GitStatusWorkflow } from './git/git-status-workflow.js';
import { GitDiffWorkflow } from './git/git-diff-workflow.js';
import { GitCommitWorkflow } from './git/git-commit-workflow.js';
import { GitBranchWorkflow } from './git/git-branch-workflow.js';
import { GitRemoteWorkflow } from './git/git-remote-workflow.js';
import { GitStashWorkflow } from './git/git-stash-workflow.js';
import { GitUndoWorkflow } from './git/git-undo-workflow.js';
import { CodeReviewWorkflow } from './code/code-review-workflow.js';
import { GeneralChatWorkflow } from './general/general-chat-workflow.js';

export class WorkflowRouter {
  private llm: ChatOpenAI;
  
  private gitStatusWorkflow: GitStatusWorkflow;
  private gitDiffWorkflow: GitDiffWorkflow;
  private gitCommitWorkflow: GitCommitWorkflow;
  private gitBranchWorkflow: GitBranchWorkflow;
  private gitRemoteWorkflow: GitRemoteWorkflow;
  private gitStashWorkflow: GitStashWorkflow;
  private gitUndoWorkflow: GitUndoWorkflow;
  private codeReviewWorkflow: CodeReviewWorkflow;
  private generalChatWorkflow: GeneralChatWorkflow;

  constructor(llm: ChatOpenAI) {
    this.llm = llm;
    
    this.gitStatusWorkflow = new GitStatusWorkflow(llm);
    this.gitDiffWorkflow = new GitDiffWorkflow(llm);
    this.gitCommitWorkflow = new GitCommitWorkflow(llm);
    this.gitBranchWorkflow = new GitBranchWorkflow(llm);
    this.gitRemoteWorkflow = new GitRemoteWorkflow(llm);
    this.gitStashWorkflow = new GitStashWorkflow(llm);
    this.gitUndoWorkflow = new GitUndoWorkflow(llm);
    this.codeReviewWorkflow = new CodeReviewWorkflow(llm);
    this.generalChatWorkflow = new GeneralChatWorkflow(llm);
  }

  /**
   * Analyze user input to determine which workflow to use
   */
  private async classifyWorkflowType(userInput: string): Promise<WorkflowType> {
    const prompt = `
    You are an intelligent workflow classifier for a Git-LLM assistant.
    
    Analyze the user's request and determine which workflow would be most appropriate:
    
    User input: "${userInput}"
    
    Available workflows:
    
    **git-analysis**: All Git operations and repository requests (with smart confirmation system)
    - Repository status, file changes, branch operations, remote operations, stash operations, commit operations
    - Any Git-related request including: status, diff, branch, stash, push, pull, merge, commit, etc.
    - Examples: "git status", "show changes", "help me stash", "create branch", "push changes", "help me commit", "commit my changes"
    
    **general-chat**: Non-Git/code questions (redirect to relevant topics)
    - Examples: Weather, cooking, general questions unrelated to development
    
    Instructions:
    - If it's related to Git, version control, or repository operations → git-analysis
    - If it's unrelated to development → general-chat
    
    Note: ALL Git operations (including commits) now use git-analysis for consistent confirmation behavior.
    
    Respond with ONLY: git-analysis or general-chat
    `;

    try {
      const response = await this.llm.invoke([new HumanMessage(prompt)]);
      const content = (response.content as string).toLowerCase().trim();
      
      if (content.includes('git-analysis')) return 'git-analysis';
      if (content.includes('general-chat')) return 'general-chat';
      
      if (content === 'git-analysis') return 'git-analysis';
      if (content === 'general-chat') return 'general-chat';
      
      if (content.includes('commit') || content.includes('提交') || content.includes('git') || 
          content.includes('stash') || content.includes('branch') || content.includes('status') || 
          content.includes('analysis') || content.includes('狀態')) {
        return 'git-analysis';
      }
      
      return 'git-analysis';
      
    } catch (error) {
      return 'git-analysis';
    }
  }

  /**
   * Determine specific Git operation type from user input
   */
  private async determineGitOperation(userInput: string): Promise<string> {
    const prompt = `Analyze the Git operation request and return ONLY the operation type:

User input: "${userInput}"

Return ONE of: status, diff, commit, branch, remote, stash, undo, review

Examples:
- "git status" → status
- "show changes" → diff  
- "commit my changes" → commit
- "create branch" → branch
- "push changes" → remote
- "stash my work" → stash
- "undo last commit" → undo
- "revert changes" → undo
- "review my code" → review

Return ONLY the operation type, no other text.`;

    try {
      const response = await this.llm.invoke([new HumanMessage(prompt)]);
      const content = (response.content as string).toLowerCase().trim();
      
      const validOperations = ['status', 'diff', 'commit', 'branch', 'remote', 'stash', 'undo', 'review'];
      const operation = validOperations.find(op => content.includes(op));
      
      return operation || 'status';
    } catch (error) {
      const lower = userInput.toLowerCase();
      if (lower.includes('undo') || lower.includes('revert') || lower.includes('rollback')) return 'undo';
      if (lower.includes('diff') || lower.includes('change')) return 'diff';
      if (lower.includes('commit')) return 'commit';
      if (lower.includes('branch')) return 'branch';
      if (lower.includes('push') || lower.includes('pull') || lower.includes('remote')) return 'remote';
      if (lower.includes('stash')) return 'stash';
      if (lower.includes('review') || lower.includes('analyze')) return 'review';
      return 'status';
    }
  }

  /**
   * Route user input to appropriate workflow and execute it
   */
  public async routeAndExecute(
    userInput: string, 
    onRoutingUpdate?: (info: RoutingInfo) => void,
    messageHistory?: any[]
  ): Promise<WorkflowResult & { workflowType: WorkflowType }> {
    
    if (messageHistory && this.isConfirmationResponse(userInput, messageHistory)) {
      return await this.handleConfirmationResponse(userInput, messageHistory, onRoutingUpdate);
    }
    
    if (onRoutingUpdate) {
      onRoutingUpdate({ currentStep: 'classifying' });
    }
    
    const workflowType = await this.classifyWorkflowType(userInput);
    
    if (onRoutingUpdate) {
      onRoutingUpdate({ workflowType, currentStep: 'executing' });
    }

    let result: WorkflowResult;

    switch (workflowType) {
      case 'git-analysis': {
        const gitOperation = await this.determineGitOperation(userInput);
        result = await this.executeGitWorkflow(gitOperation, userInput, onRoutingUpdate);
        break;
      }

      case 'general-chat':
        result = await this.generalChatWorkflow.executeWorkflow(userInput, onRoutingUpdate);
        break;

      default:
        result = await this.gitStatusWorkflow.executeWorkflow(userInput, onRoutingUpdate);
    }

    return {
      ...result,
      workflowType
    };
  }

  /**
   * Execute specific Git workflow based on operation type
   */
  private async executeGitWorkflow(
    operation: string, 
    userInput: string, 
    onRoutingUpdate?: (info: RoutingInfo) => void
  ): Promise<WorkflowResult> {
    switch (operation) {
      case 'diff':
        return await this.gitDiffWorkflow.executeWorkflow(userInput, onRoutingUpdate);
      case 'commit':
        return await this.gitCommitWorkflow.executeWorkflow(userInput, onRoutingUpdate);
      case 'branch':
        return await this.gitBranchWorkflow.executeWorkflow(userInput, onRoutingUpdate);
      case 'remote':
        return await this.gitRemoteWorkflow.executeWorkflow(userInput, onRoutingUpdate);
      case 'stash':
        return await this.gitStashWorkflow.executeWorkflow(userInput, onRoutingUpdate);
      case 'undo':
        return await this.gitUndoWorkflow.executeWorkflow(userInput, onRoutingUpdate);
      case 'review':
        return await this.codeReviewWorkflow.executeWorkflow(userInput, onRoutingUpdate);
      case 'status':
      default:
        return await this.gitStatusWorkflow.executeWorkflow(userInput, onRoutingUpdate);
    }
  }

  /**
   * Get available workflow types and their descriptions
   */
  public getAvailableWorkflows(): Array<{type: WorkflowType, description: string, examples: string[]}> {
    return [
      {
        type: 'git-analysis',
        description: 'Comprehensive Git operations with modular workflow system',
        examples: [
          'What\'s my git status?',
          'Show me what changed',
          'Help me commit my changes',
          'Create a new branch',
          'Push my changes',
          'Stash my work'
        ]
      },
      {
        type: 'general-chat',
        description: 'Guides users to ask Git and code-related questions (language-agnostic)',
        examples: [
          'Intelligently redirects off-topic questions',
          'Provides contextual suggestions based on user intent',
          'Works with any programming language or human language'
        ]
      }
    ];
  }

  /**
   * Check if user input is a confirmation response (y/n) to a previous request
   */
  private isConfirmationResponse(userInput: string, messageHistory?: any[]): boolean {
    if (!messageHistory || messageHistory.length < 2) return false;
    
    const response = userInput.toLowerCase().trim();
    const isYesNo = ['y', 'yes', 'n', 'no'].includes(response);
    
    if (!isYesNo) return false;
    
    // Check if the last assistant message was a confirmation request
    const lastAssistantMessage = messageHistory
      .filter(m => m.role === 'assistant')
      .pop();
    
    return lastAssistantMessage && 
           lastAssistantMessage.content.includes('Confirmation Required');
  }

  /**
   * Handle confirmation response and execute accordingly
   */
  private async handleConfirmationResponse(
    userInput: string, 
    messageHistory: any[], 
    onRoutingUpdate?: (info: RoutingInfo) => void
  ): Promise<WorkflowResult & { workflowType: WorkflowType }> {
    
    const response = userInput.toLowerCase().trim();
    
    // Find the original operation request
    const originalRequest = messageHistory
      .filter(m => m.role === 'user')
      .slice(-2)[0]; // Second to last user message
    
    if (!originalRequest) {
      return {
        response: 'Could not find the original operation request.',
        state: {
          messages: [],
          analysisResults: [],
          currentStep: 'error',
          userInput
        },
        workflowType: 'general-chat'
      };
    }
    
    // Execute or suggest based on response
    const prefixedInput = response === 'y' || response === 'yes' 
      ? `EXECUTE: ${originalRequest.content}`
      : `SUGGEST: ${originalRequest.content}`;
    
    // Determine operation and execute appropriate workflow
    const gitOperation = await this.determineGitOperation(originalRequest.content);
    const result = await this.executeGitWorkflow(gitOperation, prefixedInput, onRoutingUpdate);
    
    return { ...result, workflowType: 'git-analysis' };
  }
}