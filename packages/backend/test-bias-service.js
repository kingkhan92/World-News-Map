// Simple test script to verify bias analysis service
const { BiasAnalysisService } = require('./dist/services/biasAnalysisService.js');

async function testBiasService() {
  try {
    console.log('Testing bias analysis service...');
    
    // Test getting available providers
    const providers = await BiasAnalysisService.getAvailableProviders();
    console.log('Available providers:', providers);
    
    // Test getting provider configurations
    const configs = await BiasAnalysisService.getProviderConfigurations();
    console.log('Provider configurations:', Object.keys(configs));
    
    // Test provider health
    const health = await BiasAnalysisService.getProviderHealth();
    console.log('Provider health:', health);
    
    console.log('✅ Bias analysis service tests passed');
    
  } catch (error) {
    console.error('❌ Bias analysis service test failed:', error.message);
  }
}

testBiasService();