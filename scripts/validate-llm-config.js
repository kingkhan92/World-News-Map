#!/usr/bin/env node

/**
 * LLM Provider Configuration Validation Script
 * 
 * This script validates the LLM provider configuration before starting the application.
 * It checks for required environment variables and validates provider availability.
 */

const https = require('https');
const http = require('http');

// Configuration validation rules
const PROVIDER_CONFIGS = {
  openai: {
    required: ['OPENAI_API_KEY'],
    optional: ['OPENAI_MODEL', 'OPENAI_BASE_URL', 'OPENAI_TIMEOUT', 'OPENAI_MAX_RETRIES'],
    defaults: {
      OPENAI_MODEL: 'gpt-3.5-turbo',
      OPENAI_BASE_URL: 'https://api.openai.com/v1',
      OPENAI_TIMEOUT: '30000',
      OPENAI_MAX_RETRIES: '3'
    }
  },
  grok: {
    required: ['GROK_API_KEY'],
    optional: ['GROK_MODEL', 'GROK_BASE_URL', 'GROK_TIMEOUT', 'GROK_MAX_RETRIES'],
    defaults: {
      GROK_MODEL: 'grok-beta',
      GROK_BASE_URL: 'https://api.x.ai/v1',
      GROK_TIMEOUT: '30000',
      GROK_MAX_RETRIES: '3'
    }
  },
  ollama: {
    required: ['OLLAMA_BASE_URL'],
    optional: ['OLLAMA_MODEL', 'OLLAMA_TIMEOUT', 'OLLAMA_MAX_RETRIES'],
    defaults: {
      OLLAMA_BASE_URL: 'http://localhost:11434',
      OLLAMA_MODEL: 'llama2:7b',
      OLLAMA_TIMEOUT: '60000',
      OLLAMA_MAX_RETRIES: '2'
    }
  }
};

class ConfigValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.primaryProvider = process.env.BIAS_ANALYSIS_PROVIDER || 'openai';
    this.fallbackProviders = (process.env.BIAS_ANALYSIS_FALLBACK_PROVIDERS || 'openai,ollama').split(',');
  }

  log(level, message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
  }

  error(message) {
    this.errors.push(message);
    this.log('error', message);
  }

  warn(message) {
    this.warnings.push(message);
    this.log('warn', message);
  }

  info(message) {
    this.log('info', message);
  }

  validateProvider(providerName) {
    const config = PROVIDER_CONFIGS[providerName];
    if (!config) {
      this.error(`Unknown provider: ${providerName}`);
      return false;
    }

    this.info(`Validating ${providerName} provider configuration...`);

    // Check required environment variables
    for (const required of config.required) {
      if (!process.env[required]) {
        this.error(`Missing required environment variable for ${providerName}: ${required}`);
      }
    }

    // Set defaults for optional variables
    for (const [key, defaultValue] of Object.entries(config.defaults)) {
      if (!process.env[key]) {
        process.env[key] = defaultValue;
        this.info(`Set default value for ${key}: ${defaultValue}`);
      }
    }

    return this.errors.length === 0;
  }

  async checkProviderHealth(providerName) {
    this.info(`Checking health for ${providerName} provider...`);

    try {
      switch (providerName) {
        case 'openai':
          return await this.checkOpenAIHealth();
        case 'grok':
          return await this.checkGrokHealth();
        case 'ollama':
          return await this.checkOllamaHealth();
        default:
          this.warn(`Health check not implemented for provider: ${providerName}`);
          return false;
      }
    } catch (error) {
      this.warn(`Health check failed for ${providerName}: ${error.message}`);
      return false;
    }
  }

  async checkOpenAIHealth() {
    const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      this.warn('OpenAI API key not provided, skipping health check');
      return false;
    }

    return new Promise((resolve) => {
      const url = new URL('/v1/models', baseUrl);
      const options = {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'news-map-health-check/1.0'
        },
        timeout: 10000
      };

      const request = https.request(url, options, (response) => {
        if (response.statusCode === 200) {
          this.info('OpenAI API is accessible');
          resolve(true);
        } else {
          this.warn(`OpenAI API returned status: ${response.statusCode}`);
          resolve(false);
        }
      });

      request.on('error', (error) => {
        this.warn(`OpenAI health check failed: ${error.message}`);
        resolve(false);
      });

      request.on('timeout', () => {
        this.warn('OpenAI health check timed out');
        resolve(false);
      });

      request.end();
    });
  }

  async checkGrokHealth() {
    const baseUrl = process.env.GROK_BASE_URL || 'https://api.x.ai/v1';
    const apiKey = process.env.GROK_API_KEY;

    if (!apiKey) {
      this.warn('Grok API key not provided, skipping health check');
      return false;
    }

    return new Promise((resolve) => {
      const url = new URL('/v1/models', baseUrl);
      const options = {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'news-map-health-check/1.0'
        },
        timeout: 10000
      };

      const request = https.request(url, options, (response) => {
        if (response.statusCode === 200) {
          this.info('Grok API is accessible');
          resolve(true);
        } else {
          this.warn(`Grok API returned status: ${response.statusCode}`);
          resolve(false);
        }
      });

      request.on('error', (error) => {
        this.warn(`Grok health check failed: ${error.message}`);
        resolve(false);
      });

      request.on('timeout', () => {
        this.warn('Grok health check timed out');
        resolve(false);
      });

      request.end();
    });
  }

  async checkOllamaHealth() {
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

    return new Promise((resolve) => {
      const url = new URL('/api/tags', baseUrl);
      const options = {
        method: 'GET',
        timeout: 10000
      };

      const client = url.protocol === 'https:' ? https : http;
      const request = client.request(url, options, (response) => {
        if (response.statusCode === 200) {
          this.info('Ollama service is accessible');
          resolve(true);
        } else {
          this.warn(`Ollama service returned status: ${response.statusCode}`);
          resolve(false);
        }
      });

      request.on('error', (error) => {
        this.warn(`Ollama health check failed: ${error.message}`);
        resolve(false);
      });

      request.on('timeout', () => {
        this.warn('Ollama health check timed out');
        resolve(false);
      });

      request.end();
    });
  }

  async validateConfiguration() {
    this.info('Starting LLM provider configuration validation...');

    // Validate primary provider
    this.info(`Primary provider: ${this.primaryProvider}`);
    this.validateProvider(this.primaryProvider);

    // Validate fallback providers
    this.info(`Fallback providers: ${this.fallbackProviders.join(', ')}`);
    for (const provider of this.fallbackProviders) {
      const trimmedProvider = provider.trim();
      if (trimmedProvider && trimmedProvider !== this.primaryProvider) {
        this.validateProvider(trimmedProvider);
      }
    }

    // Check for configuration errors
    if (this.errors.length > 0) {
      this.error(`Configuration validation failed with ${this.errors.length} error(s)`);
      return false;
    }

    // Perform health checks if requested
    if (process.env.LLM_SKIP_HEALTH_CHECK !== 'true') {
      this.info('Performing provider health checks...');
      
      const primaryHealthy = await this.checkProviderHealth(this.primaryProvider);
      if (!primaryHealthy) {
        this.warn(`Primary provider ${this.primaryProvider} is not healthy`);
      }

      // Check at least one fallback provider
      let fallbackHealthy = false;
      for (const provider of this.fallbackProviders) {
        const trimmedProvider = provider.trim();
        if (trimmedProvider && trimmedProvider !== this.primaryProvider) {
          const healthy = await this.checkProviderHealth(trimmedProvider);
          if (healthy) {
            fallbackHealthy = true;
            break;
          }
        }
      }

      if (!primaryHealthy && !fallbackHealthy) {
        this.error('No healthy LLM providers found. Application may not function correctly.');
        return false;
      }
    } else {
      this.info('Skipping health checks (LLM_SKIP_HEALTH_CHECK=true)');
    }

    this.info('LLM provider configuration validation completed successfully');
    if (this.warnings.length > 0) {
      this.warn(`Validation completed with ${this.warnings.length} warning(s)`);
    }

    return true;
  }
}

// Main execution
async function main() {
  const validator = new ConfigValidator();
  
  try {
    const isValid = await validator.validateConfiguration();
    
    if (isValid) {
      console.log('✅ LLM provider configuration is valid');
      process.exit(0);
    } else {
      console.log('❌ LLM provider configuration validation failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Unexpected error during validation:', error.message);
    process.exit(1);
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = { ConfigValidator };