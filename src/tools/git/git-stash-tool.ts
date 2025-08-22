import { BaseGitTool } from '../base/base-git-tool.js';

export class GitStashTool extends BaseGitTool {
  constructor() {
    super(
      'git_stash',
      'Manage Git stash: save, list, apply, pop, and drop stashed changes',
      async (operation?: string) => {
        try {
          const cwd = this.getCwd();
          this.validateGitRepository(cwd);

          if (!operation || operation.trim() === '') {
            operation = 'list';
          }

          const op = operation.toLowerCase().trim();

          if (op === 'list' || op === 'ls') {
            // List all stashes
            const stashes = this.executeGitCommand('git stash list', cwd).trim();
            return stashes || 'No stashes found';
          }
          
          if (op === 'save' || op === 'push') {
            // Save current changes to stash
            const result = this.executeGitCommand('git stash push -m "Stashed changes"', cwd);
            return `Stashed current changes:\n${result}`;
          }
          
          if (op.startsWith('save ') || op.startsWith('push ')) {
            // Save with custom message: "save work in progress"
            const message = op.split(' ').slice(1).join(' ');
            const result = this.executeGitCommand(`git stash push -m "${message}"`, cwd);
            return `Stashed changes with message "${message}":\n${result}`;
          }
          
          if (op === 'pop') {
            // Pop latest stash
            const result = this.executeGitCommand('git stash pop', cwd);
            return `Popped latest stash:\n${result}`;
          }
          
          if (op.startsWith('pop ')) {
            // Pop specific stash: "pop stash@{1}"
            const stashRef = op.split(' ')[1];
            const result = this.executeGitCommand(`git stash pop "${stashRef}"`, cwd);
            return `Popped stash "${stashRef}":\n${result}`;
          }
          
          if (op === 'apply') {
            // Apply latest stash without removing
            const result = this.executeGitCommand('git stash apply', cwd);
            return `Applied latest stash:\n${result}`;
          }
          
          if (op.startsWith('apply ')) {
            // Apply specific stash: "apply stash@{1}"
            const stashRef = op.split(' ')[1];
            const result = this.executeGitCommand(`git stash apply "${stashRef}"`, cwd);
            return `Applied stash "${stashRef}":\n${result}`;
          }
          
          if (op === 'drop') {
            // Drop latest stash
            const result = this.executeGitCommand('git stash drop', cwd);
            return `Dropped latest stash:\n${result}`;
          }
          
          if (op.startsWith('drop ')) {
            // Drop specific stash: "drop stash@{1}"
            const stashRef = op.split(' ')[1];
            const result = this.executeGitCommand(`git stash drop "${stashRef}"`, cwd);
            return `Dropped stash "${stashRef}":\n${result}`;
          }
          
          if (op === 'clear') {
            // Clear all stashes
            this.executeGitCommand('git stash clear', cwd);
            return 'Cleared all stashes';
          }
          
          // Default: show available operations
          return `Available stash operations:
- list (or ls): List all stashes
- save [message]: Save current changes to stash
- pop [stash@{n}]: Pop (apply and remove) stash
- apply [stash@{n}]: Apply stash without removing
- drop [stash@{n}]: Remove stash
- clear: Remove all stashes

Examples:
- "save work in progress" - stash with message
- "pop" - pop latest stash
- "apply stash@{1}" - apply specific stash`;
          
        } catch (error) {
          return `Git stash operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }
    );
  }
}