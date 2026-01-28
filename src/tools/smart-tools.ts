/**
 * Smart Tools - Intelligence layer for AppleScript automation
 *
 * These tools leverage the learning system to provide:
 * - Pattern matching from successful executions
 * - Failure analysis with actionable fixes
 * - App-specific skill guidance
 */

import type { ToolResponse } from '../types.js';
import { findSimilarPatterns, logExecution, getPatternStats, type ExecutionRecord } from '../learning/pattern-store.js';
import { analyzeFailure, generateSmartErrorMessage } from '../learning/analyzer.js';
import { getAppSkill, getRelevantExamples, generateSkillContext, listAvailableSkills, getQuickReference } from '../learning/skill-loader.js';

/**
 * Find similar workflow patterns that have worked before
 */
export async function getWorkflowPattern(
  intent: string,
  options?: { app?: string | undefined; action?: string | undefined }
): Promise<ToolResponse<{
  patterns: Array<{
    script: string;
    intent: string;
    successCount: number;
    apps: string[];
  }>;
  skillExamples: string[];
  context: string;
}>> {
  try {
    // Find similar patterns from history
    const patterns = await findSimilarPatterns(intent, {
      app: options?.app,
      action: options?.action,
      limit: 5,
      onlySuccessful: true,
    });

    // Get skill examples if app specified
    let skillExamples: string[] = [];
    let context = '';

    if (options?.app) {
      skillExamples = await getRelevantExamples(options.app, intent);
      context = await generateSkillContext(options.app, intent);
    }

    return {
      success: true,
      data: {
        patterns: patterns.map(p => ({
          script: p.script,
          intent: p.intent,
          successCount: p.successCount,
          apps: p.apps,
        })),
        skillExamples,
        context,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get workflow patterns',
    };
  }
}

/**
 * Analyze why a script failed and suggest fixes
 */
export async function analyzeScriptFailure(
  script: string,
  errorMessage: string
): Promise<ToolResponse<{
  analysis: {
    errorType: string;
    rootCause: string;
    suggestions: string[];
    fixedScript: string | null;
    relatedSuccessfulPattern: string | null;
    confidence: string;
  };
  smartMessage: string;
}>> {
  try {
    const analysis = await analyzeFailure(script, errorMessage);
    const smartMessage = await generateSmartErrorMessage(script, errorMessage);

    return {
      success: true,
      data: {
        analysis: {
          errorType: analysis.errorType,
          rootCause: analysis.rootCause,
          suggestions: analysis.suggestions,
          fixedScript: analysis.fixedScript,
          relatedSuccessfulPattern: analysis.relatedSuccessfulPattern,
          confidence: analysis.confidence,
        },
        smartMessage,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze failure',
    };
  }
}

/**
 * Get the skill guide for an app
 */
export async function getAppSkillGuide(
  appName: string
): Promise<ToolResponse<{
  skill: string | null;
  quickReference: {
    gotchas: string[];
    commonPatterns: string[];
    troubleshooting: string[];
  } | null;
  available: boolean;
}>> {
  try {
    const skill = await getAppSkill(appName);
    const quickRef = await getQuickReference(appName);

    return {
      success: true,
      data: {
        skill,
        quickReference: quickRef,
        available: skill !== null,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get app skill',
    };
  }
}

/**
 * Log a script execution for learning
 */
export async function recordExecution(
  intent: string,
  script: string,
  success: boolean,
  result: string
): Promise<ToolResponse<{ recorded: boolean; patternId: string }>> {
  try {
    const record = await logExecution(intent, script, success, result);
    return {
      success: true,
      data: {
        recorded: true,
        patternId: record.id,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to record execution',
    };
  }
}

/**
 * Get learning statistics
 */
export async function getLearningStats(): Promise<ToolResponse<{
  totalPatterns: number;
  successfulPatterns: number;
  byApp: Record<string, number>;
  byCategory: Record<string, number>;
  topPatterns: Array<{ script: string; successCount: number; apps: string[] }>;
  availableSkills: string[];
}>> {
  try {
    const stats = await getPatternStats();
    const skills = await listAvailableSkills();

    return {
      success: true,
      data: {
        totalPatterns: stats.totalPatterns,
        successfulPatterns: stats.successfulPatterns,
        byApp: stats.byApp,
        byCategory: stats.byCategory,
        topPatterns: stats.topPatterns.map(p => ({
          script: p.script.slice(0, 200) + (p.script.length > 200 ? '...' : ''),
          successCount: p.successCount,
          apps: p.apps,
        })),
        availableSkills: skills,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get learning stats',
    };
  }
}

/**
 * Generate a smart script with context from skills and patterns
 */
export async function getSmartSuggestion(
  appName: string,
  intent: string
): Promise<ToolResponse<{
  suggestion: string;
  basedOn: 'pattern' | 'skill' | 'generic';
  confidence: 'high' | 'medium' | 'low';
  relatedPatterns: string[];
  warnings: string[];
}>> {
  try {
    const warnings: string[] = [];
    let suggestion = '';
    let basedOn: 'pattern' | 'skill' | 'generic' = 'generic';
    let confidence: 'high' | 'medium' | 'low' = 'low';
    const relatedPatterns: string[] = [];

    // First, check for similar patterns
    const patterns = await findSimilarPatterns(intent, {
      app: appName,
      limit: 3,
      onlySuccessful: true,
    });

    if (patterns.length > 0 && patterns[0]) {
      const bestPattern = patterns[0];
      if (bestPattern.successCount >= 3) {
        suggestion = bestPattern.script;
        basedOn = 'pattern';
        confidence = 'high';
        patterns.forEach(p => relatedPatterns.push(p.script.slice(0, 100)));
      } else if (bestPattern.successCount >= 1) {
        suggestion = bestPattern.script;
        basedOn = 'pattern';
        confidence = 'medium';
      }
    }

    // If no good pattern, check skills
    if (!suggestion) {
      const examples = await getRelevantExamples(appName, intent);
      if (examples.length > 0 && examples[0]) {
        suggestion = examples[0];
        basedOn = 'skill';
        confidence = 'medium';
      }
    }

    // Get gotchas as warnings
    const quickRef = await getQuickReference(appName);
    if (quickRef?.gotchas) {
      warnings.push(...quickRef.gotchas.slice(0, 3));
    }

    // If still nothing, provide generic template
    if (!suggestion) {
      suggestion = `tell application "${appName}"
    -- Your commands here
end tell`;
      warnings.push(`No specific patterns found for "${intent}" with ${appName}. Check the app dictionary.`);
    }

    return {
      success: true,
      data: {
        suggestion,
        basedOn,
        confidence,
        relatedPatterns,
        warnings,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get smart suggestion',
    };
  }
}
