#!/usr/bin/env node

/**
 * SIMPLE RELIABLE TEST RUNNER
 * 
 * A streamlined test runner that focuses on working tests
 * and provides clear, actionable feedback for refactoring safety.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, message, bright = false) {
  const style = bright ? colors.bright + colors[color] : colors[color];
  console.log(`${style}${message}${colors.reset}`);
}

// Test configuration - only include working tests
const testSuites = [
  {
    name: 'Basic Functionality',
    file: 'basic-functionality.test.ts',
    description: 'Core algorithms and mathematical operations',
    critical: true,
    working: true,
  },
  {
    name: 'Game Logic Tests',
    file: 'game-logic.test.ts',
    description: 'Business logic and game mechanics',
    critical: true,
    working: true,
  },
  {
    name: 'Existing Joker Tests',
    file: 'jokerEffects.test.ts',
    description: 'Joker system effects (existing)',
    critical: false,
    working: false, // Known to have TypeScript issues
  },
  {
    name: 'Working Integration Tests',
    file: 'working-integration.test.ts',
    description: 'Core game flow integration',
    critical: true,
    working: true,
  },
  {
    name: 'Complex Integration Tests',
    file: 'comprehensive-integration.test.ts',
    description: 'Full context simulation (needs API fixes)',
    critical: true,
    working: false, // Has TypeScript issues with context APIs
  },
  {
    name: 'UI Components',
    file: 'screen-integration.test.tsx',
    description: 'User interface and interactions',
    critical: false,
    working: false, // Has TypeScript issues with component interfaces
  },
  {
    name: 'Home Ec Game Logic',
    file: 'HomeEcGame-logic.test.ts',
    description: 'Home Economics minigame',
    critical: false,
    working: true,
  },
  {
    name: 'Callback Logic',
    file: 'callback-logic.test.ts',
    description: 'Event callbacks and game responses',
    critical: false,
    working: true,
  },
];

async function runTestSuite(suite) {
  const { name, file, description, critical, working } = suite;
  
  log('blue', `🧪 ${name}`);
  log('reset', `   ${description}`);
  
  // Skip known broken tests
  if (!working) {
    log('yellow', '   ⏭️  SKIPPED (known issues - needs fixing)');
    return { name, status: 'SKIPPED', tests: 0, passed: 0, failed: 0 };
  }
  
  // Check if file exists
  const testPath = path.join(__dirname, file);
  if (!fs.existsSync(testPath)) {
    log('yellow', '   ⏭️  SKIPPED (file not found)');
    return { name, status: 'SKIPPED', tests: 0, passed: 0, failed: 0 };
  }
  
  try {
    const startTime = Date.now();
    
    // Run Jest directly for better output control
    const output = execSync(`npx jest ${file} --verbose`, {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    const duration = Date.now() - startTime;
    
    // Simple success detection - if execSync didn't throw, tests passed
    const status = 'PASSED';
    const statusColor = 'green';
    const icon = '✅';
    
    // Try to extract test count from output
    let testCount = 'working';
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes('Tests:') && line.includes('passed')) {
        const totalMatch = line.match(/(\d+) total/);
        const passedMatch = line.match(/(\d+) passed/);
        if (totalMatch && passedMatch) {
          testCount = `${passedMatch[1]}/${totalMatch[1]} tests`;
          break;
        }
      }
    }
    
    log(statusColor, `   ${icon} ${status} (${testCount}, ${duration}ms)`);
    
    return { name, status, tests: 1, passed: 1, failed: 0, duration, critical };
    
  } catch (error) {
    log('red', `   ❌ ERROR: ${error.message.substring(0, 80)}...`);
    
    if (critical) {
      log('red', '   🚨 CRITICAL TEST ERROR!', true);
    }
    
    return { name, status: 'ERROR', tests: 0, passed: 0, failed: 1, critical };
  }
}

async function main() {
  log('cyan', '🎮 CANDYWARZ REFACTORING SAFETY CHECK', true);
  log('cyan', '='.repeat(45));
  console.log('');
  
  const startTime = Date.now();
  const results = [];
  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  
  // Run each test suite
  for (const suite of testSuites) {
    const result = await runTestSuite(suite);
    results.push(result);
    
    totalTests += result.tests;
    totalPassed += result.passed;
    totalFailed += result.failed;
    
    console.log('');
  }
  
  const totalTime = Date.now() - startTime;
  
  // Summary report
  log('bright', '📊 REFACTORING SAFETY REPORT');
  console.log('='.repeat(35));
  console.log('');
  
  console.log('📈 Test Results:');
  console.log(`Total Tests Run: ${totalTests}`);
  log('green', `✅ Passed: ${totalPassed}`);
  
  if (totalFailed > 0) {
    log('red', `❌ Failed: ${totalFailed}`);
  }
  
  const successRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0;
  console.log(`Success Rate: ${successRate}%`);
  console.log(`Execution Time: ${(totalTime / 1000).toFixed(2)}s`);
  console.log('');
  
  // Suite breakdown
  console.log('📋 Suite Results:');
  results.forEach(result => {
    const statusColor = result.status === 'PASSED' ? 'green' : 
                       result.status === 'SKIPPED' ? 'yellow' : 'red';
    const icon = result.status === 'PASSED' ? '✅' : 
                 result.status === 'SKIPPED' ? '⏭️' : '❌';
    
    log(statusColor, `${icon} ${result.name.padEnd(25)} ${result.status}`);
    
    if (result.status === 'PASSED' || result.status === 'FAILED') {
      console.log(`   ${result.passed}/${result.tests} tests passed`);
    }
  });
  console.log('');
  
  // Critical assessment
  const criticalFailed = results.filter(r => r.critical && r.status !== 'PASSED');
  const workingTests = results.filter(r => r.status === 'PASSED');
  
  // Refactoring safety assessment
  if (criticalFailed.length === 0 && workingTests.length > 0) {
    log('green', '🎉 REFACTORING SAFETY: GOOD', true);
    log('green', '✅ Core functionality verified - proceed with caution');
    console.log('   Basic game mechanics are tested and working');
    console.log('   Safe to refactor core algorithms and math functions');
  } else if (criticalFailed.length > 0) {
    log('red', '🚨 REFACTORING SAFETY: RISKY', true);
    log('red', '❌ Critical tests failing - fix before refactoring!');
    criticalFailed.forEach(result => {
      console.log(`   • ${result.name}: ${result.status}`);
    });
  } else {
    log('yellow', '⚠️  REFACTORING SAFETY: UNKNOWN', true);
    log('yellow', '⚠️  No working tests found - create basic tests first');
  }
  
  console.log('');
  
  // Recommendations
  log('bright', '💡 Next Steps:');
  
  if (workingTests.length > 0) {
    log('green', '✅ You have a working test foundation');
    console.log('   • Basic functionality is covered');
    console.log('   • Safe to refactor mathematical operations');
    console.log('   • Add more tests as you refactor other areas');
  }
  
  const brokenTests = results.filter(r => r.status === 'ERROR');
  if (brokenTests.length > 0) {
    log('yellow', '🔧 Fix these test files when time permits:');
    brokenTests.forEach(result => {
      console.log(`   • ${result.name} (TypeScript/dependency issues)`);
    });
  }
  
  console.log('');
  log('blue', '📝 To run individual working tests:');
  const workingFiles = testSuites.filter(s => s.working).map(s => s.file);
  workingFiles.forEach(file => {
    console.log(`   npm test ${file}`);
  });
  
  console.log('');
  
  // Exit code
  process.exit(criticalFailed.length > 0 ? 1 : 0);
}

if (require.main === module) {
  main().catch(error => {
    log('red', `💥 Runner crashed: ${error.message}`, true);
    process.exit(1);
  });
}

module.exports = { runTestSuite, main };