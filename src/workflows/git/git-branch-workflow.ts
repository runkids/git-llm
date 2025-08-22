import { BaseWorkflow } from '../base/base-workflow.js';
import { ChatOpenAI } from '@langchain/openai';
import type { WorkflowResult } from '../types.js';
import type { RoutingInfo } from '../../services/types.js';
import { GitBranchTool } from '../../tools/git/git-branch-tool.js';

interface BranchOperation {
  action: 'list' | 'create' | 'switch' | 'delete' | 'merge';
  target?: string;
}

export class GitBranchWorkflow extends BaseWorkflow {
  private gitBranchTool: GitBranchTool;

  constructor(llm: ChatOpenAI) {
    const gitBranchTool = new GitBranchTool();
    super(llm, [gitBranchTool]);
    this.gitBranchTool = gitBranchTool;
  }

  async executeWorkflow(
    userInput: string, 
    onRoutingUpdate?: (info: RoutingInfo) => void
  ): Promise<WorkflowResult> {
    const { isExecuteMode, isSuggestMode, actualInput } = this.parseExecutionMode(userInput);
    
    try {
      if (onRoutingUpdate) {
        onRoutingUpdate({ currentStep: 'analyzing_branch_operation' });
      }

      // Parse branch operation
      const operation = await this.parseBranchOperation(actualInput);
      
      let result: string;
      let actions: string[];

      if (isSuggestMode) {
        result = this.getBranchInstructions(operation);
        actions = ['Execute operation', 'Learn more', 'Cancel'];
      } else if (isExecuteMode || operation.action === 'list') {
        // Execute immediately for list operations or when explicitly requested
        if (onRoutingUpdate) {
          onRoutingUpdate({ currentStep: 'executing_branch_operation' });
        }
        
        const branchInput = this.formatBranchInput(operation);
        result = await this.gitBranchTool.func(branchInput);
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
        'branch workflow'
      );
    }
  }

  private async parseBranchOperation(userInput: string): Promise<BranchOperation> {
    const prompt = `Analyze the Git branch operation request and return ONLY a JSON object:

{
  "action": "list|create|switch|delete|merge",
  "target": "branch_name_if_specified"
}

User input: "${userInput}"

Examples:
- "list branches" → {"action": "list"}
- "create branch feature" → {"action": "create", "target": "feature"}
- "switch to main" → {"action": "switch", "target": "main"}
- "delete old-branch" → {"action": "delete", "target": "old-branch"}

Return ONLY the JSON object.`;

    try {
      const response = await this.invokeLLM(prompt);
      const parsed = JSON.parse(response.trim());
      return {
        action: parsed.action || 'list',
        target: parsed.target || undefined
      };
    } catch {
      // Fallback to simple text parsing
      return this.fallbackParseBranchOperation(userInput);
    }
  }

  private fallbackParseBranchOperation(userInput: string): BranchOperation {
    const lower = userInput.toLowerCase();
    
    if (lower.includes('create') || lower.includes('new')) {
      const match = lower.match(/(?:create|new)\s+(?:branch\s+)?([\w-]+)/);
      return { action: 'create', target: match?.[1] };
    }
    
    if (lower.includes('switch') || lower.includes('checkout')) {
      const match = lower.match(/(?:switch|checkout)\s+(?:to\s+)?([\w-]+)/);
      return { action: 'switch', target: match?.[1] };
    }
    
    if (lower.includes('delete') || lower.includes('remove')) {
      const match = lower.match(/(?:delete|remove)\s+(?:branch\s+)?([\w-]+)/);
      return { action: 'delete', target: match?.[1] };
    }
    
    if (lower.includes('merge')) {
      const match = lower.match(/merge\s+([\w-]+)/);
      return { action: 'merge', target: match?.[1] };
    }
    
    return { action: 'list' };
  }

  private formatBranchInput(operation: BranchOperation): string {
    switch (operation.action) {
      case 'create':
        return operation.target ? `create ${operation.target}` : 'list';
      case 'switch':
        return operation.target ? `switch ${operation.target}` : 'list';
      case 'delete':
        return operation.target ? `delete ${operation.target}` : 'list';
      case 'merge':
        return operation.target ? `merge ${operation.target}` : 'list';
      default:
        return 'list';
    }
  }

  private getBranchInstructions(operation: BranchOperation): string {
    const baseInstructions = `Git Branch Instructions:\n\nCommon branch operations:\n\n`;
    
    switch (operation.action) {
      case 'create':
        return baseInstructions + `1. Create new branch:\n   git checkout -b ${operation.target || '<branch-name>'}\n\n2. Create and switch:\n   git switch -c ${operation.target || '<branch-name>'}`;
      case 'switch':
        return baseInstructions + `1. Switch to branch:\n   git checkout ${operation.target || '<branch-name>'}\n\n2. Or use switch:\n   git switch ${operation.target || '<branch-name>'}`;
      case 'delete':
        return baseInstructions + `1. Delete branch:\n   git branch -d ${operation.target || '<branch-name>'}\n\n2. Force delete:\n   git branch -D ${operation.target || '<branch-name>'}`;
      case 'merge':
        return baseInstructions + `1. Merge branch:\n   git merge ${operation.target || '<branch-name>'}\n\n2. No fast-forward:\n   git merge --no-ff ${operation.target || '<branch-name>'}`;
      default:
        return baseInstructions + `1. List branches:\n   git branch\n\n2. List all branches:\n   git branch -a\n\n3. Create new branch:\n   git checkout -b <branch-name>\n\n4. Switch branch:\n   git checkout <branch-name>`;
    }
  }

  private getOperationDescription(operation: BranchOperation): { name: string; description: string } {
    switch (operation.action) {
      case 'create':
        return {
          name: 'Create Branch',
          description: `This will create a new Git branch "${operation.target}" and switch to it.`
        };
      case 'switch':
        return {
          name: 'Switch Branch',
          description: `This will switch to the "${operation.target}" branch.`
        };
      case 'delete':
        return {
          name: 'Delete Branch',
          description: `This will delete the "${operation.target}" branch (potentially destructive).`
        };
      case 'merge':
        return {
          name: 'Merge Branch',
          description: `This will merge the "${operation.target}" branch into the current branch.`
        };
      default:
        return {
          name: 'List Branches',
          description: 'This will show all available branches (read-only operation).'
        };
    }
  }

  private getActionsForOperation(operation: BranchOperation): string[] {
    switch (operation.action) {
      case 'create':
        return ['Switch to branch', 'Push branch', 'List branches'];
      case 'switch':
        return ['View status', 'Create new branch', 'Merge branch'];
      case 'delete':
        return ['List branches', 'Create new branch', 'Switch branch'];
      case 'merge':
        return ['View status', 'Push changes', 'Create branch'];
      default:
        return ['Create branch', 'Switch branch', 'Delete branch'];
    }
  }
}