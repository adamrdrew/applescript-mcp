/**
 * Tests for learning/analyzer.ts
 *
 * These tests verify failure analysis and Music-specific error handling.
 */

import { describe, it, expect } from 'vitest';
import { analyzeFailure, analyzeMusicFailure, type ErrorType } from './analyzer.js';

// ============================================================
// analyzeMusicFailure Tests
// ============================================================

describe('analyzeMusicFailure', () => {
  it('detects add vs duplicate issue', () => {
    const script = 'tell application "Music"\nadd track 1 to playlist "Test"\nend tell';
    const error = "Music doesn't understand the add message";

    const result = analyzeMusicFailure(script, error);

    expect(result).not.toBeNull();
    expect(result?.issue).toContain('duplicate');
    expect(result?.correctedScript).toContain('duplicate');
  });

  it('detects search context issue', () => {
    const script = 'tell application "Music"\nsearch for "Beatles"\nend tell';
    const error = "Can't get search";

    const result = analyzeMusicFailure(script, error);

    expect(result).not.toBeNull();
    expect(result?.issue).toContain('library playlist');
  });

  it('detects song vs track terminology', () => {
    const script = 'tell application "Music"\nget name of song 1\nend tell';
    const error = '';

    const result = analyzeMusicFailure(script, error);

    expect(result).not.toBeNull();
    expect(result?.issue).toContain('tracks');
    expect(result?.correctedScript).toContain('track');
  });

  it('detects current track without playback', () => {
    const script = 'tell application "Music"\nget name of current track\nend tell';
    const error = "Can't get current track";

    const result = analyzeMusicFailure(script, error);

    expect(result).not.toBeNull();
    expect(result?.issue).toContain('playing');
  });

  it('returns null for non-Music issues', () => {
    const script = 'tell application "Music"\nplay\nend tell';
    const error = 'timeout error';

    const result = analyzeMusicFailure(script, error);

    expect(result).toBeNull();
  });
});

// ============================================================
// analyzeFailure Tests
// ============================================================

describe('analyzeFailure', () => {
  it('identifies permission denied errors', async () => {
    const script = 'tell application "Finder"\nactivate\nend tell';
    const error = 'Not authorized to send Apple events to Finder.';

    const result = await analyzeFailure(script, error);

    expect(result.errorType).toBe('permission_denied');
    expect(result.rootCause).toContain('Finder');
    expect(result.suggestions.some((s) => s.includes('System Settings'))).toBe(true);
  });

  it('identifies app not running errors', async () => {
    const script = 'tell application "Music"\nplay\nend tell';
    const error = "Application isn't running";

    const result = await analyzeFailure(script, error);

    expect(result.errorType).toBe('app_not_running');
    expect(result.rootCause).toContain('Music');
    expect(result.suggestions.some((s) => s.includes('activate'))).toBe(true);
    expect(result.fixedScript).toContain('activate');
  });

  it('identifies object not found errors', async () => {
    const script = 'tell application "Finder"\nget name of window 1\nend tell';
    const error = "Can't get window 1";

    const result = await analyzeFailure(script, error);

    expect(result.errorType).toBe('object_not_found');
    expect(result.suggestions.some((s) => s.includes('exists'))).toBe(true);
  });

  it('identifies command not understood errors', async () => {
    const script = 'tell application "Music"\nfoo\nend tell';
    const error = "Music doesn't understand the foo message";

    const result = await analyzeFailure(script, error);

    expect(result.errorType).toBe('command_not_understood');
    expect(result.rootCause).toContain('Music');
    expect(result.rootCause).toContain('foo');
  });

  it('identifies syntax errors', async () => {
    const script = 'tell application "Music"\nplay\n';
    const error = 'syntax error: Expected end of line';

    const result = await analyzeFailure(script, error);

    expect(result.errorType).toBe('syntax_error');
    expect(result.suggestions.some((s) => s.includes('end tell'))).toBe(true);
  });

  it('identifies type mismatch errors', async () => {
    const script = 'set x to "hello" + 1';
    const error = "Can't make \"hello\" into type number";

    const result = await analyzeFailure(script, error);

    expect(result.errorType).toBe('type_mismatch');
    expect(result.suggestions.some((s) => s.includes('coercion'))).toBe(true);
  });

  it('identifies index out of bounds errors', async () => {
    const script = 'tell application "Finder"\nget item 999 of desktop\nend tell';
    const error = 'Invalid index';

    const result = await analyzeFailure(script, error);

    expect(result.errorType).toBe('index_out_of_bounds');
    expect(result.suggestions.some((s) => s.includes('count'))).toBe(true);
  });

  it('identifies timeout errors', async () => {
    const script = 'delay 1000';
    const error = 'Script timed out';

    const result = await analyzeFailure(script, error);

    expect(result.errorType).toBe('timeout');
    expect(result.suggestions.some((s) => s.includes('timeout'))).toBe(true);
  });

  it('identifies user cancelled errors', async () => {
    const script = 'display dialog "Test"';
    const error = 'User canceled (-128)';

    const result = await analyzeFailure(script, error);

    expect(result.errorType).toBe('user_cancelled');
    expect(result.suggestions.some((s) => s.includes('expected'))).toBe(true);
  });

  it('handles unknown errors', async () => {
    const script = 'some random script';
    const error = 'Some completely unknown error type xyz123';

    const result = await analyzeFailure(script, error);

    expect(result.errorType).toBe('unknown');
    expect(result.confidence).toBe('low');
  });

  it('returns high confidence for known patterns', async () => {
    const script = 'tell application "Music"\nplay\nend tell';
    const error = "Application isn't running";

    const result = await analyzeFailure(script, error);

    expect(result.confidence).toBe('high');
  });

  it('generates auto-fix for app not running', async () => {
    const script = 'tell application "Music"\nplay\nend tell';
    const error = 'Application not running';

    const result = await analyzeFailure(script, error);

    expect(result.fixedScript).not.toBeNull();
    expect(result.fixedScript).toContain('activate');
  });

  it('extracts app name from script', async () => {
    const script = 'tell application "Safari"\nopen location "https://example.com"\nend tell';
    const error = 'Not authorized';

    const result = await analyzeFailure(script, error);

    expect(result.rootCause).toContain('Safari');
  });
});

// ============================================================
// Error Code Pattern Tests
// ============================================================

describe('error code patterns', () => {
  it('identifies -600 as app not running', async () => {
    const result = await analyzeFailure('tell app "X" to play', 'Error -600');
    expect(result.errorType).toBe('app_not_running');
  });

  it('identifies -1743 as permission denied', async () => {
    const result = await analyzeFailure('tell app "X" to play', 'Error -1743');
    expect(result.errorType).toBe('permission_denied');
  });

  it('identifies -1728 as object not found', async () => {
    const result = await analyzeFailure('get window 1', 'Error -1728');
    expect(result.errorType).toBe('object_not_found');
  });

  it('identifies -1708 as command not understood', async () => {
    const result = await analyzeFailure('tell app "X" to foo', 'Error -1708');
    expect(result.errorType).toBe('command_not_understood');
  });

  it('identifies -128 as user cancelled', async () => {
    const result = await analyzeFailure('display dialog "X"', 'Error -128');
    expect(result.errorType).toBe('user_cancelled');
  });
});
