import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import type { WorkflowResult, AnalysisResult } from '../types.js';
import type { RoutingInfo } from '../../services/types.js';

export interface WorkflowState {
  userInput: string;
  analysisResults: AnalysisResult[];
  currentStep: string;
  isExecuteMode?: boolean;
  isSuggestMode?: boolean;
  needsConfirmation?: boolean;
}

export abstract class BaseWorkflow {
  protected llm: ChatOpenAI;
  protected tools: any[];

  constructor(llm: ChatOpenAI, tools: any[] = []) {
    this.llm = llm;
    this.tools = tools;
  }

  /**
   * Abstract method that each workflow must implement
   */
  abstract executeWorkflow(
    userInput: string, 
    onRoutingUpdate?: (info: RoutingInfo) => void
  ): Promise<WorkflowResult>;

  /**
   * Common error handling for all workflows
   */
  protected handleWorkflowError(error: Error, step: string): WorkflowResult {
    return {
      response: `Error during ${step}: ${error.message}`,
      state: {
        messages: [],
        analysisResults: [{
          type: 'git',
          content: `Error in ${step}: ${error.message}`,
          confidence: 1.0
        }],
        currentStep: 'error',
        userInput: ''
      }
    };
  }

  /**
   * Parse execution mode from user input
   */
  protected parseExecutionMode(userInput: string): {
    isExecuteMode: boolean;
    isSuggestMode: boolean;
    actualInput: string;
  } {
    const isExecuteMode = userInput.startsWith('EXECUTE:');
    const isSuggestMode = userInput.startsWith('SUGGEST:');
    const actualInput = isExecuteMode || isSuggestMode 
      ? userInput.substring(userInput.indexOf(':') + 1).trim()
      : userInput;

    return { isExecuteMode, isSuggestMode, actualInput };
  }

  /**
   * Common LLM invocation with error handling
   */
  protected async invokeLLM(prompt: string): Promise<string> {
    try {
      const response = await this.llm.invoke([new HumanMessage(prompt)]);
      return response.content as string;
    } catch (error) {
      throw new Error(`LLM invocation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}