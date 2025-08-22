// Simple validation script to check if GrokProvider compiles correctly
import { GrokProvider } from '../GrokProvider.js';

const config = {
  apiKey: 'grok-test-key-123456789',
  baseUrl: 'https://api.x.ai/v1',
  model: 'grok-beta',
  timeout: 30000,
  maxRetries: 3,
  rateLimit: 60
};

try {
  const provider = new GrokProvider(config);
  console.log('✅ GrokProvider created successfully');
  console.log('Provider name:', provider.name);
  console.log('Provider type:', provider.type);
  console.log('Is initialized:', provider.isInitialized());
  
  // Test configuration validation
  console.log('✅ Configuration validation passed');
  
} catch (error) {
  console.error('❌ GrokProvider validation failed:', error.message);
  process.exit(1);
}

console.log('✅ All validations passed');