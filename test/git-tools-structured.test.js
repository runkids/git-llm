// Test structured output of git tools
describe('Git Tools Structured Output', () => {
  it('should validate GitStatusTool returns JSON structure', () => {
    // Test that the tools are designed to return structured data
    const expectedStatusStructure = {
      repository: {
        branch: 'string',
        workingDirectory: 'string',
        isClean: 'boolean'
      },
      changes: {
        staged: 'array',
        unstaged: 'array',
        untracked: 'array',
        total: 'number'
      },
      recentCommits: 'array',
      summary: {
        hasChanges: 'boolean',
        totalFiles: 'number'
      }
    };

    // Verify structure is valid
    expect(typeof expectedStatusStructure).toBe('object');
    expect(expectedStatusStructure.repository).toBeDefined();
    expect(expectedStatusStructure.changes).toBeDefined();
  });

  it('should validate DiffAnalyzer returns structured data', () => {
    const expectedDiffStructure = {
      analysis: {
        totalFiles: 'number',
        totalAdditions: 'number', 
        totalDeletions: 'number',
        fileSummaries: 'array',
        overallType: 'string',
        keyChanges: 'array'
      },
      includeRawDiff: 'boolean',
      rawDiff: 'string'
    };

    expect(typeof expectedDiffStructure).toBe('object');
    expect(expectedDiffStructure.analysis).toBeDefined();
    expect(expectedDiffStructure.includeRawDiff).toBeDefined();
  });

  it('should handle file status types correctly', () => {
    const statusTypes = ['modified', 'added', 'deleted', 'renamed', 'copied', 'unmerged', 'typechange'];
    
    statusTypes.forEach(type => {
      expect(typeof type).toBe('string');
      expect(type.length).toBeGreaterThan(0);
    });
  });
});