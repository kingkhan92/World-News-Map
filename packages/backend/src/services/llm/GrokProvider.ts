import { BaseLLMProvider } from './BaseLLMProvider.js';
import { 
  ProviderType, 
  BiasAnalysisRequest, 
  BiasAnalysisResult,
  ProviderError,
  ProviderErrorType 
} from '../../types/llmProvider.js';

/**
 * Grok API provider implementation
 * This is a placeholder that will be fully implemented in task 26
 */
export class GrokProvider extends BaseLLMProvider {
  public readonly name = 'Grok';
  public readonly type: ProviderType = 'grok';

  protected async performAnalysis(request: BiasAnalysisRequest): Promise<BiasAnalysisResult> {
    // TODO: Implement in task 26 - Build Grok API provider implementation
    throw new ProviderError(
      ProviderErrorType.CONFIGURATION_ERROR,
      this.name,
      'Grok provider not yet implemented. Will be implemented in task 26.'
    );
  }

  protected async performHealthCheck(): Promise<void> {
    // TODO: Implement in task 26 - Build Grok API provider implementation
    throw new ProviderError(
      ProviderErrorType.CONFIGURATION_ERROR,
      this.name,
      'Grok provider health check not yet implemented. Will be implemented in task 26.'
    );
  }
}