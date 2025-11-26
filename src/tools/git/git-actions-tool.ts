import { BaseGitTool } from '../base/base-git-tool.js';

/**
 * GitActionsTool - Smooth git actions with common usage patterns
 *
 * Provides convenient shortcuts for everyday git workflows:
 * - Quick operations (save, push, sync)
 * - Branch workflows (feature, hotfix, release)
 * - History and inspection
 * - Cleanup and maintenance
 * - Tagging and versioning
 */
export class GitActionsTool extends BaseGitTool {
  constructor() {
    super(
      'git_actions',
      'Smooth git actions for common workflows: quick-save, quick-push, sync, feature branches, history, cleanup, and more',
      async (action?: string) => {
        try {
          const cwd = this.getCwd();
          this.validateGitRepository(cwd);

          if (!action || action.trim() === '') {
            return this.showHelp();
          }

          const [command, ...args] = action.trim().split(/\s+/);
          const arg = args.join(' ');

          switch (command.toLowerCase()) {
            // === Quick Operations ===
            case 'quick-save':
            case 'qs':
              return this.quickSave(cwd, arg);

            case 'quick-push':
            case 'qp':
              return this.quickPush(cwd, arg);

            case 'save':
              return this.save(cwd, arg);

            // === Sync Operations ===
            case 'sync':
              return this.sync(cwd);

            case 'sync-rebase':
            case 'sr':
              return this.syncRebase(cwd);

            case 'pull':
              return this.pull(cwd);

            case 'push':
              return this.push(cwd, arg);

            case 'fetch':
              return this.fetch(cwd);

            // === Branch Workflows ===
            case 'feature':
            case 'feat':
              return this.createFeatureBranch(cwd, arg);

            case 'hotfix':
            case 'fix':
              return this.createHotfixBranch(cwd, arg);

            case 'release':
              return this.createReleaseBranch(cwd, arg);

            case 'finish':
              return this.finishBranch(cwd);

            case 'update':
              return this.updateBranch(cwd);

            // === History & Inspection ===
            case 'history':
            case 'log':
              return this.showHistory(cwd, arg);

            case 'last':
              return this.showLastCommit(cwd);

            case 'blame':
              return this.blame(cwd, arg);

            case 'show':
              return this.showCommit(cwd, arg);

            case 'search':
              return this.searchCommits(cwd, arg);

            case 'contributors':
              return this.showContributors(cwd);

            // === Undo Operations ===
            case 'undo':
              return this.undoLastCommit(cwd);

            case 'unstage':
              return this.unstage(cwd, arg);

            case 'discard':
              return this.discard(cwd, arg);

            case 'reset':
              return this.resetFile(cwd, arg);

            case 'amend':
              return this.amendCommit(cwd, arg);

            // === Cleanup & Maintenance ===
            case 'clean':
              return this.clean(cwd);

            case 'clean-branches':
            case 'cb':
              return this.cleanBranches(cwd);

            case 'prune':
              return this.prune(cwd);

            case 'gc':
              return this.garbageCollect(cwd);

            // === Tagging ===
            case 'tag':
              return this.createTag(cwd, arg);

            case 'tags':
              return this.listTags(cwd);

            case 'delete-tag':
            case 'dt':
              return this.deleteTag(cwd, arg);

            // === Cherry-pick & Rebase ===
            case 'cherry-pick':
            case 'cp':
              return this.cherryPick(cwd, arg);

            case 'squash':
              return this.squashCommits(cwd, arg);

            // === Info ===
            case 'info':
              return this.showRepoInfo(cwd);

            case 'whoami':
              return this.showUserInfo(cwd);

            case 'remote':
              return this.showRemotes(cwd);

            // === Aliases ===
            case 'wip':
              return this.quickSave(cwd, 'WIP: Work in progress');

            case 'oops':
              return this.amendCommit(cwd, '');

            default:
              return `Unknown action: "${command}"\n\n${this.showHelp()}`;
          }
        } catch (error) {
          return `Git action failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }
    );
  }

  // === Quick Operations ===

  private quickSave(cwd: string, message?: string): string {
    const status = this.executeGitCommand('git status --porcelain', cwd).trim();
    if (!status) {
      return 'Nothing to save. Working tree is clean.';
    }

    this.executeGitCommand('git add -A', cwd);

    const commitMessage = message || this.generateQuickMessage(cwd);
    this.executeGitCommand(`git commit -m "${this.escapeMessage(commitMessage)}"`, cwd);

    const commitInfo = this.executeGitCommand('git log -1 --oneline', cwd).trim();
    return `Saved: ${commitInfo}`;
  }

  private quickPush(cwd: string, message?: string): string {
    const status = this.executeGitCommand('git status --porcelain', cwd).trim();

    if (status) {
      this.executeGitCommand('git add -A', cwd);
      const commitMessage = message || this.generateQuickMessage(cwd);
      this.executeGitCommand(`git commit -m "${this.escapeMessage(commitMessage)}"`, cwd);
    }

    const branch = this.executeGitCommand('git branch --show-current', cwd).trim();

    // Check if remote tracking exists
    const hasUpstream = this.safeExecuteGitCommand(`git rev-parse --abbrev-ref ${branch}@{u}`, cwd);

    if (hasUpstream) {
      this.executeGitCommand('git push', cwd);
    } else {
      this.executeGitCommand(`git push -u origin ${branch}`, cwd);
    }

    const commitInfo = this.executeGitCommand('git log -1 --oneline', cwd).trim();
    return `Pushed: ${commitInfo} -> origin/${branch}`;
  }

  private save(cwd: string, message: string): string {
    if (!message) {
      return 'Error: Please provide a commit message. Usage: save <message>';
    }

    const status = this.executeGitCommand('git status --porcelain', cwd).trim();
    if (!status) {
      return 'Nothing to save. Working tree is clean.';
    }

    this.executeGitCommand('git add -A', cwd);
    this.executeGitCommand(`git commit -m "${this.escapeMessage(message)}"`, cwd);

    const commitInfo = this.executeGitCommand('git log -1 --oneline', cwd).trim();
    return `Saved: ${commitInfo}`;
  }

  // === Sync Operations ===

  private sync(cwd: string): string {
    const branch = this.executeGitCommand('git branch --show-current', cwd).trim();

    this.executeGitCommand('git fetch origin', cwd);
    const result = this.safeExecuteGitCommand(`git merge origin/${branch}`, cwd);

    if (result.includes('Already up to date')) {
      return `Branch "${branch}" is already up to date with origin.`;
    }

    return `Synced "${branch}" with origin:\n${result}`;
  }

  private syncRebase(cwd: string): string {
    const branch = this.executeGitCommand('git branch --show-current', cwd).trim();

    this.executeGitCommand('git fetch origin', cwd);
    const result = this.executeGitCommand(`git rebase origin/${branch}`, cwd);

    return `Rebased "${branch}" onto origin:\n${result}`;
  }

  private pull(cwd: string): string {
    const result = this.executeGitCommand('git pull', cwd);
    return `Pulled changes:\n${result}`;
  }

  private push(cwd: string, args?: string): string {
    const branch = this.executeGitCommand('git branch --show-current', cwd).trim();

    if (args === 'force' || args === '-f') {
      this.executeGitCommand('git push --force-with-lease', cwd);
      return `Force pushed "${branch}" to origin (with lease protection)`;
    }

    // Check if remote tracking exists
    const hasUpstream = this.safeExecuteGitCommand(`git rev-parse --abbrev-ref ${branch}@{u}`, cwd);

    if (hasUpstream) {
      this.executeGitCommand('git push', cwd);
    } else {
      this.executeGitCommand(`git push -u origin ${branch}`, cwd);
    }

    return `Pushed "${branch}" to origin`;
  }

  private fetch(cwd: string): string {
    this.executeGitCommand('git fetch --all --prune', cwd);
    return 'Fetched all remotes and pruned stale branches';
  }

  // === Branch Workflows ===

  private createFeatureBranch(cwd: string, name: string): string {
    if (!name) {
      return 'Error: Please provide a feature name. Usage: feature <name>';
    }

    const branchName = name.startsWith('feature/') ? name : `feature/${name}`;
    const mainBranch = this.getMainBranch(cwd);

    this.executeGitCommand(`git checkout ${mainBranch}`, cwd);
    this.executeGitCommand('git pull origin ' + mainBranch, cwd);
    this.executeGitCommand(`git checkout -b ${branchName}`, cwd);

    return `Created and switched to feature branch: ${branchName}\nBased on latest ${mainBranch}`;
  }

  private createHotfixBranch(cwd: string, name: string): string {
    if (!name) {
      return 'Error: Please provide a hotfix name. Usage: hotfix <name>';
    }

    const branchName = name.startsWith('hotfix/') ? name : `hotfix/${name}`;
    const mainBranch = this.getMainBranch(cwd);

    this.executeGitCommand(`git checkout ${mainBranch}`, cwd);
    this.executeGitCommand('git pull origin ' + mainBranch, cwd);
    this.executeGitCommand(`git checkout -b ${branchName}`, cwd);

    return `Created and switched to hotfix branch: ${branchName}\nBased on latest ${mainBranch}`;
  }

  private createReleaseBranch(cwd: string, version: string): string {
    if (!version) {
      return 'Error: Please provide a version. Usage: release <version>';
    }

    const branchName = version.startsWith('release/') ? version : `release/${version}`;
    const mainBranch = this.getMainBranch(cwd);

    this.executeGitCommand(`git checkout ${mainBranch}`, cwd);
    this.executeGitCommand('git pull origin ' + mainBranch, cwd);
    this.executeGitCommand(`git checkout -b ${branchName}`, cwd);

    return `Created and switched to release branch: ${branchName}`;
  }

  private finishBranch(cwd: string): string {
    const currentBranch = this.executeGitCommand('git branch --show-current', cwd).trim();
    const mainBranch = this.getMainBranch(cwd);

    if (currentBranch === mainBranch) {
      return `Already on ${mainBranch}. Nothing to finish.`;
    }

    // Check for uncommitted changes
    const status = this.executeGitCommand('git status --porcelain', cwd).trim();
    if (status) {
      return 'Error: You have uncommitted changes. Please commit or stash them first.';
    }

    this.executeGitCommand(`git checkout ${mainBranch}`, cwd);
    this.executeGitCommand(`git pull origin ${mainBranch}`, cwd);
    const mergeResult = this.executeGitCommand(`git merge --no-ff ${currentBranch}`, cwd);

    return `Merged "${currentBranch}" into ${mainBranch}:\n${mergeResult}\n\nTip: Use "git_actions push" to push changes, or "git_actions clean-branches" to delete merged branches.`;
  }

  private updateBranch(cwd: string): string {
    const currentBranch = this.executeGitCommand('git branch --show-current', cwd).trim();
    const mainBranch = this.getMainBranch(cwd);

    if (currentBranch === mainBranch) {
      return this.sync(cwd);
    }

    // Rebase current branch onto main
    this.executeGitCommand(`git fetch origin ${mainBranch}`, cwd);
    const result = this.executeGitCommand(`git rebase origin/${mainBranch}`, cwd);

    return `Updated "${currentBranch}" with latest ${mainBranch}:\n${result}`;
  }

  // === History & Inspection ===

  private showHistory(cwd: string, count?: string): string {
    const n = parseInt(count || '10', 10);
    const log = this.executeGitCommand(
      `git log --oneline --graph --decorate -${n}`,
      cwd
    ).trim();

    return `Recent commits (${n}):\n\n${log}`;
  }

  private showLastCommit(cwd: string): string {
    const commit = this.executeGitCommand(
      'git log -1 --format="%H%n%an <%ae>%n%ai%n%n%s%n%n%b"',
      cwd
    ).trim();

    const diffStat = this.executeGitCommand('git diff --stat HEAD~1..HEAD', cwd).trim();

    return `Last commit:\n\n${commit}\n\nChanges:\n${diffStat}`;
  }

  private blame(cwd: string, file: string): string {
    if (!file) {
      return 'Error: Please provide a file path. Usage: blame <file>';
    }

    const result = this.executeGitCommand(`git blame --date=short "${file}"`, cwd);
    return `Blame for ${file}:\n\n${result}`;
  }

  private showCommit(cwd: string, ref: string): string {
    const commitRef = ref || 'HEAD';
    const result = this.executeGitCommand(`git show --stat ${commitRef}`, cwd);
    return result;
  }

  private searchCommits(cwd: string, query: string): string {
    if (!query) {
      return 'Error: Please provide a search term. Usage: search <query>';
    }

    const result = this.executeGitCommand(
      `git log --oneline --all --grep="${query}" -20`,
      cwd
    ).trim();

    if (!result) {
      return `No commits found matching "${query}"`;
    }

    return `Commits matching "${query}":\n\n${result}`;
  }

  private showContributors(cwd: string): string {
    const result = this.executeGitCommand(
      'git shortlog -sne --all',
      cwd
    ).trim();

    return `Contributors:\n\n${result}`;
  }

  // === Undo Operations ===

  private undoLastCommit(cwd: string): string {
    this.executeGitCommand('git reset --soft HEAD~1', cwd);
    return 'Undone last commit. Changes are now staged.\n\nTip: Use "git_actions discard" to discard all changes if needed.';
  }

  private unstage(cwd: string, file?: string): string {
    if (file) {
      this.executeGitCommand(`git reset HEAD "${file}"`, cwd);
      return `Unstaged: ${file}`;
    }

    this.executeGitCommand('git reset HEAD', cwd);
    return 'Unstaged all files';
  }

  private discard(cwd: string, file?: string): string {
    if (file) {
      this.executeGitCommand(`git checkout -- "${file}"`, cwd);
      return `Discarded changes in: ${file}`;
    }

    this.executeGitCommand('git checkout -- .', cwd);
    return 'Discarded all uncommitted changes';
  }

  private resetFile(cwd: string, file: string): string {
    if (!file) {
      return 'Error: Please provide a file path. Usage: reset <file>';
    }

    this.executeGitCommand(`git checkout HEAD -- "${file}"`, cwd);
    return `Reset file to HEAD: ${file}`;
  }

  private amendCommit(cwd: string, message?: string): string {
    if (message) {
      this.executeGitCommand(`git commit --amend -m "${this.escapeMessage(message)}"`, cwd);
      return `Amended commit with new message: ${message}`;
    }

    this.executeGitCommand('git commit --amend --no-edit', cwd);
    const commitInfo = this.executeGitCommand('git log -1 --oneline', cwd).trim();
    return `Amended last commit: ${commitInfo}`;
  }

  // === Cleanup & Maintenance ===

  private clean(cwd: string): string {
    const dryRun = this.executeGitCommand('git clean -nd', cwd).trim();

    if (!dryRun) {
      return 'No untracked files to clean.';
    }

    return `Untracked files that would be removed:\n\n${dryRun}\n\nUse "git clean -fd" manually to remove these files.`;
  }

  private cleanBranches(cwd: string): string {
    const mainBranch = this.getMainBranch(cwd);

    // Get merged branches
    const merged = this.executeGitCommand(
      `git branch --merged ${mainBranch}`,
      cwd
    ).trim();

    const branches = merged
      .split('\n')
      .map(b => b.trim().replace('* ', ''))
      .filter(b => b && b !== mainBranch && b !== 'main' && b !== 'master' && !b.startsWith('remotes/'));

    if (branches.length === 0) {
      return 'No merged branches to clean up.';
    }

    let deleted = 0;
    const results: string[] = [];

    for (const branch of branches) {
      try {
        this.executeGitCommand(`git branch -d ${branch}`, cwd);
        results.push(`Deleted: ${branch}`);
        deleted++;
      } catch {
        results.push(`Skipped: ${branch} (not fully merged)`);
      }
    }

    return `Cleaned up ${deleted} merged branches:\n\n${results.join('\n')}`;
  }

  private prune(cwd: string): string {
    this.executeGitCommand('git remote prune origin', cwd);
    this.executeGitCommand('git fetch --prune', cwd);
    return 'Pruned stale remote-tracking branches';
  }

  private garbageCollect(cwd: string): string {
    this.executeGitCommand('git gc --prune=now', cwd);
    return 'Garbage collection complete. Repository optimized.';
  }

  // === Tagging ===

  private createTag(cwd: string, tagInfo: string): string {
    if (!tagInfo) {
      return 'Error: Please provide a tag name. Usage: tag <name> [message]';
    }

    const parts = tagInfo.split(' ');
    const tagName = parts[0];
    const message = parts.slice(1).join(' ');

    if (message) {
      this.executeGitCommand(`git tag -a "${tagName}" -m "${this.escapeMessage(message)}"`, cwd);
      return `Created annotated tag: ${tagName}\nMessage: ${message}`;
    }

    this.executeGitCommand(`git tag "${tagName}"`, cwd);
    return `Created lightweight tag: ${tagName}`;
  }

  private listTags(cwd: string): string {
    const tags = this.executeGitCommand('git tag -l --sort=-v:refname', cwd).trim();

    if (!tags) {
      return 'No tags found.';
    }

    return `Tags:\n\n${tags}`;
  }

  private deleteTag(cwd: string, tagName: string): string {
    if (!tagName) {
      return 'Error: Please provide a tag name. Usage: delete-tag <name>';
    }

    this.executeGitCommand(`git tag -d "${tagName}"`, cwd);
    return `Deleted local tag: ${tagName}\n\nTo delete remote tag: git push origin :refs/tags/${tagName}`;
  }

  // === Cherry-pick & Rebase ===

  private cherryPick(cwd: string, commitHash: string): string {
    if (!commitHash) {
      return 'Error: Please provide a commit hash. Usage: cherry-pick <hash>';
    }

    const result = this.executeGitCommand(`git cherry-pick ${commitHash}`, cwd);
    return `Cherry-picked commit ${commitHash}:\n${result}`;
  }

  private squashCommits(cwd: string, count: string): string {
    if (!count) {
      return 'Error: Please provide number of commits to squash. Usage: squash <n>';
    }

    const n = parseInt(count, 10);
    if (isNaN(n) || n < 2) {
      return 'Error: Please provide a valid number (at least 2). Usage: squash <n>';
    }

    return `To squash the last ${n} commits, run:\n\ngit reset --soft HEAD~${n} && git commit\n\nOr use interactive rebase:\n\ngit rebase -i HEAD~${n}`;
  }

  // === Info ===

  private showRepoInfo(cwd: string): string {
    const branch = this.executeGitCommand('git branch --show-current', cwd).trim();
    const remoteUrl = this.safeExecuteGitCommand('git remote get-url origin', cwd).trim();
    const lastCommit = this.executeGitCommand('git log -1 --oneline', cwd).trim();
    const status = this.executeGitCommand('git status --porcelain', cwd).trim();
    const branches = this.executeGitCommand('git branch | wc -l', cwd).trim();
    const commits = this.executeGitCommand('git rev-list --count HEAD', cwd).trim();

    const statusText = status ? `${status.split('\n').length} changed files` : 'Clean';

    return `Repository Info:

Branch:    ${branch}
Remote:    ${remoteUrl || 'No remote'}
Status:    ${statusText}
Branches:  ${branches}
Commits:   ${commits}
Last:      ${lastCommit}`;
  }

  private showUserInfo(cwd: string): string {
    const name = this.safeExecuteGitCommand('git config user.name', cwd).trim();
    const email = this.safeExecuteGitCommand('git config user.email', cwd).trim();

    return `Git User:\n\nName:  ${name || '(not set)'}\nEmail: ${email || '(not set)'}`;
  }

  private showRemotes(cwd: string): string {
    const remotes = this.executeGitCommand('git remote -v', cwd).trim();

    if (!remotes) {
      return 'No remotes configured.';
    }

    return `Remotes:\n\n${remotes}`;
  }

  // === Helpers ===

  private getMainBranch(cwd: string): string {
    // Try to detect main branch
    const hasMain = this.safeExecuteGitCommand('git rev-parse --verify main', cwd);
    if (hasMain) return 'main';

    const hasMaster = this.safeExecuteGitCommand('git rev-parse --verify master', cwd);
    if (hasMaster) return 'master';

    return 'main';
  }

  private generateQuickMessage(cwd: string): string {
    const status = this.executeGitCommand('git status --porcelain', cwd);
    const files = status.split('\n').filter(l => l.trim());

    if (files.length === 1) {
      const file = files[0].substring(3);
      const action = files[0][0] === 'A' ? 'add' : files[0][0] === 'D' ? 'remove' : 'update';
      return `${action}: ${file}`;
    }

    return `update: ${files.length} files changed`;
  }

  private escapeMessage(message: string): string {
    return message.replace(/"/g, '\\"').replace(/\$/g, '\\$');
  }

  private showHelp(): string {
    return `Git Actions - Smooth git workflows

QUICK OPERATIONS:
  quick-save, qs [msg]    Stage all + commit (auto message if none)
  quick-push, qp [msg]    Stage all + commit + push
  save <message>          Stage all + commit with message
  wip                     Quick save with "WIP" message

SYNC OPERATIONS:
  sync                    Fetch + merge from origin
  sync-rebase, sr         Fetch + rebase from origin
  pull                    Pull from origin
  push [force]            Push to origin (use -u if needed)
  fetch                   Fetch all remotes + prune

BRANCH WORKFLOWS:
  feature, feat <name>    Create feature branch from main
  hotfix, fix <name>      Create hotfix branch from main
  release <version>       Create release branch from main
  finish                  Merge current branch into main
  update                  Rebase current branch onto main

HISTORY & INSPECTION:
  history, log [n]        Show recent commits (default: 10)
  last                    Show last commit details
  blame <file>            Show file blame
  show [ref]              Show commit details
  search <query>          Search commit messages
  contributors            Show all contributors

UNDO OPERATIONS:
  undo                    Soft reset last commit
  unstage [file]          Unstage files (all if no file)
  discard [file]          Discard changes (all if no file)
  reset <file>            Reset file to HEAD
  amend [msg]             Amend last commit
  oops                    Amend last commit (no msg change)

CLEANUP & MAINTENANCE:
  clean                   Preview untracked files
  clean-branches, cb      Delete merged branches
  prune                   Prune stale remote branches
  gc                      Garbage collect repository

TAGGING:
  tag <name> [msg]        Create tag (annotated if msg)
  tags                    List all tags
  delete-tag, dt <name>   Delete local tag

ADVANCED:
  cherry-pick, cp <hash>  Cherry-pick a commit
  squash <n>              Help to squash n commits

INFO:
  info                    Show repository info
  whoami                  Show git user config
  remote                  Show remote URLs

Examples:
  git_actions qs                  # Quick save with auto message
  git_actions qp "fix: bug"       # Quick push with message
  git_actions feature login       # Create feature/login branch
  git_actions finish              # Merge branch to main
  git_actions history 20          # Show last 20 commits
  git_actions clean-branches      # Delete merged branches`;
  }
}
