import type { Config, ProviderSettings } from '../../config/env.js';
import { BaseLLMProvider } from './base.js';
import { OllamaProvider } from './ollama.js';
import { LMStudioProvider } from './lm-studio.js';

export class LLMProviderFactory {
  static createProvider(config: Config, settings: ProviderSettings): BaseLLMProvider {
    switch (config.provider) {
      case 'ollama':
        return new OllamaProvider(config, settings);
        
      case 'lm-studio':
        return new LMStudioProvider(config, settings);
        
      default:
        throw new Error(`Unsupported provider: ${config.provider}. Supported providers: ollama, lm-studio`);
    }
  }

  static getProviderDisplayName(provider: string): string {
    const displayNames = {
      'ollama': 'Ollama',
      'lm-studio': 'LM Studio',
    };
    
    return displayNames[provider as keyof typeof displayNames] || provider;
  }

  static getSupportedProviders(): string[] {
    return ['ollama', 'lm-studio'];
  }
}