/**
 * Tests for type guards in types.ts
 *
 * These verify that type guards correctly validate input parameters
 * for all MCP tool handlers.
 */

import { describe, it, expect } from 'vitest';
import {
  isExecuteParams,
  isGetDictionaryParams,
  isExtendedExecuteParams,
  isValidateScriptParams,
  isWorkflowPatternParams,
  isAnalyzeFailureParams,
  isAppSkillParams,
  isSmartSuggestionParams,
  isDiscoverCapabilitiesParams,
} from './types.js';

describe('isExecuteParams', () => {
  it('accepts valid params with script only', () => {
    expect(isExecuteParams({ script: 'tell application "Finder" to activate' })).toBe(true);
  });

  it('accepts valid params with script and timeout', () => {
    expect(isExecuteParams({ script: 'return 1', timeout: 5000 })).toBe(true);
  });

  it('rejects null', () => {
    expect(isExecuteParams(null)).toBe(false);
  });

  it('rejects non-object', () => {
    expect(isExecuteParams('string')).toBe(false);
    expect(isExecuteParams(123)).toBe(false);
  });

  it('rejects missing script', () => {
    expect(isExecuteParams({})).toBe(false);
    expect(isExecuteParams({ timeout: 5000 })).toBe(false);
  });

  it('rejects non-string script', () => {
    expect(isExecuteParams({ script: 123 })).toBe(false);
    expect(isExecuteParams({ script: null })).toBe(false);
  });

  it('rejects non-number timeout', () => {
    expect(isExecuteParams({ script: 'test', timeout: '5000' })).toBe(false);
  });
});

describe('isGetDictionaryParams', () => {
  it('accepts valid params', () => {
    expect(isGetDictionaryParams({ app: 'Finder' })).toBe(true);
  });

  it('rejects missing app', () => {
    expect(isGetDictionaryParams({})).toBe(false);
  });

  it('rejects non-string app', () => {
    expect(isGetDictionaryParams({ app: 123 })).toBe(false);
  });

  it('rejects null', () => {
    expect(isGetDictionaryParams(null)).toBe(false);
  });
});

describe('isExtendedExecuteParams', () => {
  it('accepts script only', () => {
    expect(isExtendedExecuteParams({ script: 'return 1' })).toBe(true);
  });

  it('accepts all optional params', () => {
    expect(isExtendedExecuteParams({
      script: 'return 1',
      intent: 'test intent',
      timeout: 5000,
      confirmedDangerous: true,
    })).toBe(true);
  });

  it('rejects non-string intent', () => {
    expect(isExtendedExecuteParams({ script: 'test', intent: 123 })).toBe(false);
  });

  it('rejects non-number timeout', () => {
    expect(isExtendedExecuteParams({ script: 'test', timeout: '5000' })).toBe(false);
  });

  it('rejects non-boolean confirmedDangerous', () => {
    expect(isExtendedExecuteParams({ script: 'test', confirmedDangerous: 'yes' })).toBe(false);
  });
});

describe('isValidateScriptParams', () => {
  it('accepts valid params', () => {
    expect(isValidateScriptParams({ script: 'return 1' })).toBe(true);
  });

  it('rejects missing script', () => {
    expect(isValidateScriptParams({})).toBe(false);
  });

  it('rejects non-string script', () => {
    expect(isValidateScriptParams({ script: null })).toBe(false);
  });
});

describe('isWorkflowPatternParams', () => {
  it('accepts intent only', () => {
    expect(isWorkflowPatternParams({ intent: 'play music' })).toBe(true);
  });

  it('accepts with optional app', () => {
    expect(isWorkflowPatternParams({ intent: 'play music', app: 'Music' })).toBe(true);
  });

  it('accepts with optional action', () => {
    expect(isWorkflowPatternParams({ intent: 'play music', action: 'play' })).toBe(true);
  });

  it('accepts all params', () => {
    expect(isWorkflowPatternParams({
      intent: 'play music',
      app: 'Music',
      action: 'play',
    })).toBe(true);
  });

  it('rejects missing intent', () => {
    expect(isWorkflowPatternParams({ app: 'Music' })).toBe(false);
  });

  it('rejects non-string intent', () => {
    expect(isWorkflowPatternParams({ intent: 123 })).toBe(false);
  });

  it('rejects non-string app', () => {
    expect(isWorkflowPatternParams({ intent: 'test', app: 123 })).toBe(false);
  });

  it('rejects non-string action', () => {
    expect(isWorkflowPatternParams({ intent: 'test', action: true })).toBe(false);
  });
});

describe('isAnalyzeFailureParams', () => {
  it('accepts valid params', () => {
    expect(isAnalyzeFailureParams({
      script: 'tell application "Foo" to bar',
      error: 'Foo got an error',
    })).toBe(true);
  });

  it('rejects missing script', () => {
    expect(isAnalyzeFailureParams({ error: 'some error' })).toBe(false);
  });

  it('rejects missing error', () => {
    expect(isAnalyzeFailureParams({ script: 'some script' })).toBe(false);
  });

  it('rejects non-string script', () => {
    expect(isAnalyzeFailureParams({ script: 123, error: 'error' })).toBe(false);
  });

  it('rejects non-string error', () => {
    expect(isAnalyzeFailureParams({ script: 'script', error: null })).toBe(false);
  });
});

describe('isAppSkillParams', () => {
  it('accepts valid params', () => {
    expect(isAppSkillParams({ app: 'Music' })).toBe(true);
  });

  it('rejects missing app', () => {
    expect(isAppSkillParams({})).toBe(false);
  });

  it('rejects non-string app', () => {
    expect(isAppSkillParams({ app: ['Music', 'Finder'] })).toBe(false);
  });
});

describe('isSmartSuggestionParams', () => {
  it('accepts valid params', () => {
    expect(isSmartSuggestionParams({ app: 'Music', intent: 'play a song' })).toBe(true);
  });

  it('rejects missing app', () => {
    expect(isSmartSuggestionParams({ intent: 'play a song' })).toBe(false);
  });

  it('rejects missing intent', () => {
    expect(isSmartSuggestionParams({ app: 'Music' })).toBe(false);
  });

  it('rejects non-string app', () => {
    expect(isSmartSuggestionParams({ app: null, intent: 'test' })).toBe(false);
  });

  it('rejects non-string intent', () => {
    expect(isSmartSuggestionParams({ app: 'Music', intent: 123 })).toBe(false);
  });
});

describe('isDiscoverCapabilitiesParams', () => {
  it('accepts empty object', () => {
    expect(isDiscoverCapabilitiesParams({})).toBe(true);
  });

  it('accepts with optional app', () => {
    expect(isDiscoverCapabilitiesParams({ app: 'Music' })).toBe(true);
  });

  it('rejects non-string app', () => {
    expect(isDiscoverCapabilitiesParams({ app: 123 })).toBe(false);
  });

  it('rejects null', () => {
    expect(isDiscoverCapabilitiesParams(null)).toBe(false);
  });
});
