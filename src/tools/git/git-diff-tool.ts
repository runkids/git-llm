import { BaseGitTool } from '../base/base-git-tool.js';
import { DiffAnalyzer } from '../diff-analyzer.js';

export class GitDiffTool extends BaseGitTool {
  private diffAnalyzer: DiffAnalyzer;

  constructor() {
    super(
      'git_diff',
      'Get structured analysis of git diff changes for LLM processing',
      async (input?: string) => {
        try {
          const cwd = this.getCwd();
          this.validateGitRepository(cwd);
          
          // Get diff for specific file or all changes
          const diffCommand = input && input.trim() 
            ? `git diff "${input.trim()}"` 
            : 'git diff';
            
          const rawDiff = this.executeGitCommand(diffCommand, cwd);

          if (!rawDiff || !rawDiff.trim()) {
            return '';
          }

          // Return concise diff summary instead of full content
          const summary = this.diffAnalyzer.analyzeDiff(rawDiff);
          return this.formatDiffSummary(summary);
        } catch (error) {
          return this.formatError(`Git diff failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    );
    
    this.diffAnalyzer = new DiffAnalyzer();
  }

  private formatDiffSummary(summary: any): string {
    const { totalFiles, totalAdditions, totalDeletions, fileSummaries } = summary;
    
    let result = `📝 ${totalFiles} files changed`;
    if (totalAdditions > 0) result += `, +${totalAdditions}`;
    if (totalDeletions > 0) result += `, -${totalDeletions}`;
    result += '\n\n';

    // Show file-by-file summary
    fileSummaries.forEach((file: any) => {
      const changeSize = file.additions + file.deletions;
      const sizeIndicator = changeSize > 50 ? '🔥' : changeSize > 10 ? '📝' : '✏️';
      
      result += `${sizeIndicator} **${file.filePath}** (${file.changeType})`;
      if (file.additions > 0 || file.deletions > 0) {
        result += ` +${file.additions}/-${file.deletions}`;
      }
      result += '\n';
    });

    return result.trim();
  }
}