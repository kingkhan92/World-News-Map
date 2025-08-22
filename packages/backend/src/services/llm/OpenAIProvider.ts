import { BaseLLMProvider } from './BaseLLMProvider.js';
import { 
  ProviderType, 
  BiasAnalysisRequest, 
  BiasAnalysisResult,
  ProviderError,
  ProviderErrorType 
} from '../../types/llmProvider.js';

/**
 * OpenAI provider implementation
 * This is a placeholder that will be fully implemented in task 25
 */
export class OpenAIProvider extends BaseLLMProvider {
  public readonly name = 'OpenAI';
  public readonly type: ProviderType = 'openai';

  protected async performAnalysis(request: BiasAnalysisRequest): Promise<BiasAnalysisResult> {
    // TODO: Implement in task 25 - Build OpenAI provider implementation
    throw new ProviderError(
      ProviderErrorType.CONFIGURATION_ERROR,
      this.name,
      'OpenAI provider not yet implemented. Will be implemented in task 25.'
    );
  }

  protected async performHealthCheck(): Promise<void> {
    // TODO: Implement in task 25 - Build OpenAI provider implementation
    throw new ProviderError(
      ProviderErrorType.CONFIGURATION_ERROR,
      this.name,
      'OpenAI provider health check not yet implemented. Will be implemented in task 25.'
    );
  }
}