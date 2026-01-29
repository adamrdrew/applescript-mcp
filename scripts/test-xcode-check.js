#!/usr/bin/env node

/**
 * Integration test for Xcode check on startup.
 *
 * Tests that the server correctly exits when Xcode is not installed.
 * Since we cannot easily mock file system access for a spawned process,
 * we test by directly importing and testing the check functions.
 *
 * For the actual startup behavior, we verify:
 * 1. The check function correctly detects presence/absence
 * 2. The error message contains all required elements
 * 3. If this machine has Xcode, verify normal startup works
 *
 * Usage: node scripts/test-xcode-check.js
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = join(__dirname, '..', 'dist', 'index.js');

// ANSI colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function success(message) {
  console.log(`${GREEN}✓${RESET} ${message}`);
}

function fail(message) {
  console.log(`${RED}✗${RESET} ${message}`);
}

function info(message) {
  console.log(`${YELLOW}ℹ${RESET} ${message}`);
}

async function runTests() {
  console.log('\n🔍 Xcode Check Integration Tests\n');

  let testsPassed = 0;
  let testsFailed = 0;

  // Check if dist/index.js exists
  if (!existsSync(serverPath)) {
    fail(`Server not found at ${serverPath}`);
    console.log('💡 Run "npm run build" first');
    process.exit(1);
  }

  // Check if Xcode is installed on this machine
  const xcodeInstalled = existsSync('/Applications/Xcode.app');

  if (xcodeInstalled) {
    info('Xcode is installed on this machine');

    // Test 1: Server should start successfully
    console.log('\nTest 1: Server startup with Xcode installed');

    const startupTest = await new Promise((resolve) => {
      const server = spawn('node', [serverPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stderr = '';

      server.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Give server time to start
      setTimeout(() => {
        if (stderr.includes('Server now running')) {
          success('Server starts normally when Xcode is installed');
          resolve(true);
        } else if (stderr.includes('Xcode is required')) {
          fail('Server incorrectly reports Xcode as missing');
          resolve(false);
        } else {
          fail(`Unexpected stderr: ${stderr.substring(0, 200)}`);
          resolve(false);
        }
        server.kill('SIGTERM');
      }, 1000);

      // Timeout
      setTimeout(() => {
        server.kill('SIGKILL');
        fail('Server startup timeout');
        resolve(false);
      }, 5000);
    });

    if (startupTest) {
      testsPassed++;
    } else {
      testsFailed++;
    }

    // Test 2: Verify error message format (by directly testing the module)
    console.log('\nTest 2: Error message format verification');

    try {
      const xcodeCheckModule = await import(
        join(__dirname, '..', 'dist', 'xcode-check.js')
      );

      const errorMessage = xcodeCheckModule.formatXcodeMissingError();

      // Required elements from phase.md
      const requiredElements = [
        { text: 'Xcode is required', desc: 'statement that Xcode is required' },
        { text: 'sdef', desc: 'mentions sdef command' },
        {
          text: 'https://apps.apple.com/us/app/xcode/id497799835?mt=12',
          desc: 'Mac App Store link',
        },
      ];

      let allPresent = true;
      for (const { text, desc } of requiredElements) {
        if (errorMessage.includes(text)) {
          success(`  Error message contains: ${desc}`);
          testsPassed++;
        } else {
          fail(`  Error message missing: ${desc}`);
          testsFailed++;
          allPresent = false;
        }
      }

      if (allPresent) {
        success('Error message contains all required elements');
      }
    } catch (error) {
      fail(`Could not import xcode-check module: ${error.message}`);
      testsFailed++;
    }

    // Test 3: Check function returns correct result
    console.log('\nTest 3: Check function behavior');

    try {
      const xcodeCheckModule = await import(
        join(__dirname, '..', 'dist', 'xcode-check.js')
      );

      // Test with mock that returns true (Xcode installed)
      const resultInstalled = xcodeCheckModule.checkXcodeInstalled(() => true);
      if (resultInstalled.installed === true) {
        success('checkXcodeInstalled returns installed:true when path exists');
        testsPassed++;
      } else {
        fail('checkXcodeInstalled should return installed:true when path exists');
        testsFailed++;
      }

      // Test with mock that returns false (Xcode not installed)
      const resultMissing = xcodeCheckModule.checkXcodeInstalled(() => false);
      if (resultMissing.installed === false) {
        success('checkXcodeInstalled returns installed:false when path missing');
        testsPassed++;
      } else {
        fail('checkXcodeInstalled should return installed:false when path missing');
        testsFailed++;
      }
    } catch (error) {
      fail(`Could not test check function: ${error.message}`);
      testsFailed++;
    }
  } else {
    // Xcode is NOT installed on this machine
    info('Xcode is NOT installed on this machine');

    // Test: Server should exit with error message
    console.log('\nTest 1: Server exits with error when Xcode is missing');

    const exitTest = await new Promise((resolve) => {
      const server = spawn('node', [serverPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stderr = '';
      let exitCode = null;

      server.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      server.on('close', (code) => {
        exitCode = code;
      });

      // Give server time to exit
      setTimeout(() => {
        if (exitCode !== null && exitCode !== 0) {
          success(`Server exited with non-zero code: ${exitCode}`);

          if (stderr.includes('Xcode is required')) {
            success('Error message states Xcode is required');
          } else {
            fail('Error message does not mention Xcode requirement');
          }

          if (stderr.includes('https://apps.apple.com')) {
            success('Error message includes App Store link');
          } else {
            fail('Error message does not include App Store link');
          }

          resolve(true);
        } else if (exitCode === 0) {
          fail('Server should have exited with non-zero code');
          resolve(false);
        } else {
          // Server might still be running
          server.kill('SIGKILL');
          fail('Server did not exit as expected');
          resolve(false);
        }
      }, 2000);
    });

    if (exitTest) {
      testsPassed++;
    } else {
      testsFailed++;
    }
  }

  // Summary
  console.log('\n' + '─'.repeat(50));
  console.log(
    `\n${GREEN}Passed: ${testsPassed}${RESET} | ${RED}Failed: ${testsFailed}${RESET}\n`
  );

  if (testsFailed === 0) {
    console.log('🎉 All Xcode check tests passed!\n');
    process.exit(0);
  } else {
    console.log('⚠️ Some tests failed.\n');
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error('Test error:', error);
  process.exit(1);
});
