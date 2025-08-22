#!/usr/bin/env node

/**
 * Comprehensive test runner for the frontend application
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
    pattern: 'src/**/*.test.{ts,tsx}',
    description: 'Unit tests for components, hooks, and utilities',
  },
  {
    name: 'integration',
    pattern: 'src/**/*.integration.test.{ts,tsx}',
    description: 'Integration tests for component interactions',
  },
  {
    name: 'e2e',
    pattern: 'src/__tests__/e2e/**/*.e2e.test.{ts,tsx}',
    description: 'End-to-end tests for user workflows',
  },
  {
    name: 'performance',
    pattern: 'src/__tests__/performance/**/*.test.{ts,tsx}',
    description: 'Performance tests for map rendering and interactions',
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

function runAllTests(): boolean {
  console.log('🚀 Starting comprehensive test suite...\n');
  
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
  
  // Run linting
  console.log('\n🔍 Running linting checks...');
  const lintResult = runCommand('npm run lint', 'ESLint checks');
  results.push(lintResult);
  
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
  
  return runTestSuite(suite);
}

function showHelp(): void {
  console.log('Frontend Test Runner\n');
  console.log('Usage:');
  console.log('  npm run test:all          - Run all test suites');
  console.log('  npm run test:unit         - Run unit tests only');
  console.log('  npm run test:integration  - Run integration tests only');
  console.log('  npm run test:e2e          - Run end-to-end tests only');
  console.log('  npm run test:performance  - Run performance tests only');
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
  case 'e2e':
  case 'performance':
    process.exit(runSpecificSuite(command) ? 0 : 1);
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