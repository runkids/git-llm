export type LLMProvider = 'ollama' | 'lm-studio';

export interface BaseConfig {
  model: string;
  provider: LLMProvider;
}

export interface Config extends BaseConfig {
  provider: LLMProvider;
  baseUrl: string;
}

export interface ProviderSettings {
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
}

const DEFAULT_SETTINGS: ProviderSettings = {
  temperature: 0.7,
  maxTokens: 4096,
  streaming: true,
};

export function getConfig(): Config {
  const provider = (process.env.GIT_LLM_PROVIDER?.toLowerCase() || 'lm-studio') as LLMProvider;
  const model = process.env.GIT_LLM_MODEL || getDefaultModel(provider);
  
  switch (provider) {
    case 'ollama':
      return {
        provider,
        model,
        baseUrl: process.env.GIT_LLM_BASE_URL || 'http://localhost:11434',
      };
      
    case 'lm-studio':
      return {
        provider,
        model,
        baseUrl: process.env.GIT_LLM_BASE_URL || 'http://localhost:1234/v1',
      };
      
    default:
      throw new Error(`Unsupported provider: ${provider}. Supported providers: ollama, lm-studio`);
  }
}

// Backward compatibility helper that returns baseUrl as string (required for original interface)
export function getLegacyConfig(): { model: string; baseUrl: string; apiKey?: string } {
  const config = getConfig();
  
  return {
    model: config.model,
    baseUrl: config.baseUrl,
    apiKey: 'not-needed',
  };
}

export function getProviderSettings(): ProviderSettings {
  return {
    temperature: process.env.GIT_LLM_TEMPERATURE ? parseFloat(process.env.GIT_LLM_TEMPERATURE) : DEFAULT_SETTINGS.temperature,
    maxTokens: process.env.GIT_LLM_MAX_TOKENS ? parseInt(process.env.GIT_LLM_MAX_TOKENS) : DEFAULT_SETTINGS.maxTokens,
    streaming: process.env.GIT_LLM_STREAMING ? process.env.GIT_LLM_STREAMING.toLowerCase() === 'true' : DEFAULT_SETTINGS.streaming,
  };
}

function getDefaultModel(provider: LLMProvider): string {
  switch (provider) {
    case 'ollama':
      return 'llama3.1:8b';
    case 'lm-studio':
      return 'openai/gpt-oss-20b';
    default:
      return 'llama3.1:8b';
  }
}