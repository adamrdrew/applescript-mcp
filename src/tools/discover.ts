/**
 * Discover Capabilities - Make the learning system discoverable
 *
 * Shows users what's possible, prioritized by what apps they're currently using.
 */

import type { ToolResponse } from '../types.js';
import { getSystemState } from './system-state.js';
import { listAvailableSkills, getAppSkill } from '../learning/skill-loader.js';
import { getPatternStats } from '../learning/pattern-store.js';

/**
 * Capability definition for each app
 */
interface AppCapability {
  name: string;
  category: string;
  emoji: string;
  description: string;
  capabilities: string[];
  examplePrompts: string[];
  quickWins: string[];
}

/**
 * Built-in capability definitions
 * These supplement the skill files with user-friendly descriptions
 */
const APP_CAPABILITIES: Record<string, AppCapability> = {
  music: {
    name: 'Music',
    category: 'MEDIA',
    emoji: '🎵',
    description: 'Control Apple Music playback, create playlists, search your library',
    capabilities: [
      'Play, pause, skip, and control volume',
      'Create and manage playlists',
      'Search your music library',
      'Get currently playing track info',
      'Add songs to playlists',
      'Shuffle and repeat controls',
    ],
    examplePrompts: [
      'Play some music by The Cure',
      'Create a playlist called "Chill Vibes" with Radiohead and Portishead',
      'What song is playing right now?',
      'Skip to the next track',
      'Add this song to my favorites playlist',
      'Play my recently added songs',
    ],
    quickWins: [
      'pause', 'play', 'next track', 'what\'s playing',
    ],
  },
  finder: {
    name: 'Finder',
    category: 'FILES',
    emoji: '📁',
    description: 'Manage files, folders, organize your desktop and documents',
    capabilities: [
      'Create, move, copy, and rename files/folders',
      'Get info about selected files',
      'Organize desktop and downloads',
      'Search for files by name',
      'Open files with specific apps',
      'Get folder contents and sizes',
    ],
    examplePrompts: [
      'What files do I have selected in Finder?',
      'Create a new folder on my desktop called "Project X"',
      'Move all PDFs from Downloads to Documents',
      'How big is my Documents folder?',
      'Open the most recent file in Downloads',
      'Clean up my desktop by organizing files into folders',
    ],
    quickWins: [
      'what\'s selected', 'new folder', 'open downloads',
    ],
  },
  safari: {
    name: 'Safari',
    category: 'WEB',
    emoji: '🌐',
    description: 'Manage browser tabs, save research, get page info',
    capabilities: [
      'List all open tabs',
      'Get current page URL and title',
      'Open new tabs with URLs',
      'Close tabs by name or pattern',
      'Get page content for research',
      'Manage reading list',
    ],
    examplePrompts: [
      'What tabs do I have open?',
      'Close all tabs about shopping',
      'Save all my open tabs as a note',
      'Open GitHub, Twitter, and Hacker News',
      'What page am I looking at?',
      'Find tabs related to AI development',
    ],
    quickWins: [
      'list tabs', 'current url', 'open google',
    ],
  },
  mail: {
    name: 'Mail',
    category: 'COMMUNICATION',
    emoji: '📧',
    description: 'Manage emails, find messages, create drafts',
    capabilities: [
      'Get unread email count',
      'Find emails by sender or subject',
      'Read email content',
      'Create and send emails',
      'Move emails to folders',
      'Mark emails as read/flagged',
    ],
    examplePrompts: [
      'How many unread emails do I have?',
      'Find emails from my boss this week',
      'Create a draft email to team@company.com about the project update',
      'What are my most recent emails?',
      'Flag all emails from accounting',
      'Move newsletter emails to a folder',
    ],
    quickWins: [
      'unread count', 'recent emails', 'emails from [name]',
    ],
  },
  reminders: {
    name: 'Reminders',
    category: 'PRODUCTIVITY',
    emoji: '✅',
    description: 'Create reminders, manage tasks, organize lists',
    capabilities: [
      'Create new reminders',
      'Set due dates and times',
      'Create reminder lists',
      'Mark reminders complete',
      'Get overdue reminders',
      'Search reminders',
    ],
    examplePrompts: [
      'Remind me to call mom tomorrow at 3pm',
      'What reminders are due today?',
      'Create a shopping list with milk, bread, and eggs',
      'Show my overdue reminders',
      'Mark all groceries reminders as complete',
      'Create a reminder list for my project',
    ],
    quickWins: [
      'remind me to...', 'due today', 'overdue tasks',
    ],
  },
  calendar: {
    name: 'Calendar',
    category: 'PRODUCTIVITY',
    emoji: '📅',
    description: 'Manage events, check schedule, create meetings',
    capabilities: [
      'Create calendar events',
      'Check today\'s schedule',
      'Find free time slots',
      'Get upcoming events',
      'Set event reminders',
      'Search for events',
    ],
    examplePrompts: [
      'What\'s on my calendar today?',
      'Schedule a meeting tomorrow at 2pm called "Team Sync"',
      'When is my next meeting?',
      'Am I free Friday afternoon?',
      'Create a recurring weekly standup',
      'Show my events for this week',
    ],
    quickWins: [
      'today\'s events', 'next meeting', 'schedule for tomorrow',
    ],
  },
  notes: {
    name: 'Notes',
    category: 'PRODUCTIVITY',
    emoji: '📝',
    description: 'Create and manage notes, organize ideas',
    capabilities: [
      'Create new notes',
      'Search notes by content',
      'Organize notes into folders',
      'Append to existing notes',
      'Get recent notes',
      'Share notes',
    ],
    examplePrompts: [
      'Create a note with my meeting action items',
      'Find notes about the project',
      'Add this to my Ideas note',
      'What are my most recent notes?',
      'Create a checklist note for my trip',
      'Summarize my notes from this week',
    ],
    quickWins: [
      'new note', 'find notes about...', 'recent notes',
    ],
  },
  messages: {
    name: 'Messages',
    category: 'COMMUNICATION',
    emoji: '💬',
    description: 'Send iMessages, read conversations',
    capabilities: [
      'Send text messages',
      'Read recent messages',
      'Get unread message count',
      'Search message history',
      'Send to groups',
    ],
    examplePrompts: [
      'Send a message to John saying "Running 10 min late"',
      'What messages did I get today?',
      'How many unread messages do I have?',
      'Send "Happy Birthday!" to Mom',
      'What did Sarah say in her last message?',
    ],
    quickWins: [
      'send message to...', 'unread messages', 'recent chats',
    ],
  },
  contacts: {
    name: 'Contacts',
    category: 'COMMUNICATION',
    emoji: '👥',
    description: 'Search contacts, get phone numbers and emails',
    capabilities: [
      'Find contact information',
      'Get phone numbers and emails',
      'Search by name or company',
      'Create new contacts',
      'Update contact info',
    ],
    examplePrompts: [
      'What\'s John Smith\'s phone number?',
      'Find contacts at Acme Corp',
      'Get my mom\'s email address',
      'Add a new contact for my dentist',
      'Who do I know named Sarah?',
    ],
    quickWins: [
      'find contact...', 'phone number for...', 'email for...',
    ],
  },
  photos: {
    name: 'Photos',
    category: 'MEDIA',
    emoji: '📸',
    description: 'Browse photos, create albums, find favorites',
    capabilities: [
      'Get recent photos info',
      'Create and manage albums',
      'Find favorite photos',
      'Search by date',
      'Get photo count',
      'Add photos to albums',
    ],
    examplePrompts: [
      'How many photos do I have?',
      'Create an album called "Vacation 2024"',
      'Show my favorite photos',
      'How many photos did I take last month?',
      'What albums do I have?',
      'Add recent photos to my favorites',
    ],
    quickWins: [
      'photo count', 'my albums', 'recent photos',
    ],
  },
};

/**
 * Category groupings
 */
const CATEGORIES: Record<string, { emoji: string; apps: string[] }> = {
  MEDIA: { emoji: '🎵', apps: ['music', 'photos'] },
  FILES: { emoji: '📁', apps: ['finder'] },
  WEB: { emoji: '🌐', apps: ['safari'] },
  COMMUNICATION: { emoji: '💬', apps: ['mail', 'messages', 'contacts'] },
  PRODUCTIVITY: { emoji: '✅', apps: ['reminders', 'calendar', 'notes'] },
};

/**
 * Get capabilities overview for all apps or a specific app
 */
export async function discoverCapabilities(
  appName?: string | undefined
): Promise<ToolResponse<{
  overview: string;
  runningAppsFirst: boolean;
  suggestedWorkflows: string[];
  learnedPatternsCount: number;
}>> {
  try {
    // Get current system state for context
    const stateResult = await getSystemState();
    const runningApps = stateResult.success && stateResult.data
      ? stateResult.data.runningApps.map(a => a.toLowerCase())
      : [];
    const frontmostApp = stateResult.success && stateResult.data
      ? stateResult.data.frontmostApp?.toLowerCase()
      : null;

    // Get learning stats
    const stats = await getPatternStats();

    // Get available skills
    const availableSkills = await listAvailableSkills();

    let output = '';
    const suggestedWorkflows: string[] = [];

    if (appName) {
      // Deep dive for specific app
      output = await generateAppDeepDive(appName, availableSkills);
    } else {
      // Full overview, prioritized by running apps
      output = await generateFullOverview(runningApps, frontmostApp, availableSkills, stats);

      // Generate suggested workflows based on running apps
      for (const app of runningApps.slice(0, 3)) {
        const cap = APP_CAPABILITIES[app];
        if (cap && cap.examplePrompts[0]) {
          suggestedWorkflows.push(cap.examplePrompts[0]);
        }
      }
    }

    return {
      success: true,
      data: {
        overview: output,
        runningAppsFirst: runningApps.length > 0,
        suggestedWorkflows,
        learnedPatternsCount: stats.totalPatterns,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to discover capabilities',
    };
  }
}

/**
 * Generate deep dive for a specific app
 */
async function generateAppDeepDive(appName: string, availableSkills: string[]): Promise<string> {
  const normalized = appName.toLowerCase().replace(/\.app$/, '').replace(/\s+/g, '-');
  const cap = APP_CAPABILITIES[normalized];

  if (!cap) {
    // Try to find a close match
    const allApps = Object.keys(APP_CAPABILITIES);
    const suggestions = allApps.filter(a =>
      a.includes(normalized) || normalized.includes(a)
    );

    return `## App Not Found: ${appName}

I don't have detailed capability info for "${appName}".

${suggestions.length > 0 ? `**Did you mean:** ${suggestions.join(', ')}?` : ''}

**Apps I know well:**
${Object.values(APP_CAPABILITIES).map(c => `- ${c.emoji} ${c.name}`).join('\n')}

Try: \`discover_capabilities\` with no app name to see all capabilities.`;
  }

  let output = `## ${cap.emoji} ${cap.name} - Deep Dive

${cap.description}

### What I Can Do

${cap.capabilities.map(c => `✓ ${c}`).join('\n')}

### Example Prompts (Copy & Paste!)

${cap.examplePrompts.map((p, i) => `${i + 1}. "${p}"`).join('\n')}

### Quick Wins (Fast Commands)

${cap.quickWins.map(q => `• ${q}`).join('\n')}
`;

  // Add skill file content if available
  if (availableSkills.includes(normalized)) {
    const skill = await getAppSkill(normalized);
    if (skill) {
      // Extract gotchas section
      const gotchasMatch = skill.match(/## .*(?:Gotchas|Important|Notes)([^#]*?)(?=\n## |$)/i);
      if (gotchasMatch) {
        output += `\n### ⚠️ Things to Know\n${gotchasMatch[1]?.trim() || ''}`;
      }
    }
  }

  output += `
### Related Workflows

`;

  // Suggest cross-app workflows
  if (normalized === 'mail') {
    output += `• "Find emails from [person] and create reminders for action items"
• "Summarize my unread emails into a note"
• "Find emails about [topic] and save URLs to Safari reading list"`;
  } else if (normalized === 'music') {
    output += `• "Create a playlist from my most played songs"
• "What was playing when I got that email from [person]?"
• "Add all songs by [artist] to a new playlist"`;
  } else if (normalized === 'safari') {
    output += `• "Save all open tabs as a note with descriptions"
• "Create reminders from my open research tabs"
• "Find all tabs and organize by topic"`;
  } else if (normalized === 'calendar') {
    output += `• "Create a reminder 30 minutes before my next meeting"
• "Email my schedule for tomorrow to [person]"
• "Block focus time on my calendar"`;
  } else {
    output += `• Try combining ${cap.name} with Mail, Calendar, or Notes for powerful workflows!`;
  }

  return output;
}

/**
 * Generate full overview of all capabilities
 */
async function generateFullOverview(
  runningApps: string[],
  frontmostApp: string | null,
  availableSkills: string[],
  stats: { totalPatterns: number; successfulPatterns: number }
): Promise<string> {
  let output = `# 🤖 Mac Automation Capabilities

I can automate your Mac using AppleScript! Here's what's possible:

`;

  // Prioritize running apps
  const mentionedApps = new Set<string>();

  if (runningApps.length > 0) {
    output += `## 🎯 Based on What You're Running Now\n\n`;

    for (const app of runningApps) {
      const cap = APP_CAPABILITIES[app];
      if (cap) {
        mentionedApps.add(app);
        const isFrontmost = app === frontmostApp;
        output += `### ${cap.emoji} ${cap.name}${isFrontmost ? ' (Active)' : ''}\n`;
        output += `${cap.description}\n`;
        output += `**Try:** "${cap.examplePrompts[0]}"\n\n`;
      }
    }

    output += `---\n\n`;
  }

  // Show by category
  output += `## All Capabilities by Category\n\n`;

  for (const [category, info] of Object.entries(CATEGORIES)) {
    output += `### ${info.emoji} ${category}\n\n`;

    for (const appKey of info.apps) {
      if (mentionedApps.has(appKey)) continue; // Skip if already shown above

      const cap = APP_CAPABILITIES[appKey];
      if (cap) {
        output += `**${cap.name}** - ${cap.description}\n`;
        output += `Try: "${cap.examplePrompts[0]}"\n\n`;
      }
    }
  }

  // Learning stats
  if (stats.totalPatterns > 0) {
    output += `---\n\n## 🧠 Learning Status\n\n`;
    output += `I've learned from **${stats.totalPatterns} script executions** (${stats.successfulPatterns} successful).\n`;
    output += `The more we work together, the smarter my suggestions get!\n\n`;
  }

  // Available skills
  output += `---\n\n## 📚 Detailed Skill Guides Available\n\n`;
  output += `I have in-depth knowledge for: ${availableSkills.map(s => `**${s}**`).join(', ')}\n\n`;
  output += `Ask about a specific app for detailed examples: "Tell me more about Music automation"\n\n`;

  // Footer
  output += `---\n\n`;
  output += `**💡 Tips:**\n`;
  output += `• Be specific: "Find emails from John about the budget" works better than "find emails"\n`;
  output += `• I learn from successes - the more you use me, the better I get\n`;
  output += `• If something fails, I'll tell you why and suggest fixes\n`;

  return output;
}

/**
 * Generate failure recovery suggestions
 */
export async function suggestAfterFailure(
  failedApp: string,
  errorType: string
): Promise<string> {
  const cap = APP_CAPABILITIES[failedApp.toLowerCase()];

  if (!cap) {
    return `Try asking "what can you automate?" to see available capabilities.`;
  }

  return `## That didn't work, but here's what does work with ${cap.name}:

${cap.capabilities.slice(0, 3).map(c => `✓ ${c}`).join('\n')}

**Try one of these instead:**
${cap.examplePrompts.slice(0, 3).map(p => `• "${p}"`).join('\n')}

Or ask: "Tell me more about ${cap.name} automation"`;
}

/**
 * Generate success follow-up suggestions
 */
export async function suggestAfterSuccess(
  usedApp: string
): Promise<string> {
  const cap = APP_CAPABILITIES[usedApp.toLowerCase()];

  if (!cap) return '';

  // Find related apps
  let relatedApps: string[] = [];
  for (const [, info] of Object.entries(CATEGORIES)) {
    if (info.apps.includes(usedApp.toLowerCase())) {
      relatedApps = info.apps.filter(a => a !== usedApp.toLowerCase());
      break;
    }
  }

  const relatedCaps = relatedApps
    .map(a => APP_CAPABILITIES[a])
    .filter((c): c is AppCapability => c !== undefined);

  if (relatedCaps.length === 0) return '';

  const related = relatedCaps[0]!;
  return `\n💡 **Related:** You might also like ${related.name} automation. Try: "${related.examplePrompts[0]}"`;
}
