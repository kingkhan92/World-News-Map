#!/usr/bin/env node

/**
 * Comprehensive test runner for the backend application
 * Runs all test suites and generates coverage reports
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

interface TestSuite {
  name: string;
  pattern: string;
  description: string;
}

const testSuites: TestSuite[] = [
  {
    name: 'unit',
    pattern: 'src/**/*.test.ts',
    description: 'Unit tests for services, models, and utilities',
  },
  {
    name: 'integration',
    pattern: 'src/__tests__/integration/**/*.test.ts',
    description: 'Integration tests for API endpoints and workflows',
  },
  {
    name: 'models',
    pattern: 'src/models/**/*.test.ts',
    description: 'Database model tests',
  },
  {
    name: 'routes',
    pattern: 'src/routes/**/*.test.ts',
    description: 'API route tests with Supertest',
  },
  {
    name: 'services',
    pattern: 'src/services/**/*.test.ts',
    description: 'Service layer tests',
  },
];

function runCommand(command: string, description: string): boolean {
  console.log(`\n🔄 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit', cwd: process.cwd() });
    console.log(`✅ ${description} completed successfully`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed`);
    return false;
  }
}

function runTestSuite(suite: TestSuite): boolean {
  console.log(`\n📋 Running ${suite.name} tests: ${suite.description}`);
  
  const command = `vitest run --reporter=verbose --coverage ${suite.pattern}`;
  return runCommand(command, `${suite.name} tests`);
}

function setupTestDatabase(): boolean {
  console.log('\n🗄️  Setting up test database...');
  
  // Run database migrations for test environment
  const migrationResult = runCommand(
    'NODE_ENV=test npm run migrate',
    'Database migrations'
  );
  
  if (!migrationResult) {
    return false;
  }
  
  // Seed test data
  const seedResult = runCommand(
    'NODE_ENV=test npm run seed',
    'Database seeding'
  );
  
  return seedResult;
}

function runAllTests(): boolean {
  console.log('🚀 Starting comprehensive test suite...\n');
  
  // Setup test database first
  if (!setupTestDatabase()) {
    console.error('❌ Failed to setup test database');
    return false;
  }
  
  const results: boolean[] = [];
  
  // Run each test suite
  for (const suite of testSuites) {
    results.push(runTestSuite(suite));
  }
  
  // Generate comprehensive coverage report
  console.log('\n📊 Generating comprehensive coverage report...');
  const coverageResult = runCommand(
    'vitest run --coverage --reporter=html',
    'Coverage report generation'
  );
  results.push(coverageResult);
  
  // Run API documentation tests
  console.log('\n📚 Validating API documentation...');
  const docResult = runCommand(
    'npm run test:api-docs',
    'API documentation validation'
  );
  results.push(docResult);
  
  // Summary
  const passed = results.filter(Boolean).length;
  const total = results.length;
  
  console.log('\n📈 Test Summary:');
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed successfully!');
    return true;
  } else {
    console.log('\n⚠️  Some tests failed. Please review the output above.');
    return false;
  }
}

function runSpecificSuite(suiteName: string): boolean {
  const suite = testSuites.find(s => s.name === suiteName);
  if (!suite) {
    console.error(`❌ Unknown test suite: ${suiteName}`);
    console.log('Available suites:', testSuites.map(s => s.name).join(', '));
    return false;
  }
  
  // Setup test database for integration tests
  if (suiteName === 'integration' || suiteName === 'models') {
    if (!setupTestDatabase()) {
      console.error('❌ Failed to setup test database');
      return false;
    }
  }
  
  return runTestSuite(suite);
}

function runLoadTests(): boolean {
  console.log('\n⚡ Running load tests...');
  
  // Start the server in test mode
  console.log('Starting test server...');
  const serverProcess = execSync('npm run dev &', { stdio: 'pipe' });
  
  // Wait for server to start
  setTimeout(() => {
    const loadTestResult = runCommand(
      'artillery run load-tests/api-load-test.yml',
      'API load testing'
    );
    
    // Kill the server process
    execSync('pkill -f "npm run dev"', { stdio: 'ignore' });
    
    return loadTestResult;
  }, 5000);
  
  return true;
}

function showHelp(): void {
  console.log('Backend Test Runner\n');
  console.log('Usage:');
  console.log('  npm run test:all          - Run all test suites');
  console.log('  npm run test:unit         - Run unit tests only');
  console.log('  npm run test:integration  - Run integration tests only');
  console.log('  npm run test:models       - Run model tests only');
  console.log('  npm run test:routes       - Run route tests only');
  console.log('  npm run test:services     - Run service tests only');
  console.log('  npm run test:load         - Run load tests');
  console.log('  npm run test:watch        - Run tests in watch mode');
  console.log('  npm run test:coverage     - Run tests with coverage report\n');
  
  console.log('Available test suites:');
  testSuites.forEach(suite => {
    console.log(`  ${suite.name.padEnd(12)} - ${suite.description}`);
  });
}

// Main execution
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'all':
    process.exit(runAllTests() ? 0 : 1);
    break;
  case 'unit':
  case 'integration':
  case 'models':
  case 'routes':
  case 'services':
    process.exit(runSpecificSuite(command) ? 0 : 1);
    break;
  case 'load':
    process.exit(runLoadTests() ? 0 : 1);
    break;
  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;
  default:
    if (command) {
      console.error(`❌ Unknown command: ${command}\n`);
    }
    showHelp();
    process.exit(1);
}