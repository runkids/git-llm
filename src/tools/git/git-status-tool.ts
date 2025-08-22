import { BaseGitTool } from '../base/base-git-tool.js';

export class GitStatusTool extends BaseGitTool {
  constructor() {
    super(
      'git_status',
      'Get structured git repository status data for LLM processing',
      async () => {
        try {
          const cwd = this.getCwd();
          this.validateGitRepository(cwd);

          const branch = this.executeGitCommand('git branch --show-current', cwd).trim();
          const statusPorcelain = this.executeGitCommand('git status --porcelain', cwd).trim();
          const recentCommits = this.executeGitCommand('git log --oneline -5', cwd)
            .trim()
            .split('\n');

          // Return structured data for LLM to process
          const statusData = {
            repository: {
              branch,
              workingDirectory: cwd,
              isClean: !statusPorcelain
            },
            changes: statusPorcelain ? this.parseGitStatus(statusPorcelain) : {
              staged: [],
              unstaged: [],
              untracked: [],
              total: 0
            },
            recentCommits: recentCommits.slice(0, 5),
            summary: {
              hasChanges: !!statusPorcelain,
              totalFiles: statusPorcelain ? statusPorcelain.split('\n').length : 0
            }
          };

          return this.formatSuccess(statusData);
        } catch (error) {
          return this.formatError(error instanceof Error ? error.message : 'Unknown error');
        }
      }
    );
  }
}