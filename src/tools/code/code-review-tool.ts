import { BaseGitTool } from '../base/base-git-tool.js';
import * as fs from 'fs';
import * as path from 'path';

export class CodeReviewTool extends BaseGitTool {
  constructor() {
    super(
      'code_review',
      'Analyze modified files for code quality, issues, and suggestions',
      async () => {
        try {
          const cwd = this.getCwd();
          this.validateGitRepository(cwd);

          // Get list of modified files
          const statusOutput = this.executeGitCommand('git status --porcelain', cwd).trim();
          
          if (!statusOutput) {
            return 'No modified files found. Working directory is clean.';
          }

          // Parse modified files
          const modifiedFiles = statusOutput
            .split('\n')
            .filter(line => line.trim())
            .map(line => {
              const status = line.substring(0, 2);
              const filePath = line.substring(3);
              return { status: status.trim(), path: filePath };
            })
            .filter(file => 
              // Focus on code files
              file.path.match(/\.(ts|tsx|js|jsx|py|java|cpp|c|h|go|rs|php|rb|swift)$/) &&
              !file.path.includes('node_modules') &&
              !file.path.includes('.git')
            );

          if (modifiedFiles.length === 0) {
            return 'No code files were modified. Only non-code files have changes.';
          }

          // Analyze each modified file
          const reviews: string[] = [];
          
          for (const file of modifiedFiles.slice(0, 3)) { // Limit to 3 files to avoid overwhelming output
            try {
              const filePath = path.join(cwd, file.path);
              
              if (fs.existsSync(filePath)) {
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                const fileDiff = this.getFileDiff(file.path, cwd);
                
                const review = await this.analyzeFile(file.path, fileContent, fileDiff);
                reviews.push(review);
              }
            } catch (error) {
              reviews.push(`❌ Could not analyze ${file.path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }

          let result = `📊 Code Review Report\n\n`;
          result += `Files analyzed: ${modifiedFiles.length} modified code files\n\n`;
          
          if (modifiedFiles.length > 3) {
            result += `⚠️ Showing review for first 3 files only.\n\n`;
          }
          
          result += reviews.join('\n\n---\n\n');
          
          return result;
          
        } catch (error) {
          return `Code review failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }
    );
  }

  /**
   * Get git diff for a specific file
   */
  private getFileDiff(filePath: string, cwd: string): string {
    try {
      return this.executeGitCommand(`git diff "${filePath}"`, cwd);
    } catch {
      return '';
    }
  }

  /**
   * Analyze file content and changes using both static analysis and LLM
   */
  private async analyzeFile(filePath: string, content: string, diff: string): Promise<string> {
    const lines = content.split('\n');
    const fileSize = lines.length;
    const fileExt = path.extname(filePath);
    
    let analysis = `📁 **${filePath}** (${fileExt}, ${fileSize} lines)\n\n`;
    
    // Static analysis for common issues
    const staticIssues = this.performStaticAnalysis(content, filePath);
    
    // Diff analysis if available
    let diffAnalysis = '';
    if (diff) {
      const addedLines = (diff.match(/^\+[^+]/gm) || []).length;
      const removedLines = (diff.match(/^-[^-]/gm) || []).length;
      
      diffAnalysis = `📈 **Changes**: +${addedLines} -${removedLines} lines\n\n`;
      
      // Quick diff insights
      if (addedLines > 50) {
        staticIssues.suggestions.push('📊 Large changes - ensure adequate testing');
      }
      
      if (diff.includes('console.log')) {
        staticIssues.issues.push('🐛 New console.log statements added');
      }
    }
    
    analysis += diffAnalysis;
    
    // Format static analysis results
    if (staticIssues.issues.length > 0) {
      analysis += `**🚨 Issues Found:**\n${staticIssues.issues.map(i => `• ${i}`).join('\n')}\n\n`;
    }
    
    if (staticIssues.suggestions.length > 0) {
      analysis += `**💡 Suggestions:**\n${staticIssues.suggestions.map(s => `• ${s}`).join('\n')}\n\n`;
    }
    
    if (staticIssues.issues.length === 0 && staticIssues.suggestions.length === 0) {
      analysis += `✅ **No issues found** - code looks good!\n\n`;
    }
    
    return analysis;
  }

  /**
   * Perform static code analysis
   */
  private performStaticAnalysis(content: string, filePath: string): { issues: string[]; suggestions: string[] } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    const fileExt = path.extname(filePath);
    const lines = content.split('\n');
    
    // Console.log detection
    if (content.includes('console.log(') && !filePath.includes('test')) {
      issues.push('Contains console.log statements (consider removing for production)');
    }
    
    // TODO/FIXME detection
    if (content.includes('TODO') || content.includes('FIXME')) {
      const todoCount = (content.match(/TODO|FIXME/g) || []).length;
      issues.push(`Contains ${todoCount} TODO/FIXME comment${todoCount > 1 ? 's' : ''} that need attention`);
    }
    
    // TypeScript specific checks
    if (fileExt === '.ts' || fileExt === '.tsx') {
      if (content.includes(': any')) {
        const anyCount = (content.match(/: any/g) || []).length;
        issues.push(`Contains ${anyCount} 'any' type${anyCount > 1 ? 's' : ''} (consider using specific types)`);
      }
      
      if (!content.includes('interface') && !content.includes('type') && lines.length > 50) {
        suggestions.push('Consider adding type definitions for better type safety');
      }
      
      // Check for missing error handling
      if (content.includes('await ') && !content.includes('try') && !content.includes('catch')) {
        suggestions.push('Consider adding error handling for async operations');
      }
    }
    
    // General code quality checks
    if (lines.length > 300) {
      suggestions.push('Large file - consider breaking into smaller, focused modules');
    }
    
    // Function complexity (rough estimate)
    const functionCount = (content.match(/function|const \w+ = |=>|def /g) || []).length;
    if (functionCount > 10) {
      suggestions.push('High function density - consider splitting into multiple files');
    }
    
    // Unused imports (TypeScript/JavaScript)
    if ((fileExt === '.ts' || fileExt === '.tsx' || fileExt === '.js' || fileExt === '.jsx')) {
      const importLines = lines.filter(line => line.trim().startsWith('import'));
      if (importLines.length > 20) {
        suggestions.push('Many imports - check if all are necessary');
      }
    }
    
    // Security patterns
    if (content.includes('eval(') || content.includes('innerHTML')) {
      issues.push('🔒 Potential security risk - avoid eval() or innerHTML');
    }
    
    return { issues, suggestions };
  }
}