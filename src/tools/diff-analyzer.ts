export interface DiffSummary {
  totalFiles: number;
  totalAdditions: number;
  totalDeletions: number;
  fileSummaries: FileDiff[];
  overallType: 'feature' | 'fix' | 'refactor' | 'docs' | 'test' | 'style' | 'mixed';
  keyChanges: string[];
}

export interface FileDiff {
  filePath: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  changeType: string;
  summary: string;
  importance: 'high' | 'medium' | 'low';
}

export class DiffAnalyzer {
  /**
   * Intelligently analyze git diff output and generate structured summary
   */
  public analyzeDiff(diffOutput: string): DiffSummary {
    if (!diffOutput.trim()) {
      return {
        totalFiles: 0,
        totalAdditions: 0,
        totalDeletions: 0,
        fileSummaries: [],
        overallType: 'mixed',
        keyChanges: ['no_changes']
      };
    }

    const fileDiffs = this.parseFiles(diffOutput);
    const summary = this.generateSummary(fileDiffs);
    
    return summary;
  }

  /**
   * Parse file changes from diff output
   */
  private parseFiles(diffOutput: string): FileDiff[] {
    const fileDiffs: FileDiff[] = [];
    const fileBlocks = diffOutput.split(/^diff --git/m).filter(block => block.trim());

    for (const block of fileBlocks) {
      const fileDiff = this.parseFileBlock(block);
      if (fileDiff) {
        fileDiffs.push(fileDiff);
      }
    }

    return fileDiffs;
  }

  /**
   * Parse diff block for a single file
   */
  private parseFileBlock(block: string): FileDiff | null {
    
    // Extract file path
    let filePath = '';
    const pathMatch = block.match(/a\/([^\s]+)\s+b\/([^\s]+)/);
    if (pathMatch) {
      filePath = pathMatch[2] || pathMatch[1];
    }

    if (!filePath) return null;

    // Calculate number of added and deleted lines
    const additions = (block.match(/^\+[^+]/gm) || []).length;
    const deletions = (block.match(/^-[^-]/gm) || []).length;

    // Determine file status
    let status: FileDiff['status'] = 'modified';
    if (block.includes('new file mode')) status = 'added';
    else if (block.includes('deleted file mode')) status = 'deleted';
    else if (block.includes('rename from')) status = 'renamed';

    // Analyze change type and importance
    const changeType = this.analyzeChangeType(filePath, block);
    const importance = this.determineImportance(filePath, additions, deletions, changeType);
    const summary = this.generateFileSummary(filePath, status, additions, deletions, changeType);

    return {
      filePath,
      status,
      additions,
      deletions,
      changeType,
      summary,
      importance
    };
  }

  /**
   * Analyze change type
   */
  private analyzeChangeType(filePath: string, diffContent: string): string {
    const lowerPath = filePath.toLowerCase();
    const lowerContent = diffContent.toLowerCase();

    // Determine based on file type
    if (lowerPath.endsWith('.test.ts') || lowerPath.endsWith('.test.tsx') || lowerPath.includes('__tests__')) {
      return 'test';
    }
    
    if (lowerPath.endsWith('.md') || lowerPath.includes('readme')) {
      return 'docs';
    }

    if (lowerPath.endsWith('.css') || lowerPath.endsWith('.scss') || lowerPath.endsWith('.less')) {
      return 'style';
    }

    // Determine based on change content
    if (lowerContent.includes('fix') || lowerContent.includes('bug') || lowerContent.includes('error')) {
      return 'fix';
    }

    if (lowerContent.includes('add') || lowerContent.includes('new') || lowerContent.includes('implement')) {
      return 'feature';
    }

    if (lowerContent.includes('refactor') || lowerContent.includes('reorganize') || lowerContent.includes('restructure')) {
      return 'refactor';
    }

    // Determine based on addition/deletion ratio
    const additions = (diffContent.match(/^\+[^+]/gm) || []).length;
    const deletions = (diffContent.match(/^-[^-]/gm) || []).length;
    
    if (additions > deletions * 2) {
      return 'feature';
    } else if (deletions > additions * 2) {
      return 'cleanup';
    }

    return 'modification';
  }

  /**
   * Determine the importance of changes
   */
  private determineImportance(filePath: string, additions: number, deletions: number, changeType: string): FileDiff['importance'] {
    const totalChanges = additions + deletions;
    const lowerPath = filePath.toLowerCase();

    // Important file types
    const criticalFiles = ['package.json', 'tsconfig.json', 'webpack.config', 'dockerfile', '.env'];
    if (criticalFiles.some(critical => lowerPath.includes(critical))) {
      return 'high';
    }

    // Main source code files
    if (lowerPath.includes('src/') && !lowerPath.includes('test')) {
      if (totalChanges > 50 || changeType === 'feature') {
        return 'high';
      } else if (totalChanges > 10) {
        return 'medium';
      }
    }

    // Tests and documentation are usually less important
    if (changeType === 'test' || changeType === 'docs') {
      return totalChanges > 30 ? 'medium' : 'low';
    }

    return totalChanges > 20 ? 'medium' : 'low';
  }

  /**
   * Generate file change summary
   */
  private generateFileSummary(filePath: string, status: FileDiff['status'], additions: number, deletions: number, changeType: string): string {
    const fileName = filePath.split('/').pop() || filePath;
    const changeDesc = this.getChangeDescription(changeType, additions, deletions);
    
    switch (status) {
      case 'added':
        return `Added ${fileName} (${changeDesc})`;
      case 'deleted':
        return `Deleted ${fileName}`;
      case 'renamed':
        return `Renamed ${fileName}`;
      default:
        return `Modified ${fileName} (${changeDesc})`;
    }
  }

  /**
   * Get change description
   */
  private getChangeDescription(changeType: string, additions: number, deletions: number): string {
    const total = additions + deletions;
    const sizeDesc = total > 100 ? 'major' : total > 20 ? 'moderate' : 'minor';
    
    return `${changeType}, +${additions}/-${deletions}, ${sizeDesc}`;
  }

  /**
   * Generate overall summary
   */
  private generateSummary(fileDiffs: FileDiff[]): DiffSummary {
    const totalFiles = fileDiffs.length;
    const totalAdditions = fileDiffs.reduce((sum, file) => sum + file.additions, 0);
    const totalDeletions = fileDiffs.reduce((sum, file) => sum + file.deletions, 0);

    // Determine overall change type
    const changeTypes = fileDiffs.map(f => f.changeType);
    const overallType = this.determineOverallType(changeTypes);

    // Generate key changes summary
    const keyChanges = this.generateKeyChanges(fileDiffs);

    return {
      totalFiles,
      totalAdditions,
      totalDeletions,
      fileSummaries: fileDiffs.sort((a, b) => {
        // Sort by importance and change amount
        const importanceOrder = { high: 3, medium: 2, low: 1 };
        const aScore = importanceOrder[a.importance] * 10 + (a.additions + a.deletions);
        const bScore = importanceOrder[b.importance] * 10 + (b.additions + b.deletions);
        return bScore - aScore;
      }),
      overallType,
      keyChanges
    };
  }

  /**
   * Determine overall change type
   */
  private determineOverallType(changeTypes: string[]): DiffSummary['overallType'] {
    const typeCounts = changeTypes.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dominantType = Object.entries(typeCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0];

    if (!dominantType || Object.keys(typeCounts).length > 3) {
      return 'mixed';
    }

    const typeMapping: Record<string, DiffSummary['overallType']> = {
      'feature': 'feature',
      'fix': 'fix',
      'refactor': 'refactor',
      'docs': 'docs',
      'test': 'test',
      'style': 'style'
    };

    return typeMapping[dominantType] || 'mixed';
  }

  /**
   * Generate key changes summary
   */
  private generateKeyChanges(fileDiffs: FileDiff[]): string[] {
    const keyChanges: string[] = [];

    // High importance changes
    const highImportanceFiles = fileDiffs.filter(f => f.importance === 'high');
    if (highImportanceFiles.length > 0) {
      keyChanges.push(`high_importance_files_${highImportanceFiles.length}`);
    }

    // Added files
    const addedFiles = fileDiffs.filter(f => f.status === 'added');
    if (addedFiles.length > 0) {
      keyChanges.push(`added_files_${addedFiles.length}`);
    }

    // Deleted files
    const deletedFiles = fileDiffs.filter(f => f.status === 'deleted');
    if (deletedFiles.length > 0) {
      keyChanges.push(`deleted_files_${deletedFiles.length}`);
    }

    // Files with large changes
    const largeChanges = fileDiffs.filter(f => (f.additions + f.deletions) > 100);
    if (largeChanges.length > 0) {
      keyChanges.push(`large_changes_${largeChanges.length}_files_over_100_lines`);
    }

    // If no special changes, add general description
    if (keyChanges.length === 0) {
      keyChanges.push('general_code_modifications');
    }

    return keyChanges;
  }

}