#!/usr/bin/env node

/**
 * Test script for applescript-mcp server
 *
 * Spawns the server, sends MCP requests, and verifies responses.
 *
 * Usage: npm test
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = join(__dirname, '..', 'dist', 'index.js');

// ANSI colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function log(emoji, message) {
  console.log(`${emoji} ${message}`);
}

function success(message) {
  console.log(`${GREEN}✓${RESET} ${message}`);
}

function fail(message) {
  console.log(`${RED}✗${RESET} ${message}`);
}

/**
 * Send a JSON-RPC request to the server
 */
function sendRequest(server, method, params = {}, id = 1) {
  const request = {
    jsonrpc: '2.0',
    id,
    method,
    params,
  };
  const message = JSON.stringify(request);
  server.stdin.write(message + '\n');
}

/**
 * Parse JSON-RPC responses from server output
 */
function parseResponses(data) {
  const lines = data.toString().split('\n').filter(line => line.trim());
  const responses = [];

  for (const line of lines) {
    try {
      responses.push(JSON.parse(line));
    } catch {
      // Not JSON, skip
    }
  }

  return responses;
}

async function runTests() {
  log('🚀', 'Starting applescript-mcp server test...\n');

  // Check if dist/index.js exists
  try {
    await import('node:fs/promises').then(fs => fs.access(serverPath));
  } catch {
    fail(`Server not found at ${serverPath}`);
    log('💡', 'Run "npm run build" first');
    process.exit(1);
  }

  return new Promise((resolve) => {
    const server = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let output = '';
    let testsPassed = 0;
    let testsFailed = 0;
    const tests = [];

    server.stdout.on('data', (data) => {
      output += data.toString();
    });

    server.stderr.on('data', (data) => {
      // Server might log to stderr, that's ok
    });

    // Give server time to start
    setTimeout(async () => {
      log('📡', 'Sending MCP initialize request...');

      // Test 1: Initialize
      sendRequest(server, 'initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' },
      }, 1);

      // Wait for response
      await new Promise(r => setTimeout(r, 500));

      const responses = parseResponses(output);

      // Check initialize response
      const initResponse = responses.find(r => r.id === 1);
      if (initResponse && initResponse.result) {
        success(`Initialize: Server responded with version ${initResponse.result.serverInfo?.version || 'unknown'}`);
        testsPassed++;

        // Verify server name
        if (initResponse.result.serverInfo?.name === 'applescript-mcp') {
          success('Server name: applescript-mcp');
          testsPassed++;
        } else {
          fail('Server name mismatch');
          testsFailed++;
        }

        // Verify capabilities
        if (initResponse.result.capabilities?.tools) {
          success('Capabilities: Tools enabled');
          testsPassed++;
        } else {
          fail('Missing tools capability');
          testsFailed++;
        }
      } else {
        fail('Initialize: No valid response');
        testsFailed++;
      }

      // Test 2: List tools
      output = '';
      log('\n📡', 'Sending tools/list request...');
      sendRequest(server, 'tools/list', {}, 2);

      await new Promise(r => setTimeout(r, 500));

      const toolsResponses = parseResponses(output);
      const toolsResponse = toolsResponses.find(r => r.id === 2);

      if (toolsResponse && toolsResponse.result?.tools) {
        const tools = toolsResponse.result.tools;
        success(`Tools: Found ${tools.length} tools`);
        testsPassed++;

        // Check for expected tools
        const expectedTools = [
          'list_scriptable_apps',
          'execute_applescript',
          'get_app_dictionary',
          'discover_capabilities',
        ];

        for (const expected of expectedTools) {
          if (tools.some(t => t.name === expected)) {
            success(`  - ${expected}`);
            testsPassed++;
          } else {
            fail(`  - ${expected} (missing)`);
            testsFailed++;
          }
        }
      } else {
        fail('Tools: No valid response');
        testsFailed++;
      }

      // Test 3: Call discover_capabilities
      output = '';
      log('\n📡', 'Testing discover_capabilities...');
      sendRequest(server, 'tools/call', {
        name: 'discover_capabilities',
        arguments: {},
      }, 3);

      await new Promise(r => setTimeout(r, 1000));

      const discoverResponses = parseResponses(output);
      const discoverResponse = discoverResponses.find(r => r.id === 3);

      if (discoverResponse && discoverResponse.result?.content) {
        const content = discoverResponse.result.content[0]?.text || '';
        if (content.includes('Mac Automation Capabilities')) {
          success('discover_capabilities: Returns capability overview');
          testsPassed++;
        } else {
          fail('discover_capabilities: Unexpected content');
          testsFailed++;
        }
      } else {
        fail('discover_capabilities: No valid response');
        testsFailed++;
      }

      // Clean up
      server.kill('SIGTERM');

      // Summary
      console.log('\n' + '─'.repeat(50));
      console.log(`\n${GREEN}Passed: ${testsPassed}${RESET} | ${RED}Failed: ${testsFailed}${RESET}\n`);

      if (testsFailed === 0) {
        log('🎉', 'All tests passed! Server is working correctly.\n');
        resolve(0);
      } else {
        log('⚠️', 'Some tests failed.\n');
        resolve(1);
      }
    }, 500);

    // Timeout
    setTimeout(() => {
      fail('Test timeout - server not responding');
      server.kill('SIGKILL');
      resolve(1);
    }, 10000);
  });
}

// Run tests
runTests().then(code => process.exit(code));
