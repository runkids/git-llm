import { DynamicTool } from '@langchain/core/tools';
import * as fs from 'fs';
import * as path from 'path';

export class FileReaderTool extends DynamicTool {
  constructor() {
    super({
      name: 'read_file',
      description: 'Read contents of a file in the current repository',
      func: async (filePath: string) => {
        try {
          if (!filePath) {
            return 'Error: File path is required';
          }

          const cwd = process.cwd();
          const fullPath = path.resolve(cwd, filePath);
          
          // Security check - ensure we're reading within the current directory
          if (!fullPath.startsWith(cwd)) {
            return 'Error: Access denied - file outside working directory';
          }

          if (!fs.existsSync(fullPath)) {
            return `Error: File not found: ${filePath}`;
          }

          const content = fs.readFileSync(fullPath, 'utf-8');
          return `File: ${filePath}\n${'='.repeat(50)}\n${content}`;
        } catch (error) {
          return `Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }
    });
  }
}