import { BaseGitTool } from '../base/base-git-tool.js';

export class GitUndoTool extends BaseGitTool {
  constructor() {
    super(
      'git_undo',
      'Intelligently undo or revert Git operations',
      async (operation = 'last commit') => {
        try {
          const cwd = this.getCwd();
          this.validateGitRepository(cwd);
          
          // Analyze what needs to be undone
          const undoType = this.analyzeUndoOperation(operation);
          
          switch (undoType.type) {
            case 'uncommitted_changes':
              return this.undoUncommittedChanges(cwd);
            
            case 'last_commit':
              return this.undoLastCommit(cwd);
              
            case 'specific_commit':
              return this.undoSpecificCommit(cwd, undoType);
              
            case 'merge':
              return this.undoMerge(cwd);
              
            case 'push':
              return this.undoPush(cwd);
              
            default:
              return this.suggestUndoOptions(cwd);
          }
          
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          return `Error analyzing undo operation: ${errorMsg}\n\nSafe undo options:\n1. git status (check current state)\n2. git log --oneline -5 (see recent commits)\n3. git stash (save current changes)`;
        }
      }
    );
  }

  private analyzeUndoOperation(operation: string): {
    type: string;
    target?: string;
    safe: boolean;
  } {
    const lower = operation.toLowerCase();
    
    // Uncommitted changes
    if (lower.includes('change') && !lower.includes('commit')) {
      return { type: 'uncommitted_changes', safe: false };
    }
    
    // Last commit
    if (lower.includes('last commit') || lower.includes('最後') || lower.includes('剛剛')) {
      return { type: 'last_commit', safe: false };
    }
    
    // Specific commit hash
    const commitMatch = lower.match(/([a-f0-9]{7,})/);
    if (commitMatch) {
      return { type: 'specific_commit', target: commitMatch[1], safe: false };
    }
    
    // Merge
    if (lower.includes('merge')) {
      return { type: 'merge', safe: false };
    }
    
    // Push
    if (lower.includes('push')) {
      return { type: 'push', safe: false };
    }
    
    return { type: 'last_commit', safe: false };
  }

  private undoUncommittedChanges(cwd: string): string {
    try {
      // Check if there are uncommitted changes
      const status = this.executeGitCommand('git status --porcelain', cwd).trim();
      if (!status) {
        return '✅ No uncommitted changes to undo. Your working tree is clean.';
      }
      
      // Show what will be stashed
      const changes = this.executeGitCommand('git status --short', cwd);
      
      // Stash the changes (safe, reversible option)
      this.executeGitCommand('git stash push -m "Auto-stash before undo operation"', cwd);
      const stashList = this.executeGitCommand('git stash list', cwd).split('\n')[0];
      
      return `✅ **Successfully Stashed Uncommitted Changes**\n\nStashed changes:\n\`\`\`\n${changes}\`\`\`\n\nStash entry: ${stashList}\n\n**Your working directory is now clean.**\n\n**To restore changes:**\n- \`git stash pop\` - Restore and remove from stash\n- \`git stash apply\` - Restore but keep in stash\n- \`git stash drop\` - Permanently delete the stash`;
      
    } catch (error) {
      return `Error stashing uncommitted changes: ${error}`;
    }
  }

  private undoLastCommit(cwd: string): string {
    try {
      // Get last commit info
      const lastCommit = this.executeGitCommand('git log -1 --oneline', cwd).trim();
      if (!lastCommit) {
        return '✅ No commits to undo. Repository is empty or at initial commit.';
      }
      
      // Check if the commit has been pushed
      const hasBeenPushed = this.checkIfCommitPushed(cwd);
      
      if (hasBeenPushed) {
        // For pushed commits, create a revert commit (safe option)
        const revertResult = this.executeGitCommand('git revert --no-edit HEAD', cwd);
        const newCommit = this.executeGitCommand('git log -1 --oneline', cwd).trim();
        
        return `✅ **Successfully Reverted Pushed Commit**\n\nOriginal commit: ${lastCommit}\nRevert commit: ${newCommit}\n\n${revertResult.trim()}\n\n**Next steps:**\n- Your changes have been safely reverted\n- The revert commit preserves history\n- You can now push: \`git push\``;
      } else {
        // For unpushed commits, use soft reset to keep changes
        this.executeGitCommand('git reset --soft HEAD~1', cwd);
        const status = this.executeGitCommand('git status --short', cwd).trim();
        
        return `✅ **Successfully Reset Last Commit**\n\nUndone commit: ${lastCommit}\n\n**Your changes are now staged and ready for editing:**\n\`\`\`\n${status || 'No staged changes'}\`\`\`\n\n**Next steps:**\n- Edit your changes if needed\n- Re-commit with: \`git commit\`\n- Or unstage with: \`git reset HEAD\``;
      }
      
    } catch (error) {
      return `❌ Error undoing last commit: ${error instanceof Error ? error.message : error}`;
    }
  }

  private undoSpecificCommit(cwd: string, undoType: any): string {
    try {
      const commitHash = undoType.target;
      
      // Verify commit exists
      const commitInfo = this.executeGitCommand(`git show --oneline -s ${commitHash}`, cwd).trim();
      if (!commitInfo) {
        return `❌ Commit ${commitHash} not found in repository history.`;
      }
      
      // Check if it's a merge commit
      const isMergeCommit = this.executeGitCommand(`git cat-file -p ${commitHash}`, cwd).includes('parent');
      
      if (isMergeCommit) {
        return `**Merge Commit Detected**\n\nCommit: ${commitInfo}\n\n**Undo Options:**\n\n1. **Revert merge commit**:\n   \`git revert -m 1 ${commitHash}\`\n\n2. **Reset to before merge** (if not pushed):\n   \`git reset --hard ${commitHash}~1\`\n\n**Note:** Reverting merges can be complex. Consider the impact on branch history.`;
      } else {
        return `**Specific Commit**\n\nCommit: ${commitInfo}\n\n**Undo Options:**\n\n1. **Create revert commit** (recommended - maintains history):\n   \`git revert ${commitHash}\`\n\n2. **Interactive rebase** (if not pushed - rewrites history):\n   \`git rebase -i ${commitHash}~1\`\n\n**Recommendation:** Use git revert to safely undo while preserving history.`;
      }
      
    } catch (error) {
      return `Error analyzing commit ${undoType.target}: ${error}`;
    }
  }

  private undoMerge(cwd: string): string {
    try {
      // Find recent merge commits
      const mergeCommits = this.executeGitCommand('git log --merges --oneline -5', cwd).trim();
      
      if (!mergeCommits) {
        return '✅ No recent merge commits found to undo.';
      }
      
      const lastMerge = mergeCommits.split('\n')[0];
      const mergeHash = lastMerge.split(' ')[0];
      
      return `**Recent Merge Commits**\n\n${mergeCommits}\n\n**Undo Last Merge Options:**\n\n1. **Revert merge commit** (recommended - safe):\n   \`git revert -m 1 ${mergeHash}\`\n\n2. **Reset to before merge** (if not pushed):\n   \`git reset --hard ${mergeHash}~1\`\n\n3. **Reset to specific parent**:\n   \`git reset --hard ${mergeHash}~2\`\n\n**Note:** -m 1 reverts to the first parent (usually main branch).`;
      
    } catch (error) {
      return `Error analyzing merge commits: ${error}`;
    }
  }

  private undoPush(cwd: string): string {
    try {
      // Get remote info
      this.executeGitCommand('git remote -v', cwd).trim();
      const lastPushedCommit = this.executeGitCommand('git log @{u} --oneline -1', cwd).trim();
      
      if (!lastPushedCommit) {
        return '✅ No pushed commits found. Nothing to undo.';
      }
      
      return `⚠️ **Undoing Pushed Commits**\n\nLast pushed: ${lastPushedCommit}\n\n**Undo Options:**\n\n1. **Create revert commit** (recommended - safe for shared repos):\n   \`git revert HEAD\`\n   \`git push\`\n\n2. **Force push reset** (⚠️ dangerous - only if you're sure no one else pulled):\n   \`git reset --hard HEAD~1\`\n   \`git push --force-with-lease\`\n\n**⚠️ Warning:** Force pushing rewrites shared history and can cause issues for other developers.\n\n**Recommendation:** Always use revert for pushed commits unless you're certain no one else has pulled the changes.`;
      
    } catch (error) {
      return `Error analyzing pushed commits: ${error}`;
    }
  }

  private checkIfCommitPushed(cwd: string): boolean {
    try {
      // Check if HEAD is ahead of remote
      const aheadBehind = this.executeGitCommand('git rev-list --left-right --count HEAD...@{u}', cwd).trim();
      const [ahead] = aheadBehind.split('\t').map(n => parseInt(n, 10));
      return ahead === 0; // If ahead is 0, the commit has been pushed
    } catch {
      // If we can't determine, assume it might be pushed (safer)
      return true;
    }
  }

  private suggestUndoOptions(cwd: string): string {
    try {
      const status = this.executeGitCommand('git status --porcelain', cwd).trim();
      const recentCommits = this.executeGitCommand('git log --oneline -3', cwd).trim();
      
      let suggestions = `**Git Repository Status**\n\n`;
      
      if (status) {
        suggestions += `**Uncommitted Changes:**\n\`\`\`\n${this.executeGitCommand('git status --short', cwd)}\`\`\`\n`;
      }
      
      if (recentCommits) {
        suggestions += `\n**Recent Commits:**\n\`\`\`\n${recentCommits}\`\`\`\n`;
      }
      
      suggestions += `\n**Common Undo Operations:**\n\n`;
      suggestions += `• \`/undo last commit\` - Undo the most recent commit\n`;
      suggestions += `• \`/undo changes\` - Discard uncommitted changes\n`;
      suggestions += `• \`/undo merge\` - Undo the last merge\n`;
      suggestions += `• \`/undo push\` - Help with undoing pushed commits\n\n`;
      suggestions += `**Or describe what you want to undo in natural language.**`;
      
      return suggestions;
      
    } catch (error) {
      return `Error generating undo suggestions: ${error}`;
    }
  }
}