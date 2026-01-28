/**
 * Skill Loader - Load and serve app-specific skill files
 *
 * Skills are markdown files that contain:
 * - Working examples for each app
 * - Common gotchas and how to avoid them
 * - Object model explanations
 * - Troubleshooting guides
 */

import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const SKILLS_DIR = join(homedir(), '.applescript-mcp', 'skills');

// In-memory cache
const skillsCache = new Map<string, string>();
let skillsListCache: string[] | null = null;

/**
 * Normalize app name for skill file lookup
 */
function normalizeAppName(appName: string): string {
  return appName
    .toLowerCase()
    .replace(/\.app$/, '')
    .replace(/\s+/g, '-');
}

/**
 * Get the skill file content for an app
 */
export async function getAppSkill(appName: string): Promise<string | null> {
  const normalized = normalizeAppName(appName);

  // Check cache
  if (skillsCache.has(normalized)) {
    return skillsCache.get(normalized)!;
  }

  // Try to load from file
  const skillPath = join(SKILLS_DIR, `${normalized}.md`);

  if (!existsSync(skillPath)) {
    return null;
  }

  try {
    const content = await readFile(skillPath, 'utf-8');
    skillsCache.set(normalized, content);
    return content;
  } catch {
    return null;
  }
}

/**
 * List all available skills
 */
export async function listAvailableSkills(): Promise<string[]> {
  if (skillsListCache) {
    return skillsListCache;
  }

  if (!existsSync(SKILLS_DIR)) {
    return [];
  }

  try {
    const files = await readdir(SKILLS_DIR);
    skillsListCache = files
      .filter(f => f.endsWith('.md'))
      .map(f => f.replace('.md', ''));
    return skillsListCache;
  } catch {
    return [];
  }
}

/**
 * Check if we have a skill file for an app
 */
export async function hasSkill(appName: string): Promise<boolean> {
  const normalized = normalizeAppName(appName);
  const skills = await listAvailableSkills();
  return skills.includes(normalized);
}

/**
 * Get relevant examples from a skill file for a specific action
 */
export async function getRelevantExamples(
  appName: string,
  intent: string
): Promise<string[]> {
  const skill = await getAppSkill(appName);
  if (!skill) return [];

  const examples: string[] = [];
  const intentLower = intent.toLowerCase();

  // Extract code blocks from the skill file
  const codeBlockRegex = /```applescript\n([\s\S]*?)```/g;
  let match;

  while ((match = codeBlockRegex.exec(skill)) !== null) {
    const code = match[1]?.trim();
    if (!code) continue;

    // Score this example based on keyword overlap
    const codeLower = code.toLowerCase();
    const intentKeywords = intentLower.split(/\s+/).filter(w => w.length > 2);

    let score = 0;
    for (const keyword of intentKeywords) {
      if (codeLower.includes(keyword)) {
        score++;
      }
    }

    // Also check surrounding context (the text before the code block)
    const blockStart = match.index;
    const contextStart = Math.max(0, blockStart - 200);
    const context = skill.substring(contextStart, blockStart).toLowerCase();

    for (const keyword of intentKeywords) {
      if (context.includes(keyword)) {
        score++;
      }
    }

    if (score > 0) {
      examples.push(code);
    }
  }

  // Sort by relevance (highest first) and limit
  return examples.slice(0, 3);
}

/**
 * Get the gotchas section from a skill file
 */
export async function getGotchas(appName: string): Promise<string | null> {
  const skill = await getAppSkill(appName);
  if (!skill) return null;

  // Find the gotchas section
  const gotchasMatch = skill.match(/## .*Gotchas[\s\S]*?(?=\n## |$)/i);
  if (gotchasMatch) {
    return gotchasMatch[0];
  }

  return null;
}

/**
 * Get a quick reference for an app
 */
export async function getQuickReference(appName: string): Promise<{
  gotchas: string[];
  commonPatterns: string[];
  troubleshooting: string[];
} | null> {
  const skill = await getAppSkill(appName);
  if (!skill) return null;

  const gotchas: string[] = [];
  const commonPatterns: string[] = [];
  const troubleshooting: string[] = [];

  // Extract gotchas
  const gotchasSection = skill.match(/## .*Gotchas([\s\S]*?)(?=\n## |$)/i);
  if (gotchasSection) {
    const lines = gotchasSection[1]?.split('\n') || [];
    for (const line of lines) {
      if (line.startsWith('### ') || line.match(/^\d+\./)) {
        gotchas.push(line.replace(/^#+\s*/, '').replace(/^\d+\.\s*/, ''));
      }
    }
  }

  // Extract common patterns from tables
  const tableMatch = skill.match(/\| Goal \| Script \|[\s\S]*?(?=\n[^|]|$)/i);
  if (tableMatch) {
    const rows = tableMatch[0].split('\n').filter(r => r.startsWith('|'));
    for (const row of rows.slice(2)) { // Skip header and separator
      const cells = row.split('|').map(c => c.trim());
      if (cells[1] && cells[2]) {
        commonPatterns.push(`${cells[1]}: ${cells[2]}`);
      }
    }
  }

  // Extract troubleshooting
  const troubleSection = skill.match(/## .*Troubleshooting([\s\S]*?)(?=\n## |$)/i);
  if (troubleSection) {
    const tableRows = troubleSection[1]?.match(/\|[^|]+\|[^|]+\|[^|]+\|/g) || [];
    for (const row of tableRows.slice(2)) { // Skip header
      const cells = row.split('|').map(c => c.trim()).filter(Boolean);
      if (cells[0] && cells[2]) {
        troubleshooting.push(`${cells[0]}: ${cells[2]}`);
      }
    }
  }

  return { gotchas, commonPatterns, troubleshooting };
}

/**
 * Generate a context prompt for an LLM based on skills
 */
export async function generateSkillContext(
  appName: string,
  intent: string
): Promise<string> {
  const parts: string[] = [];

  // Get relevant examples
  const examples = await getRelevantExamples(appName, intent);
  if (examples.length > 0) {
    parts.push('## Relevant Working Examples\n');
    examples.forEach((ex, i) => {
      parts.push(`### Example ${i + 1}\n\`\`\`applescript\n${ex}\n\`\`\`\n`);
    });
  }

  // Get gotchas
  const gotchas = await getGotchas(appName);
  if (gotchas) {
    parts.push(`\n## Important Notes for ${appName}\n${gotchas}\n`);
  }

  // Get quick reference
  const ref = await getQuickReference(appName);
  if (ref && ref.commonPatterns.length > 0) {
    parts.push('\n## Quick Patterns\n');
    ref.commonPatterns.slice(0, 5).forEach(p => parts.push(`- ${p}\n`));
  }

  return parts.join('');
}

/**
 * Clear the skills cache (for testing)
 */
export function clearSkillsCache(): void {
  skillsCache.clear();
  skillsListCache = null;
}
