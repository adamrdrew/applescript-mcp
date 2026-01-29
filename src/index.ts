#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';

import { listScriptableApps } from './tools/list-apps.js';
import { getAppDictionary } from './tools/get-dictionary.js';
import { executeAppleScript, validateScript, analyzeScriptSafety } from './tools/execute.js';
import { getSystemState } from './tools/system-state.js';
import {
  getWorkflowPattern,
  analyzeScriptFailure,
  getAppSkillGuide,
  getLearningStats,
  getSmartSuggestion,
} from './tools/smart-tools.js';
import {
  discoverCapabilities,
  suggestAfterFailure,
  suggestAfterSuccess,
} from './tools/discover.js';
import { logExecution } from './learning/pattern-store.js';
import { generateSmartErrorMessage } from './learning/analyzer.js';
import {
  isGetDictionaryParams,
  isExtendedExecuteParams,
  isValidateScriptParams,
  isWorkflowPatternParams,
  isAnalyzeFailureParams,
  isAppSkillParams,
  isSmartSuggestionParams,
  isDiscoverCapabilitiesParams,
} from './types.js';
import { getPackageVersion, formatStartupBanner } from './version.js';

/**
 * Tool definitions for the MCP server
 */
const tools: Tool[] = [
  // === CORE TOOLS ===
  {
    name: 'list_scriptable_apps',
    description:
      'List all applications on the system that support AppleScript automation. Returns an array of application names that can be used with other AppleScript tools. Use this first to discover what apps can be automated.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_app_dictionary',
    description:
      'Get the AppleScript dictionary for a specific application. Returns a comprehensive guide with commands, classes, properties, and EXAMPLES showing how to use them. Always check this before writing scripts for an app to understand what\'s possible.',
    inputSchema: {
      type: 'object',
      properties: {
        app: {
          type: 'string',
          description: 'The name of the application (e.g., "Finder", "Safari", "Mail").',
        },
      },
      required: ['app'],
    },
  },
  {
    name: 'execute_applescript',
    description:
      'Execute an AppleScript script and return the results. SAFETY: Scripts are analyzed for dangerous operations. High-risk scripts require confirmation. LEARNING: Executions are logged to improve future suggestions.',
    inputSchema: {
      type: 'object',
      properties: {
        script: {
          type: 'string',
          description: 'The AppleScript code to execute.',
        },
        intent: {
          type: 'string',
          description: 'Natural language description of what this script does (used for learning).',
        },
        timeout: {
          type: 'number',
          description: 'Maximum execution time in milliseconds (default: 30000, max: 300000).',
        },
        confirmedDangerous: {
          type: 'boolean',
          description: 'Set to true to execute scripts flagged as high-risk or critical.',
        },
      },
      required: ['script'],
    },
  },
  {
    name: 'validate_applescript',
    description:
      'Check if an AppleScript script has valid syntax AND analyze it for safety risks without executing it.',
    inputSchema: {
      type: 'object',
      properties: {
        script: {
          type: 'string',
          description: 'The AppleScript code to validate.',
        },
      },
      required: ['script'],
    },
  },
  {
    name: 'get_system_state',
    description:
      'Get the current state of the Mac for context-aware automation. Returns: frontmost app, running apps, Finder selection, clipboard contents, volume level, currently playing music, open Safari tabs.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },

  // === SMART/LEARNING TOOLS ===
  {
    name: 'get_workflow_pattern',
    description:
      'Find similar AppleScript patterns that have worked before. Search by intent (what you want to do) and optionally filter by app. Returns successful patterns from history plus relevant examples from skill files.',
    inputSchema: {
      type: 'object',
      properties: {
        intent: {
          type: 'string',
          description: 'What you want to accomplish in natural language (e.g., "create a playlist", "get unread emails").',
        },
        app: {
          type: 'string',
          description: 'Optional: Filter patterns by app name (e.g., "Music", "Mail").',
        },
        action: {
          type: 'string',
          description: 'Optional: Filter by action type (e.g., "create", "delete", "get", "play").',
        },
      },
      required: ['intent'],
    },
  },
  {
    name: 'analyze_failure',
    description:
      'Analyze why an AppleScript failed and get actionable fix suggestions. Provides root cause analysis, specific fixes, and sometimes auto-corrected scripts.',
    inputSchema: {
      type: 'object',
      properties: {
        script: {
          type: 'string',
          description: 'The AppleScript that failed.',
        },
        error: {
          type: 'string',
          description: 'The error message from the failed execution.',
        },
      },
      required: ['script', 'error'],
    },
  },
  {
    name: 'get_app_skill',
    description:
      'Get the skill guide for an app. Returns working examples, common gotchas, troubleshooting tips, and the correct patterns for that app. Available for: Music, Finder, Safari, Mail, Reminders, Calendar, Notes, Messages, Contacts, Photos.',
    inputSchema: {
      type: 'object',
      properties: {
        app: {
          type: 'string',
          description: 'The app name (e.g., "Music", "Finder").',
        },
      },
      required: ['app'],
    },
  },
  {
    name: 'get_smart_suggestion',
    description:
      'Get an intelligent script suggestion based on learned patterns and skills. Analyzes what has worked before for similar requests and returns the best approach with confidence level.',
    inputSchema: {
      type: 'object',
      properties: {
        app: {
          type: 'string',
          description: 'The target app (e.g., "Music", "Calendar").',
        },
        intent: {
          type: 'string',
          description: 'What you want to do in natural language.',
        },
      },
      required: ['app', 'intent'],
    },
  },
  {
    name: 'get_learning_stats',
    description:
      'Get statistics about the learning system: total patterns, success rates, patterns by app/category, and available skill files.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },

  // === DISCOVERABILITY ===
  {
    name: 'discover_capabilities',
    description:
      'Show what Mac automation is possible. USE THIS TOOL when user asks "what can you do?", "help", "what apps can you automate?", or any discovery/help question. Returns context-aware capabilities based on currently running apps, with example prompts users can try. Pass an app name for a deep dive on that specific app.',
    inputSchema: {
      type: 'object',
      properties: {
        app: {
          type: 'string',
          description: 'Optional: Get detailed capabilities for a specific app (e.g., "Music", "Mail", "Safari").',
        },
      },
      required: [],
    },
  },
];

/**
 * Create and configure the MCP server
 */
function createServer(version: string): Server {
  const server = new Server(
    {
      name: 'applescript-mcp',
      version,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        // === CORE TOOLS ===

        case 'list_scriptable_apps': {
          const result = await listScriptableApps();
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }

        case 'get_app_dictionary': {
          if (!isGetDictionaryParams(args)) {
            return {
              content: [{ type: 'text', text: JSON.stringify({ success: false, error: 'Invalid parameters: "app" required' }) }],
              isError: true,
            };
          }
          const result = await getAppDictionary(args.app);
          if (result.success && result.data) {
            return {
              content: [{ type: 'text', text: result.data.summary }],
            };
          }
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            isError: !result.success,
          };
        }

        case 'execute_applescript': {
          if (!isExtendedExecuteParams(args)) {
            return {
              content: [{ type: 'text', text: JSON.stringify({ success: false, error: 'Invalid parameters: "script" required' }) }],
              isError: true,
            };
          }

          const options = args.confirmedDangerous !== undefined
            ? { confirmedDangerous: args.confirmedDangerous }
            : undefined;

          const result = await executeAppleScript(args.script, args.timeout, options);

          // LEARNING: Log the execution
          const intent = args.intent || 'unspecified intent';
          try {
            await logExecution(
              intent,
              args.script,
              result.success,
              result.success
                ? (result.data?.stdout || 'success')
                : (result.error || 'unknown error')
            );
          } catch {
            // Don't fail the request if logging fails
          }

          // If failed, enhance with smart error message and suggest what works
          if (!result.success && result.error) {
            try {
              const smartError = await generateSmartErrorMessage(args.script, result.error);

              // Extract app from script to suggest alternatives
              const appMatch = args.script.match(/tell application "([^"]+)"/i);
              const failedApp = appMatch ? appMatch[1] : null;
              let failureSuggestion = '';
              if (failedApp) {
                failureSuggestion = await suggestAfterFailure(failedApp, result.error);
              }

              return {
                content: [{ type: 'text', text: smartError + '\n\n' + failureSuggestion + '\n\n---\n\nRaw result:\n' + JSON.stringify(result, null, 2) }],
                isError: true,
              };
            } catch {
              // Fall back to regular error
            }
          }

          // Success! Add related capability suggestions
          let successOutput = JSON.stringify(result, null, 2);
          try {
            const appMatch = args.script.match(/tell application "([^"]+)"/i);
            if (appMatch && appMatch[1]) {
              const suggestion = await suggestAfterSuccess(appMatch[1]);
              if (suggestion) {
                successOutput += suggestion;
              }
            }
          } catch {
            // Ignore suggestion errors
          }

          return {
            content: [{ type: 'text', text: successOutput }],
            isError: !result.success,
          };
        }

        case 'validate_applescript': {
          if (!isValidateScriptParams(args)) {
            return {
              content: [{ type: 'text', text: JSON.stringify({ success: false, error: '"script" required' }) }],
              isError: true,
            };
          }
          const result = await validateScript(args.script);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }

        case 'get_system_state': {
          const result = await getSystemState();
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }

        // === SMART/LEARNING TOOLS ===

        case 'get_workflow_pattern': {
          if (!isWorkflowPatternParams(args)) {
            return {
              content: [{ type: 'text', text: JSON.stringify({ success: false, error: '"intent" required' }) }],
              isError: true,
            };
          }

          const patternOptions: { app?: string; action?: string } = {};
          if (args.app) patternOptions.app = args.app;
          if (args.action) patternOptions.action = args.action;
          const result = await getWorkflowPattern(args.intent, patternOptions);

          // Format nicely for LLM
          if (result.success && result.data) {
            let output = '## Similar Patterns Found\n\n';

            if (result.data.patterns.length > 0) {
              result.data.patterns.forEach((p, i) => {
                output += `### Pattern ${i + 1} (used ${p.successCount}x successfully)\n`;
                output += `**Apps:** ${p.apps.join(', ')}\n`;
                output += `**Intent:** ${p.intent}\n`;
                output += `\`\`\`applescript\n${p.script}\n\`\`\`\n\n`;
              });
            } else {
              output += 'No matching patterns in history yet.\n\n';
            }

            if (result.data.context) {
              output += '\n## Skill Context\n\n' + result.data.context;
            }

            return {
              content: [{ type: 'text', text: output }],
            };
          }

          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            isError: !result.success,
          };
        }

        case 'analyze_failure': {
          if (!isAnalyzeFailureParams(args)) {
            return {
              content: [{ type: 'text', text: JSON.stringify({ success: false, error: '"script" and "error" required' }) }],
              isError: true,
            };
          }

          const result = await analyzeScriptFailure(args.script, args.error);

          if (result.success && result.data) {
            return {
              content: [{ type: 'text', text: result.data.smartMessage }],
            };
          }

          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            isError: !result.success,
          };
        }

        case 'get_app_skill': {
          if (!isAppSkillParams(args)) {
            return {
              content: [{ type: 'text', text: JSON.stringify({ success: false, error: '"app" required' }) }],
              isError: true,
            };
          }

          const result = await getAppSkillGuide(args.app);

          if (result.success && result.data) {
            if (result.data.skill) {
              return {
                content: [{ type: 'text', text: result.data.skill }],
              };
            } else {
              return {
                content: [{ type: 'text', text: `No skill file found for "${args.app}". Available skills can be listed with get_learning_stats.` }],
              };
            }
          }

          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            isError: !result.success,
          };
        }

        case 'get_smart_suggestion': {
          if (!isSmartSuggestionParams(args)) {
            return {
              content: [{ type: 'text', text: JSON.stringify({ success: false, error: '"app" and "intent" required' }) }],
              isError: true,
            };
          }

          const result = await getSmartSuggestion(args.app, args.intent);

          if (result.success && result.data) {
            let output = `## Smart Suggestion for ${args.app}\n\n`;
            output += `**Confidence:** ${result.data.confidence}\n`;
            output += `**Based on:** ${result.data.basedOn}\n\n`;
            output += `\`\`\`applescript\n${result.data.suggestion}\n\`\`\`\n`;

            if (result.data.warnings.length > 0) {
              output += '\n**Warnings:**\n';
              result.data.warnings.forEach(w => output += `- ${w}\n`);
            }

            return {
              content: [{ type: 'text', text: output }],
            };
          }

          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            isError: !result.success,
          };
        }

        case 'get_learning_stats': {
          const result = await getLearningStats();

          if (result.success && result.data) {
            let output = '## Learning System Statistics\n\n';
            output += `**Total Patterns:** ${result.data.totalPatterns}\n`;
            output += `**Successful:** ${result.data.successfulPatterns}\n\n`;

            if (Object.keys(result.data.byApp).length > 0) {
              output += '**By App:**\n';
              Object.entries(result.data.byApp).forEach(([app, count]) => {
                output += `- ${app}: ${count}\n`;
              });
              output += '\n';
            }

            output += `**Available Skills:** ${result.data.availableSkills.join(', ')}\n`;

            return {
              content: [{ type: 'text', text: output }],
            };
          }

          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }

        // === DISCOVERABILITY ===

        case 'discover_capabilities': {
          if (!isDiscoverCapabilitiesParams(args)) {
            return {
              content: [{ type: 'text', text: JSON.stringify({ success: false, error: 'Invalid parameters' }) }],
              isError: true,
            };
          }
          const result = await discoverCapabilities(args.app);

          if (result.success && result.data) {
            return {
              content: [{ type: 'text', text: result.data.overview }],
            };
          }

          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            isError: !result.success,
          };
        }

        default:
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: false, error: `Unknown tool: ${name}` }) }],
            isError: true,
          };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: false, error: errorMessage }) }],
        isError: true,
      };
    }
  });

  return server;
}

async function main(): Promise<void> {
  // Read version once from package.json (single source of truth)
  const version = getPackageVersion();

  // Display startup banner to stderr (not stdout, which is used by MCP protocol)
  const banner = formatStartupBanner(version);
  process.stderr.write(banner + '\n');

  const server = createServer(version);
  const transport = new StdioServerTransport();

  await server.connect(transport);

  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
