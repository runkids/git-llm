import { BaseGitTool } from '../base/base-git-tool.js';
import * as path from 'path';

export class SmartCommitTool extends BaseGitTool {
  constructor() {
    super(
      'smart_commit',
      'Automatically stage all changes, generate commit message, and create commit',
      async () => {
        try {
          const cwd = this.getCwd();
          this.validateGitRepository(cwd);
          
          // Check for uncommitted changes
          const status = this.executeGitCommand('git status --porcelain', cwd).trim();
          if (!status) {
            return 'No changes to commit. Your working tree is clean.';
          }
          
          // Stage all changes
          this.executeGitCommand('git add .', cwd);
          
          // Get staged changes for commit message generation
          const stagedDiff = this.executeGitCommand('git diff --cached', cwd);
          
          if (!stagedDiff.trim()) {
            return 'No changes were staged for commit.';
          }

          // Generate intelligent commit message based on changes
          const commitMessage = this.generateSmartCommitMessage(stagedDiff);
          
          // Create the commit
          const commitResult = this.executeGitCommand(`git commit -m "${commitMessage}"`, cwd);
          
          // Get the commit hash and info
          const commitInfo = this.executeGitCommand('git log -1 --oneline', cwd).trim();
          
          return `✅ Successfully committed changes!\n\nCommit: ${commitInfo}\nMessage: "${commitMessage}"\n\n${commitResult.trim()}`;
          
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          
          // Provide helpful error messages for common issues
          if (errorMsg.includes('nothing to commit')) {
            return 'No changes to commit. Your working tree is clean.';
          }
          if (errorMsg.includes('not a git repository')) {
            return 'Error: Not in a git repository. Please navigate to a Git repository first.';
          }
          if (errorMsg.includes('Please tell me who you are')) {
            return 'Git user configuration required. Please set:\n  git config user.name "Your Name"\n  git config user.email "your.email@example.com"';
          }
          
          return `Error creating commit: ${errorMsg}`;
        }
      }
    );
  }

  /**
   * Generate intelligent commit message based on file changes and patterns
   */
  private generateSmartCommitMessage(diff: string): string {
    const lines = diff.split('\n');
    
    // Analyze file changes
    const fileChanges = this.analyzeFileChanges(lines);
    const codePatterns = this.analyzeCodePatterns(lines);
    
    // Determine commit type based on patterns
    const commitType = this.determineCommitType(fileChanges, codePatterns);
    
    // Generate conventional commit message
    return this.buildConventionalCommit(commitType, fileChanges, codePatterns);
  }

  /**
   * Analyze what files were changed and how
   */
  private analyzeFileChanges(lines: string[]): {
    added: string[];
    modified: string[];
    deleted: string[];
    fileTypes: Map<string, number>;
  } {
    const added: string[] = [];
    const modified: string[] = [];
    const deleted: string[] = [];
    const fileTypes = new Map<string, number>();

    for (const line of lines) {
      if (line.startsWith('+++') && !line.includes('/dev/null')) {
        const filePath = line.substring(4);
        if (!modified.includes(filePath) && !added.includes(filePath)) {
          // Check if this is a new file
          const hasMinusCounter = lines.some(l => l.startsWith('---') && l.includes(filePath));
          if (!hasMinusCounter) {
            added.push(filePath);
          } else {
            modified.push(filePath);
          }
        }
        
        // Track file types
        const ext = path.extname(filePath).toLowerCase();
        fileTypes.set(ext, (fileTypes.get(ext) || 0) + 1);
      } else if (line.startsWith('---') && !line.includes('/dev/null')) {
        const filePath = line.substring(4);
        const hasPlusCounter = lines.some(l => l.startsWith('+++') && l.includes(filePath));
        if (!hasPlusCounter) {
          deleted.push(filePath);
        }
      }
    }

    return { added, modified, deleted, fileTypes };
  }

  /**
   * Analyze code patterns to determine the nature of changes
   */
  private analyzeCodePatterns(lines: string[]): {
    hasTests: boolean;
    hasDocs: boolean;
    hasConfig: boolean;
    hasNewFunctions: boolean;
    hasFixPatterns: boolean;
    hasRefactoring: boolean;
    hasTypeChanges: boolean;
    addedLines: number;
    removedLines: number;
  } {
    let hasTests = false;
    let hasDocs = false;
    let hasConfig = false;
    let hasNewFunctions = false;
    let hasFixPatterns = false;
    let hasRefactoring = false;
    let hasTypeChanges = false;
    let addedLines = 0;
    let removedLines = 0;

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      // Count line changes
      if (line.startsWith('+') && !line.startsWith('+++')) {
        addedLines++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        removedLines++;
      }
      
      // Detect patterns
      if (lowerLine.includes('test') || lowerLine.includes('spec') || lowerLine.includes('.test.')) {
        hasTests = true;
      }
      
      if (lowerLine.includes('readme') || lowerLine.includes('.md') || lowerLine.includes('doc')) {
        hasDocs = true;
      }
      
      if (lowerLine.includes('config') || lowerLine.includes('.json') || lowerLine.includes('.yml') || lowerLine.includes('.env')) {
        hasConfig = true;
      }
      
      if (line.startsWith('+') && (lowerLine.includes('function') || lowerLine.includes('def ') || lowerLine.includes('class ') || lowerLine.includes('export'))) {
        hasNewFunctions = true;
      }
      
      if (lowerLine.includes('fix') || lowerLine.includes('bug') || lowerLine.includes('error') || lowerLine.includes('patch')) {
        hasFixPatterns = true;
      }
      
      if (lowerLine.includes('refactor') || lowerLine.includes('rename') || lowerLine.includes('move') || lowerLine.includes('extract')) {
        hasRefactoring = true;
      }
      
      if (lowerLine.includes('type') || lowerLine.includes('interface') || lowerLine.includes('enum')) {
        hasTypeChanges = true;
      }
    }

    return {
      hasTests, hasDocs, hasConfig, hasNewFunctions, hasFixPatterns, 
      hasRefactoring, hasTypeChanges, addedLines, removedLines
    };
  }

  /**
   * Determine the appropriate commit type based on analysis
   */
  private determineCommitType(fileChanges: any, patterns: any): string {
    // Priority order for commit types
    if (patterns.hasFixPatterns) return 'fix';
    if (patterns.hasNewFunctions && fileChanges.added.length > 0) return 'feat';
    if (patterns.hasTests) return 'test';
    if (patterns.hasDocs) return 'docs';
    if (patterns.hasConfig) return 'config';
    if (patterns.hasRefactoring) return 'refactor';
    if (patterns.hasTypeChanges) return 'types';
    if (fileChanges.added.length > 0) return 'feat';
    if (fileChanges.deleted.length > 0) return 'remove';
    if (patterns.addedLines > patterns.removedLines * 2) return 'enhance';
    
    return 'update';
  }

  /**
   * Build conventional commit message
   */
  private buildConventionalCommit(type: string, fileChanges: any, patterns: any): string {
    const scope = this.determineScope(fileChanges);
    const description = this.generateDescription(type, fileChanges, patterns);
    
    // Build conventional commit format: type(scope): description
    let commit = type;
    if (scope) {
      commit += `(${scope})`;
    }
    commit += `: ${description}`;
    
    return commit;
  }

  /**
   * Determine the scope based on file changes
   */
  private determineScope(fileChanges: any): string | null {
    const allFiles = [...fileChanges.added, ...fileChanges.modified, ...fileChanges.deleted];
    
    // Common scope patterns
    if (allFiles.some(f => f.includes('src/components'))) return 'components';
    if (allFiles.some(f => f.includes('src/services'))) return 'services';
    if (allFiles.some(f => f.includes('src/tools'))) return 'tools';
    if (allFiles.some(f => f.includes('src/workflows'))) return 'workflows';
    if (allFiles.some(f => f.includes('test') || f.includes('spec'))) return 'tests';
    if (allFiles.some(f => f.includes('config') || f.includes('.json'))) return 'config';
    if (allFiles.some(f => f.includes('docs') || f.includes('.md'))) return 'docs';
    if (allFiles.some(f => f.includes('src/api'))) return 'api';
    if (allFiles.some(f => f.includes('src/utils'))) return 'utils';
    
    // If all files are in the same directory, use that as scope
    const commonPath = this.findCommonPath(allFiles);
    if (commonPath && commonPath.length > 0) {
      return commonPath.split('/').pop() || null;
    }
    
    return null;
  }

  /**
   * Generate descriptive text for the commit
   */
  private generateDescription(type: string, fileChanges: any, patterns: any): string {
    const { added, modified, deleted } = fileChanges;
    
    switch (type) {
      case 'feat':
        if (patterns.hasNewFunctions) {
          return `add new functionality with ${added.length + modified.length} file changes`;
        }
        return `add ${added.length} new file${added.length === 1 ? '' : 's'}`;
        
      case 'fix':
        return `resolve issues and improve stability`;
        
      case 'refactor':
        return `improve code structure and maintainability`;
        
      case 'test':
        return `add and update tests for better coverage`;
        
      case 'docs':
        return `update documentation and improve clarity`;
        
      case 'config':
        return `update configuration and build settings`;
        
      case 'types':
        return `improve type definitions and interfaces`;
        
      case 'remove':
        return `remove ${deleted.length} obsolete file${deleted.length === 1 ? '' : 's'}`;
        
      case 'enhance':
        return `improve existing functionality with ${patterns.addedLines} additions`;
        
      default: // 'update'
        return `update ${modified.length} file${modified.length === 1 ? '' : 's'} with improvements`;
    }
  }

  /**
   * Find common path among files
   */
  private findCommonPath(files: string[]): string {
    if (files.length === 0) return '';
    if (files.length === 1) return path.dirname(files[0]);
    
    const paths = files.map(f => path.dirname(f).split('/'));
    const commonParts: string[] = [];
    
    const minLength = Math.min(...paths.map(p => p.length));
    
    for (let i = 0; i < minLength; i++) {
      const part = paths[0][i];
      if (paths.every(p => p[i] === part)) {
        commonParts.push(part);
      } else {
        break;
      }
    }
    
    return commonParts.join('/');
  }
}