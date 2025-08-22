import { useState, useEffect } from 'react';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

export const useAppVersion = (): string => {
  const [version, setVersion] = useState<string>('0.0.1');

  useEffect(() => {
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const packageJsonPath = join(__dirname, '../../package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      setVersion(packageJson.version);
    } catch (err) {
      console.warn('Failed to read version from package.json:', err);
      // Keep default version
    }
  }, []);

  return version;
};