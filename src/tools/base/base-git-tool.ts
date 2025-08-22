import { DynamicTool } from '@langchain/core/tools';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export abstract class BaseGitTool extends DynamicTool {
  constructor(name: string, description: string, func: (input?: string) => Promise<string>) {
    super({ name, description, func });
  }

  /**
   * Check if current directory is a Git repository
   */
  protected isGitRepository(cwd: string = process.cwd()): boolean {
    return fs.existsSync(path.join(cwd, '.git'));
  }

  /**
   * Execute Git command with error handling
   */
  protected executeGitCommand(command: string, cwd: string = process.cwd()): string {
    try {
      return execSync(command, { 
        encoding: 'utf-8', 
        cwd,
        maxBuffer: 1024 * 1024 // 1MB buffer
      });
    } catch (error) {
      throw new Error(`Git command failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute Git command with safe error handling that returns empty string on failure
   */
  protected safeExecuteGitCommand(command: string, cwd: string = process.cwd()): string {
    try {
      return this.executeGitCommand(command, cwd);
    } catch {
      return '';
    }
  }

  /**
   * Validate that we're in a Git repository before executing commands
   */
  protected validateGitRepository(cwd: string = process.cwd()): void {
    if (!this.isGitRepository(cwd)) {
      throw new Error('Not in a git repository');
    }
  }

  /**
   * Parse Git status porcelain output
   */
  protected parseGitStatus(statusOutput: string): {
    staged: Array<{ file: string; status: string; type: string }>;
    unstaged: Array<{ file: string; status: string; type: string }>;
    untracked: string[];
    total: number;
  } {
    const staged: Array<{ file: string; status: string; type: string }> = [];
    const unstaged: Array<{ file: string; status: string; type: string }> = [];
    const untracked: string[] = [];

    const lines = statusOutput.split('\n').filter(line => line.trim());
    
    lines.forEach(line => {
      const stagingArea = line[0];
      const workingTree = line[1];
      const fileName = line.slice(3);

      if (stagingArea === '?') {
        untracked.push(fileName);
      } else {
        if (stagingArea !== ' ' && stagingArea !== '?') {
          staged.push({
            file: fileName,
            status: stagingArea,
            type: this.getStatusType(stagingArea)
          });
        }
        if (workingTree !== ' ' && workingTree !== '?') {
          unstaged.push({
            file: fileName,
            status: workingTree,
            type: this.getStatusType(workingTree)
          });
        }
      }
    });

    return {
      staged,
      unstaged,
      untracked,
      total: lines.length
    };
  }

  /**
   * Get human-readable status type
   */
  protected getStatusType(status: string): string {
    const types: Record<string, string> = {
      'M': 'modified',
      'A': 'added',
      'D': 'deleted',
      'R': 'renamed',
      'C': 'copied',
      'U': 'unmerged',
      'T': 'typechange',
    };
    return types[status] || 'unknown';
  }

  /**
   * Get current working directory
   */
  protected getCwd(): string {
    return process.cwd();
  }

  /**
   * Format error response as JSON
   */
  protected formatError(message: string): string {
    return JSON.stringify({ error: message });
  }

  /**
   * Format success response as JSON
   */
  protected formatSuccess(data: any): string {
    return JSON.stringify(data, null, 2);
  }
}