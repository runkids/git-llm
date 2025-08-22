import { BaseGitTool } from '../base/base-git-tool.js';

export class GitRemoteTool extends BaseGitTool {
  constructor() {
    super(
      'git_remote',
      'Manage Git remote operations: push, pull, fetch, and remote management',
      async (operation?: string) => {
        try {
          const cwd = this.getCwd();
          this.validateGitRepository(cwd);

          if (!operation || operation.trim() === '') {
            operation = 'status';
          }

          const op = operation.toLowerCase().trim();

          if (op === 'status' || op === 'info') {
            // Show remote status
            const remotes = this.executeGitCommand('git remote -v', cwd).trim();
            const currentBranch = this.executeGitCommand('git branch --show-current', cwd).trim();
            
            let trackingInfo = '';
            try {
              const tracking = this.executeGitCommand(`git status -b --porcelain`, cwd);
              const trackingLine = tracking.split('\n')[0];
              trackingInfo = trackingLine || 'No tracking info available';
            } catch {
              trackingInfo = 'No tracking info available';
            }
            
            return `Current branch: ${currentBranch}\nTracking: ${trackingInfo}\n\nConfigured remotes:\n${remotes || 'No remotes configured'}`;
          }
          
          if (op === 'push') {
            // Push current branch
            const currentBranch = this.executeGitCommand('git branch --show-current', cwd).trim();
            const result = this.executeGitCommand('git push origin HEAD', cwd);
            return `Pushed branch "${currentBranch}" to origin:\n${result}`;
          }
          
          if (op === 'pull') {
            // Pull current branch
            const result = this.executeGitCommand('git pull', cwd);
            return `Pulled updates:\n${result}`;
          }
          
          if (op === 'fetch') {
            // Fetch from remote
            const result = this.executeGitCommand('git fetch', cwd);
            return `Fetched from remote:\n${result}`;
          }
          
          if (op.startsWith('add ')) {
            // Add remote: "add origin https://github.com/user/repo.git"
            const parts = op.split(' ');
            if (parts.length < 3) {
              return 'Error: Usage: "add <name> <url>"';
            }
            const remoteName = parts[1];
            const remoteUrl = parts.slice(2).join(' ');
            
            this.executeGitCommand(`git remote add "${remoteName}" "${remoteUrl}"`, cwd);
            return `Added remote "${remoteName}": ${remoteUrl}`;
          }
          
          // Default: show available operations
          return `Available remote operations:
- status (or info): Show remote status and tracking info
- push: Push current branch to origin
- pull: Pull updates from remote
- fetch: Fetch updates without merging
- add <name> <url>: Add new remote

Examples:
- "push" - push current branch
- "pull" - pull latest changes
- "add origin https://github.com/user/repo.git"`;
          
        } catch (error) {
          return `Git remote operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }
    );
  }
}