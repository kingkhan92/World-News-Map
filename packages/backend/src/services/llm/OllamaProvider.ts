import { BaseLLMProvider } from './BaseLLMProvider.js';
import { 
  ProviderType, 
  BiasAnalysisRequest, 
  BiasAnalysisResult,
  ProviderError,
  ProviderErrorType 
} from '../../types/llmProvider.js';

/**
 * Ollama local provider implementation
 * This is a placeholder that will be fully implemented in task 27
 */
export class OllamaProvider extends BaseLLMProvider {
  public readonly name = 'Ollama';
  public readonly type: ProviderType = 'ollama';

  protected async performAnalysis(request: BiasAnalysisRequest): Promise<BiasAnalysisResult> {
    // TODO: Implement in task 27 - Build Ollama local provider implementation
    throw new ProviderError(
      ProviderErrorType.CONFIGURATION_ERROR,
      this.name,
      'Ollama provider not yet implemented. Will be implemented in task 27.'
    );
  }

  protected async performHealthCheck(): Promise<void> {
    // TODO: Implement in task 27 - Build Ollama local provider implementation
    throw new ProviderError(
      ProviderErrorType.CONFIGURATION_ERROR,
      this.name,
      'Ollama provider health check not yet implemented. Will be implemented in task 27.'
    );
  }
}