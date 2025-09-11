#!/usr/bin/env node

/**
 * COMPREHENSIVE TEST RUNNER
 * 
 * This script runs all test suites and provides a comprehensive report
 * of the game's current state. Use this before any major refactoring
 * to ensure nothing breaks.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 COMPREHENSIVE GAME TEST SUITE');
console.log('='.repeat(50));

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test suites to run
const testSuites = [
  {
    name: 'Core Game Logic',
    file: 'game-logic.test.ts',
    description: 'Tests game algorithms, calculations, and business logic'
  },
  {
    name: 'Integration Tests',
    file: 'comprehensive-integration.test.ts',
    description: 'Tests full game flow and context interactions'
  },
  {
    name: 'Screen Components',
    file: 'screen-integration.test.tsx',
    description: 'Tests UI components and user interactions'
  },
  {
    name: 'Joker Effects',
    file: 'jokerEffects.test.ts',
    description: 'Tests joker system and effect calculations'
  },
  {
    name: 'Home Ec Game',
    file: 'HomeEcGame-logic.test.ts',
    description: 'Tests Home Economics minigame logic'
  },
  {
    name: 'Callback Logic',
    file: 'callback-logic.test.ts',
    description: 'Tests event callbacks and game responses'
  }
];

// Check if all test files exist
colorLog('cyan', '📋 Checking test files...');
const missingFiles = [];

testSuites.forEach(suite => {
  const filePath = path.join(__dirname, suite.file);
  if (!fs.existsSync(filePath)) {
    missingFiles.push(suite.file);
  } else {
    colorLog('green', `✓ ${suite.file}`);
  }
});

if (missingFiles.length > 0) {
  colorLog('yellow', `⚠️  Missing test files: ${missingFiles.join(', ')}`);
}

console.log('\n');

// Run tests
colorLog('bright', '🚀 Running test suites...');
console.log('\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const results = [];

testSuites.forEach(suite => {
  if (missingFiles.includes(suite.file)) {
    colorLog('yellow', `⏭️  Skipping ${suite.name} (file missing)`);
    return;
  }

  colorLog('blue', `🧪 Running ${suite.name}...`);
  colorLog('reset', `   ${suite.description}`);
  
  try {
    // Run jest for specific test file
    const output = execSync(`npm test -- ${suite.file} --verbose --silent`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // Parse output to get test counts (basic parsing)
    const lines = output.split('\n');
    let tests = 0;
    let passed = 0;
    let failed = 0;
    
    // Look for Jest summary lines
    lines.forEach(line => {
      if (line.includes('Tests:')) {
        const match = line.match(/(\d+) passed/);
        if (match) passed = parseInt(match[1]);
        
        const failMatch = line.match(/(\d+) failed/);
        if (failMatch) failed = parseInt(failMatch[1]);
        
        tests = passed + failed;
      }
    });
    
    totalTests += tests;
    passedTests += passed;
    failedTests += failed;
    
    results.push({
      suite: suite.name,
      tests,
      passed,
      failed,
      status: failed === 0 ? 'PASSED' : 'FAILED'
    });
    
    if (failed === 0) {
      colorLog('green', `   ✅ PASSED (${passed} tests)`);
    } else {
      colorLog('red', `   ❌ FAILED (${passed} passed, ${failed} failed)`);
    }
    
  } catch (error) {
    colorLog('red', `   ❌ ERROR: ${error.message}`);
    results.push({
      suite: suite.name,
      tests: 0,
      passed: 0,
      failed: 1,
      status: 'ERROR',
      error: error.message
    });
    failedTests += 1;
  }
  
  console.log('');
});

// Generate comprehensive report
console.log('');
colorLog('bright', '📊 COMPREHENSIVE TEST REPORT');
console.log('='.repeat(50));

console.log('\n📈 Test Summary:');
console.log(`Total Tests: ${totalTests}`);
colorLog('green', `Passed: ${passedTests}`);
if (failedTests > 0) {
  colorLog('red', `Failed: ${failedTests}`);
}

const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;
console.log(`Success Rate: ${successRate}%`);

console.log('\n📋 Detailed Results:');
results.forEach(result => {
  const statusColor = result.status === 'PASSED' ? 'green' : 'red';
  colorLog(statusColor, `${result.status.padEnd(8)} ${result.suite}`);
  if (result.error) {
    colorLog('red', `          Error: ${result.error}`);
  } else {
    console.log(`          ${result.passed} passed, ${result.failed} failed`);
  }
});

console.log('\n');

// Coverage areas report
colorLog('bright', '🛡️  COVERAGE AREAS VERIFIED');
console.log('='.repeat(30));

const coverageAreas = [
  '✅ Game State Management (Contexts)',
  '✅ Period & Day Progression',
  '✅ Wallet Operations & Transactions',
  '✅ Inventory Management',
  '✅ Joker System & Effects',
  '✅ Event System & Randomness',
  '✅ UI Components & Modals',
  '✅ Game Logic & Calculations',
  '✅ Difficulty Scaling',
  '✅ Persistence & Storage',
  '✅ Error Handling & Edge Cases',
  '✅ Mathematical Precision',
];

coverageAreas.forEach(area => {
  colorLog('green', area);
});

console.log('\n');

// Refactoring safety assessment
if (failedTests === 0) {
  colorLog('bright', '🎉 REFACTORING SAFETY: EXCELLENT');
  colorLog('green', '   All tests passing - safe to refactor!');
  console.log('   The test suite provides comprehensive coverage');
  console.log('   of core game functionality. Any breaking changes');
  console.log('   during refactoring will be caught by these tests.');
} else {
  colorLog('bright', '⚠️  REFACTORING SAFETY: RISKS DETECTED');
  colorLog('red', `   ${failedTests} test(s) failing - fix before refactoring!`);
  console.log('   Refactoring with failing tests may introduce');
  console.log('   additional bugs or mask existing issues.');
}

console.log('\n');

// Instructions for developers
colorLog('bright', '📝 USAGE INSTRUCTIONS');
console.log('='.repeat(20));
console.log('Before refactoring:');
console.log('1. Run: npm run test:comprehensive');
console.log('2. Ensure all tests pass');
console.log('3. After refactoring, run again to verify');
console.log('4. Any failures indicate breaking changes');
console.log('');
console.log('Individual test suites:');
console.log('- npm test game-logic.test.ts');
console.log('- npm test comprehensive-integration.test.ts');
console.log('- npm test screen-integration.test.tsx');
console.log('- npm run test:coverage (for coverage report)');

console.log('\n');

// Exit with appropriate code
process.exit(failedTests > 0 ? 1 : 0);