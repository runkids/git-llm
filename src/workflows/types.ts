export interface GitContext {
  branch: string;
  status: string;
  hasUncommittedChanges: boolean;
  recentCommits: string[];
  workingDirectory: string;
}

export interface AnalysisResult {
  type: 'git' | 'code' | 'suggestion';
  content: string;
  confidence: number;
  actions?: string[];
}

export interface WorkflowState {
  messages: any[];
  gitContext?: GitContext;
  analysisResults: AnalysisResult[];
  currentStep: string;
  userInput: string;
  workflowType?: 'git' | 'code' | 'general';
}

export interface WorkflowResult {
  response: string;
  state: WorkflowState;
  suggestedActions?: string[];
}

export type WorkflowType = 'git-analysis' | 'code-review' | 'general-chat' | 'commit-help';