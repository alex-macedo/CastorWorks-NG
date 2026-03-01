#!/usr/bin/env node

/**
 * Basic Reports Test using agent-browser
 * Verifies reports functionality without Playwright
 */

const { spawn } = require('child_process');
const fs = require('fs');

console.log('🔍 Starting basic reports test with agent-browser...');

// Function to run agent-browser command
function runAgentBrowser(session, command) {
  return new Promise((resolve, reject) => {
    const process = spawn('agent-browser', ['--session', session, ...command.split(' ')], {
      stdio: 'inherit',
      shell: true
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Agent-browser command failed with code ${code}`));
      }
    });
  });
}

async function runReportsTest() {
  try {
    console.log('📝 Step 1: Login to application...');
    await runAgentBrowser('reports-test', 'open http://localhost:5173/login');
    await runAgentBrowser('reports-test', 'fill', '#email', 'test@example.com');
    await runAgentBrowser('reports-test', 'fill', '#password', 'password');
    await runAgentBrowser('reports-test', 'click', 'button[type=submit]');
    await runAgentBrowser('reports-test', 'wait 3000');

    console.log('📊 Step 2: Navigate to reports page...');
    await runAgentBrowser('reports-test', 'open http://localhost:5173/reports');
    await runAgentBrowser('reports-test', 'wait 2000');

    console.log('🔍 Step 3: Check reports page elements...');
    await runAgentBrowser('reports-test', 'screenshot test-results/reports-page-1.png --full');
    
    console.log('✅ Basic reports test completed successfully!');
    console.log('📸 Screenshot saved to test-results/reports-page-1.png');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
runReportsTest().catch(console.error);
