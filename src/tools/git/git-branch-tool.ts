import { BaseGitTool } from '../base/base-git-tool.js';

export class GitBranchTool extends BaseGitTool {
  constructor() {
    super(
      'git_branch',
      'Manage Git branches: list, create, switch, delete, and get branch info',
      async (operation?: string) => {
        try {
          const cwd = this.getCwd();
          this.validateGitRepository(cwd);

          // Default operation is to list branches
          if (!operation || operation.trim() === '') {
            operation = 'list';
          }

          const op = operation.toLowerCase().trim();

          if (op === 'list' || op === 'ls') {
            // List all branches
            const branches = this.executeGitCommand('git branch -a', cwd).trim();
            const currentBranch = this.executeGitCommand('git branch --show-current', cwd).trim();
            
            return `Current branch: ${currentBranch}\n\nAll branches:\n${branches}`;
          }
          
          if (op.startsWith('create ') || op.startsWith('new ')) {
            // Create new branch: "create feature-branch" or "new feature-branch"
            const branchName = op.split(' ').slice(1).join(' ');
            if (!branchName) {
              return 'Error: Branch name required. Usage: "create <branch-name>"';
            }
            
            this.executeGitCommand(`git checkout -b "${branchName}"`, cwd);
            return `Created and switched to new branch: ${branchName}`;
          }
          
          if (op.startsWith('switch ') || op.startsWith('checkout ')) {
            // Switch to branch: "switch main" or "checkout feature-branch"
            const branchName = op.split(' ').slice(1).join(' ');
            if (!branchName) {
              return 'Error: Branch name required. Usage: "switch <branch-name>"';
            }
            
            this.executeGitCommand(`git checkout "${branchName}"`, cwd);
            return `Switched to branch: ${branchName}`;
          }
          
          if (op.startsWith('delete ') || op.startsWith('remove ')) {
            // Delete branch: "delete feature-branch"
            const branchName = op.split(' ').slice(1).join(' ');
            if (!branchName) {
              return 'Error: Branch name required. Usage: "delete <branch-name>"';
            }
            
            const currentBranch = this.executeGitCommand('git branch --show-current', cwd).trim();
            if (branchName === currentBranch) {
              return `Error: Cannot delete current branch "${branchName}". Switch to another branch first.`;
            }
            
            this.executeGitCommand(`git branch -d "${branchName}"`, cwd);
            return `Deleted branch: ${branchName}`;
          }
          
          if (op.startsWith('merge ')) {
            // Merge branch: "merge feature-branch"
            const branchName = op.split(' ').slice(1).join(' ');
            if (!branchName) {
              return 'Error: Branch name required. Usage: "merge <branch-name>"';
            }
            
            const result = this.executeGitCommand(`git merge "${branchName}"`, cwd);
            return `Merged branch "${branchName}":\n${result}`;
          }
          
          // Default: show available operations
          return `Available branch operations:
- list (or ls): List all branches
- create <name>: Create and switch to new branch
- switch <name>: Switch to existing branch  
- delete <name>: Delete branch
- merge <name>: Merge branch into current branch

Examples:
- "list" - show all branches
- "create feature-xyz" - create new branch
- "switch main" - switch to main branch`;
          
        } catch (error) {
          return `Git branch operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }
    );
  }
}