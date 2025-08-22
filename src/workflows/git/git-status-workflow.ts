import { BaseWorkflow } from '../base/base-workflow.js';
import { ChatOpenAI } from '@langchain/openai';
import type { WorkflowResult } from '../types.js';
import type { RoutingInfo } from '../../services/types.js';
import { GitStatusTool } from '../../tools/git/git-status-tool.js';

export class GitStatusWorkflow extends BaseWorkflow {
  private gitStatusTool: GitStatusTool;

  constructor(llm: ChatOpenAI) {
    const gitStatusTool = new GitStatusTool();
    super(llm, [gitStatusTool]);
    this.gitStatusTool = gitStatusTool;
  }

  async executeWorkflow(
    userInput: string, 
    onRoutingUpdate?: (info: RoutingInfo) => void
  ): Promise<WorkflowResult> {
    const { actualInput } = this.parseExecutionMode(userInput);
    
    try {
      if (onRoutingUpdate) {
        onRoutingUpdate({ currentStep: 'analyzing_git_status' });
      }

      // Get git status
      const statusResult = await this.gitStatusTool.func("");
      
      let formattedResult: string;
      try {
        const gitStatus = JSON.parse(statusResult);
        if (gitStatus.error) {
          formattedResult = `❌ ${gitStatus.error}`;
        } else {
          formattedResult = this.formatGitStatus(gitStatus);
        }
      } catch {
        formattedResult = `Git Status Analysis:\n${statusResult}`;
      }

      if (onRoutingUpdate) {
        onRoutingUpdate({ currentStep: 'completed' });
      }

      return {
        response: formattedResult,
        state: {
          messages: [],
          analysisResults: [{
            type: 'git',
            content: formattedResult,
            confidence: 1.0,
            actions: ['View changes', 'Commit changes', 'Create branch']
          }],
          currentStep: 'completed',
          userInput: actualInput
        }
      };
    } catch (error) {
      return this.handleWorkflowError(
        error instanceof Error ? error : new Error('Unknown error'),
        'git status analysis'
      );
    }
  }

  /**
   * Format Git status JSON into user-friendly display
   */
  private formatGitStatus(gitStatus: any): string {
    let result = `📊 **Git Repository Status**\n\n`;
    
    // Current branch
    result += `🌿 **Current Branch:** ${gitStatus.branch}\n`;
    
    // Working directory
    result += `📁 **Directory:** ${gitStatus.workingDirectory}\n\n`;
    
    // Changes status
    if (gitStatus.hasUncommittedChanges) {
      result += `⚠️  **Status:** You have uncommitted changes\n\n`;
      
      // Parse and display file changes
      if (gitStatus.status) {
        const changes = this.parseGitStatus(gitStatus.status);
        if (changes.length > 0) {
          result += `**📝 File Changes:**\n`;
          for (const change of changes) {
            const icon = this.getStatusIcon(change.status);
            result += `${icon} ${change.file}\n`;
          }
          result += `\n`;
        }
      }
    } else {
      result += `✅ **Status:** Working directory is clean\n\n`;
    }
    
    // Recent commits
    if (gitStatus.recentCommits && gitStatus.recentCommits.length > 0) {
      result += `**📚 Recent Commits:**\n`;
      gitStatus.recentCommits.slice(0, 3).forEach((commit: string) => {
        result += `• ${commit}\n`;
      });
    }
    
    return result;
  }

  /**
   * Parse git status --porcelain output
   */
  private parseGitStatus(statusOutput: string): Array<{status: string, file: string}> {
    if (!statusOutput.trim()) return [];
    
    return statusOutput.split('\n')
      .filter(line => line.trim())
      .map(line => ({
        status: line.substring(0, 2),
        file: line.substring(3)
      }));
  }

  /**
   * Get appropriate icon for file status
   */
  private getStatusIcon(status: string): string {
    const first = status[0];
    const second = status[1];
    
    if (first === 'A') return '🆕'; // Added
    if (first === 'M') return '✏️'; // Modified
    if (first === 'D') return '🗑️'; // Deleted
    if (first === 'R') return '📝'; // Renamed
    if (first === 'C') return '📋'; // Copied
    if (first === '?') return '❓'; // Untracked
    if (first === ' ' && second === 'M') return '✏️'; // Modified (unstaged)
    if (first === ' ' && second === 'D') return '🗑️'; // Deleted (unstaged)
    
    return '📄'; // Default
  }
}