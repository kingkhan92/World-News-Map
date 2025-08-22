// Core interfaces and types
export * from '../../types/llmProvider.js';

// Base provider class
export { BaseLLMProvider } from './BaseLLMProvider.js';

// Provider implementations
export { OpenAIProvider } from './OpenAIProvider.js';
export { GrokProvider } from './GrokProvider.js';
export { OllamaProvider } from './OllamaProvider.js';

// Factory and management
export { ProviderFactory, createFactoryConfigFromEnv } from './ProviderFactory.js';
export { ProviderConfigManager } from './ProviderConfigManager.js';
export { ProviderHealthMonitor } from './ProviderHealthMonitor.js';

// Convenience function to initialize the LLM system
export async function initializeLLMSystem(): Promise<{
  factory: ProviderFactory;
  configManager: ProviderConfigManager;
  healthMonitor: ProviderHealthMonitor;
}> {
  const configManager = ProviderConfigManager.getInstance();
  const factoryConfig = configManager.getFactoryConfig();
  
  const factory = ProviderFactory.getInstance(factoryConfig);
  await factory.initialize();
  
  const healthMonitor = new ProviderHealthMonitor(factory);
  healthMonitor.startMonitoring();
  
  return {
    factory,
    configManager,
    healthMonitor
  };
}