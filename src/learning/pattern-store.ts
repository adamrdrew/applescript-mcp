/**
 * Pattern Store - The brain that remembers what works
 *
 * Every script execution is logged. Successful patterns are indexed
 * by intent, app, and action type for fast retrieval.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DATA_DIR = join(homedir(), '.applescript-mcp');
const PATTERNS_FILE = join(DATA_DIR, 'learned-patterns.json');
const PATTERNS_INDEX_FILE = join(DATA_DIR, 'patterns-index.json');

/**
 * A single execution record
 */
export interface ExecutionRecord {
  id: string;
  timestamp: string;

  // What the user wanted (natural language intent)
  intent: string;

  // The apps involved
  apps: string[];

  // The script that was executed
  script: string;

  // Did it work?
  success: boolean;

  // What was the output/error?
  result: string;

  // Categorization for fast lookup
  category: 'media' | 'files' | 'communication' | 'productivity' | 'system' | 'other';

  // Action verbs: create, read, update, delete, play, pause, etc.
  actions: string[];

  // How many times has this exact pattern been used successfully?
  successCount: number;

  // Semantic keywords for fuzzy matching
  keywords: string[];
}

/**
 * Index for fast pattern lookup
 */
interface PatternIndex {
  byApp: Record<string, string[]>;      // app -> [pattern ids]
  byAction: Record<string, string[]>;   // action -> [pattern ids]
  byCategory: Record<string, string[]>; // category -> [pattern ids]
  byKeyword: Record<string, string[]>;  // keyword -> [pattern ids]
}

// In-memory cache
let patternsCache: Map<string, ExecutionRecord> | null = null;
let indexCache: PatternIndex | null = null;

/**
 * Initialize the data directory
 */
async function ensureDataDir(): Promise<void> {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

/**
 * Load patterns from disk
 */
async function loadPatterns(): Promise<Map<string, ExecutionRecord>> {
  if (patternsCache) return patternsCache;

  await ensureDataDir();

  try {
    const data = await readFile(PATTERNS_FILE, 'utf-8');
    const records: ExecutionRecord[] = JSON.parse(data);
    patternsCache = new Map(records.map(r => [r.id, r]));
  } catch {
    patternsCache = new Map();
  }

  return patternsCache;
}

/**
 * Load index from disk
 */
async function loadIndex(): Promise<PatternIndex> {
  if (indexCache) return indexCache;

  await ensureDataDir();

  try {
    const data = await readFile(PATTERNS_INDEX_FILE, 'utf-8');
    indexCache = JSON.parse(data);
  } catch {
    indexCache = {
      byApp: {},
      byAction: {},
      byCategory: {},
      byKeyword: {},
    };
  }

  return indexCache!;
}

/**
 * Save patterns to disk
 */
async function savePatterns(): Promise<void> {
  if (!patternsCache) return;

  await ensureDataDir();
  const records = Array.from(patternsCache.values());
  await writeFile(PATTERNS_FILE, JSON.stringify(records, null, 2));
}

/**
 * Save index to disk
 */
async function saveIndex(): Promise<void> {
  if (!indexCache) return;

  await ensureDataDir();
  await writeFile(PATTERNS_INDEX_FILE, JSON.stringify(indexCache, null, 2));
}

/**
 * Extract keywords from intent/script for indexing
 */
export function extractKeywords(text: string): string[] {
  const stopWords = new Set(['the', 'a', 'an', 'to', 'from', 'in', 'on', 'at', 'of', 'for', 'with', 'and', 'or', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'me', 'my', 'mine', 'we', 'us', 'our', 'ours', 'you', 'your', 'yours', 'he', 'him', 'his', 'she', 'her', 'hers', 'they', 'them', 'their', 'theirs']);

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}

/**
 * Extract action verbs from script
 */
export function extractActions(script: string): string[] {
  const actionPatterns = [
    /\b(create|make|new)\b/gi,
    /\b(delete|remove|trash)\b/gi,
    /\b(get|read|fetch|retrieve)\b/gi,
    /\b(set|update|modify|change)\b/gi,
    /\b(play|pause|stop|resume)\b/gi,
    /\b(open|close|quit|activate)\b/gi,
    /\b(move|copy|duplicate)\b/gi,
    /\b(send|email|message)\b/gi,
    /\b(add|append|insert)\b/gi,
    /\b(search|find|locate)\b/gi,
    /\b(list|show|display)\b/gi,
    /\b(save|export|write)\b/gi,
  ];

  const actions = new Set<string>();
  for (const pattern of actionPatterns) {
    const matches = script.match(pattern);
    if (matches) {
      matches.forEach(m => actions.add(m.toLowerCase()));
    }
  }

  return Array.from(actions);
}

/**
 * Determine category from apps and actions
 */
export function categorize(apps: string[], actions: string[]): ExecutionRecord['category'] {
  const appSet = new Set(apps.map(a => a.toLowerCase()));
  const actionSet = new Set(actions);

  if (appSet.has('music') || appSet.has('tv') || appSet.has('podcasts') || appSet.has('photos')) {
    return 'media';
  }
  if (appSet.has('finder') || actionSet.has('move') || actionSet.has('copy') || actionSet.has('delete')) {
    return 'files';
  }
  if (appSet.has('mail') || appSet.has('messages') || appSet.has('contacts')) {
    return 'communication';
  }
  if (appSet.has('calendar') || appSet.has('reminders') || appSet.has('notes')) {
    return 'productivity';
  }
  if (appSet.has('system events') || appSet.has('system preferences')) {
    return 'system';
  }

  return 'other';
}

/**
 * Extract app names from a script
 */
export function extractApps(script: string): string[] {
  const appMatches = script.match(/tell application "([^"]+)"/gi) || [];
  return appMatches.map(m => {
    const match = m.match(/"([^"]+)"/);
    return match ? match[1]! : '';
  }).filter(Boolean);
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Log an execution and update patterns
 */
export async function logExecution(
  intent: string,
  script: string,
  success: boolean,
  result: string
): Promise<ExecutionRecord> {
  const patterns = await loadPatterns();
  const index = await loadIndex();

  const apps = extractApps(script);
  const actions = extractActions(script);
  const keywords = extractKeywords(intent + ' ' + script);
  const category = categorize(apps, actions);

  // Check if we have an existing pattern for this exact script
  let existingPattern: ExecutionRecord | undefined;
  for (const pattern of patterns.values()) {
    if (normalizeScript(pattern.script) === normalizeScript(script)) {
      existingPattern = pattern;
      break;
    }
  }

  let record: ExecutionRecord;

  if (existingPattern) {
    // Update existing pattern
    record = {
      ...existingPattern,
      timestamp: new Date().toISOString(),
      success,
      result,
      successCount: success ? existingPattern.successCount + 1 : existingPattern.successCount,
    };
    patterns.set(record.id, record);
  } else {
    // Create new pattern
    record = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      intent,
      apps,
      script,
      success,
      result,
      category,
      actions,
      keywords,
      successCount: success ? 1 : 0,
    };
    patterns.set(record.id, record);

    // Update index
    for (const app of apps) {
      const appLower = app.toLowerCase();
      if (!index.byApp[appLower]) index.byApp[appLower] = [];
      index.byApp[appLower].push(record.id);
    }
    for (const action of actions) {
      if (!index.byAction[action]) index.byAction[action] = [];
      index.byAction[action].push(record.id);
    }
    if (!index.byCategory[category]) index.byCategory[category] = [];
    index.byCategory[category].push(record.id);
    for (const keyword of keywords) {
      if (!index.byKeyword[keyword]) index.byKeyword[keyword] = [];
      index.byKeyword[keyword].push(record.id);
    }
  }

  // Save
  await savePatterns();
  await saveIndex();

  return record;
}

/**
 * Normalize a script for comparison (remove whitespace variations)
 */
export function normalizeScript(script: string): string {
  return script.replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Find patterns similar to a given intent
 */
export async function findSimilarPatterns(
  intent: string,
  options?: {
    app?: string | undefined;
    action?: string | undefined;
    limit?: number | undefined;
    onlySuccessful?: boolean | undefined;
  }
): Promise<ExecutionRecord[]> {
  const patterns = await loadPatterns();
  const index = await loadIndex();

  const limit = options?.limit ?? 5;
  const onlySuccessful = options?.onlySuccessful ?? true;

  // Start with candidate IDs
  let candidateIds = new Set<string>();

  // If app specified, start with that
  if (options?.app) {
    const appIds = index.byApp[options.app.toLowerCase()] || [];
    appIds.forEach(id => candidateIds.add(id));
  }

  // If action specified, intersect or add
  if (options?.action) {
    const actionIds = index.byAction[options.action.toLowerCase()] || [];
    if (candidateIds.size > 0) {
      // Intersect
      candidateIds = new Set(actionIds.filter(id => candidateIds.has(id)));
    } else {
      actionIds.forEach(id => candidateIds.add(id));
    }
  }

  // If no filters, use keyword matching
  if (candidateIds.size === 0) {
    const keywords = extractKeywords(intent);
    for (const keyword of keywords) {
      const keywordIds = index.byKeyword[keyword] || [];
      keywordIds.forEach(id => candidateIds.add(id));
    }
  }

  // If still nothing, return top patterns by success count
  if (candidateIds.size === 0) {
    candidateIds = new Set(patterns.keys());
  }

  // Get patterns and score them
  const candidates: Array<{ pattern: ExecutionRecord; score: number }> = [];
  const intentKeywords = new Set(extractKeywords(intent));

  for (const id of candidateIds) {
    const pattern = patterns.get(id);
    if (!pattern) continue;
    if (onlySuccessful && !pattern.success) continue;

    // Score based on keyword overlap and success count
    const keywordOverlap = pattern.keywords.filter(k => intentKeywords.has(k)).length;
    const score = keywordOverlap * 10 + pattern.successCount;

    candidates.push({ pattern, score });
  }

  // Sort by score and return top N
  candidates.sort((a, b) => b.score - a.score);

  return candidates.slice(0, limit).map(c => c.pattern);
}

/**
 * Get the best pattern for a specific app and action
 */
export async function getBestPattern(
  app: string,
  action: string
): Promise<ExecutionRecord | null> {
  const patterns = await findSimilarPatterns('', {
    app,
    action,
    limit: 1,
    onlySuccessful: true,
  });

  return patterns[0] || null;
}

/**
 * Get all patterns for an app
 */
export async function getPatternsForApp(app: string): Promise<ExecutionRecord[]> {
  const patterns = await loadPatterns();
  const index = await loadIndex();

  const appIds = index.byApp[app.toLowerCase()] || [];
  return appIds
    .map(id => patterns.get(id))
    .filter((p): p is ExecutionRecord => p !== undefined)
    .sort((a, b) => b.successCount - a.successCount);
}

/**
 * Get statistics about learned patterns
 */
export async function getPatternStats(): Promise<{
  totalPatterns: number;
  successfulPatterns: number;
  byApp: Record<string, number>;
  byCategory: Record<string, number>;
  topPatterns: ExecutionRecord[];
}> {
  const patterns = await loadPatterns();

  let successfulPatterns = 0;
  const byApp: Record<string, number> = {};
  const byCategory: Record<string, number> = {};

  for (const pattern of patterns.values()) {
    if (pattern.success) successfulPatterns++;

    for (const app of pattern.apps) {
      byApp[app] = (byApp[app] || 0) + 1;
    }

    byCategory[pattern.category] = (byCategory[pattern.category] || 0) + 1;
  }

  const topPatterns = Array.from(patterns.values())
    .filter(p => p.success)
    .sort((a, b) => b.successCount - a.successCount)
    .slice(0, 10);

  return {
    totalPatterns: patterns.size,
    successfulPatterns,
    byApp,
    byCategory,
    topPatterns,
  };
}

/**
 * Clear all patterns (for testing)
 */
export async function clearPatterns(): Promise<void> {
  patternsCache = new Map();
  indexCache = {
    byApp: {},
    byAction: {},
    byCategory: {},
    byKeyword: {},
  };
  await savePatterns();
  await saveIndex();
}
