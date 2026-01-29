/**
 * Tests for learning/pattern-store.ts
 *
 * These tests verify the pure utility functions for keyword extraction,
 * action extraction, categorization, and script normalization.
 */

import { describe, it, expect } from 'vitest';
import {
  extractKeywords,
  extractActions,
  categorize,
  extractApps,
  normalizeScript,
} from './pattern-store.js';

// ============================================================
// extractKeywords Tests
// ============================================================

describe('extractKeywords', () => {
  it('extracts meaningful keywords', () => {
    const keywords = extractKeywords('play the current song in music app');
    expect(keywords).toContain('play');
    expect(keywords).toContain('current');
    expect(keywords).toContain('song');
    expect(keywords).toContain('music');
    expect(keywords).toContain('app');
  });

  it('filters out stop words', () => {
    const keywords = extractKeywords('the a an to from in on at of for with');
    expect(keywords).toHaveLength(0);
  });

  it('converts to lowercase', () => {
    const keywords = extractKeywords('PLAY Music SONG');
    expect(keywords).toContain('play');
    expect(keywords).toContain('music');
    expect(keywords).toContain('song');
  });

  it('removes punctuation', () => {
    const keywords = extractKeywords("play song, get name! what's up?");
    expect(keywords).toContain('play');
    expect(keywords).toContain('song');
    expect(keywords).toContain('get');
    expect(keywords).toContain('name');
    expect(keywords).toContain('what');
  });

  it('filters short words', () => {
    const keywords = extractKeywords('a is of be do go');
    expect(keywords).toHaveLength(0);
  });

  it('handles empty string', () => {
    const keywords = extractKeywords('');
    expect(keywords).toHaveLength(0);
  });
});

// ============================================================
// extractActions Tests
// ============================================================

describe('extractActions', () => {
  it('extracts create actions', () => {
    const actions = extractActions('make new playlist with name "Test"');
    expect(actions).toContain('make');
    expect(actions).toContain('new');
  });

  it('extracts delete actions', () => {
    const actions = extractActions('delete track 1');
    expect(actions).toContain('delete');
  });

  it('extracts get/set actions', () => {
    const actions = extractActions('get name of track 1\nset volume to 50');
    expect(actions).toContain('get');
    expect(actions).toContain('set');
  });

  it('extracts play/pause actions', () => {
    const actions = extractActions('play\npause\nstop');
    expect(actions).toContain('play');
    expect(actions).toContain('pause');
    expect(actions).toContain('stop');
  });

  it('extracts file operations', () => {
    const actions = extractActions('move file to folder\ncopy item\nduplicate');
    expect(actions).toContain('move');
    expect(actions).toContain('copy');
    expect(actions).toContain('duplicate');
  });

  it('extracts app control actions', () => {
    const actions = extractActions('open app\nclose window\nquit\nactivate');
    expect(actions).toContain('open');
    expect(actions).toContain('close');
    expect(actions).toContain('quit');
    expect(actions).toContain('activate');
  });

  it('handles script with no actions', () => {
    const actions = extractActions('tell application "Finder"\nend tell');
    expect(actions).toHaveLength(0);
  });

  it('deduplicates actions', () => {
    const actions = extractActions('get name\nget title\nget value');
    const getCount = actions.filter((a) => a === 'get').length;
    expect(getCount).toBe(1);
  });
});

// ============================================================
// categorize Tests
// ============================================================

describe('categorize', () => {
  it('categorizes music as media', () => {
    expect(categorize(['Music'], [])).toBe('media');
  });

  it('categorizes TV as media', () => {
    expect(categorize(['TV'], [])).toBe('media');
  });

  it('categorizes Photos as media', () => {
    expect(categorize(['Photos'], [])).toBe('media');
  });

  it('categorizes Finder as files', () => {
    expect(categorize(['Finder'], [])).toBe('files');
  });

  it('categorizes by file actions', () => {
    expect(categorize([], ['move'])).toBe('files');
    expect(categorize([], ['copy'])).toBe('files');
    expect(categorize([], ['delete'])).toBe('files');
  });

  it('categorizes Mail as communication', () => {
    expect(categorize(['Mail'], [])).toBe('communication');
  });

  it('categorizes Messages as communication', () => {
    expect(categorize(['Messages'], [])).toBe('communication');
  });

  it('categorizes Calendar as productivity', () => {
    expect(categorize(['Calendar'], [])).toBe('productivity');
  });

  it('categorizes Reminders as productivity', () => {
    expect(categorize(['Reminders'], [])).toBe('productivity');
  });

  it('categorizes Notes as productivity', () => {
    expect(categorize(['Notes'], [])).toBe('productivity');
  });

  it('categorizes System Events as system', () => {
    expect(categorize(['System Events'], [])).toBe('system');
  });

  it('returns other for unknown apps', () => {
    expect(categorize(['Custom App'], [])).toBe('other');
  });

  it('is case-insensitive', () => {
    expect(categorize(['MUSIC'], [])).toBe('media');
    expect(categorize(['finder'], [])).toBe('files');
  });
});

// ============================================================
// extractApps Tests
// ============================================================

describe('extractApps', () => {
  it('extracts single app', () => {
    const apps = extractApps('tell application "Music"\nplay\nend tell');
    expect(apps).toEqual(['Music']);
  });

  it('extracts multiple apps', () => {
    const apps = extractApps(`
      tell application "Music"
        play
      end tell
      tell application "Finder"
        activate
      end tell
    `);
    expect(apps).toContain('Music');
    expect(apps).toContain('Finder');
  });

  it('handles nested tell blocks', () => {
    const apps = extractApps(`
      tell application "System Events"
        tell application "Music"
          play
        end tell
      end tell
    `);
    expect(apps).toContain('System Events');
    expect(apps).toContain('Music');
  });

  it('returns empty array for no apps', () => {
    const apps = extractApps('return 1 + 1');
    expect(apps).toHaveLength(0);
  });

  it('is case-insensitive in matching', () => {
    const apps = extractApps('TELL APPLICATION "Music"\nEND TELL');
    expect(apps).toEqual(['Music']);
  });
});

// ============================================================
// normalizeScript Tests
// ============================================================

describe('normalizeScript', () => {
  it('trims whitespace', () => {
    expect(normalizeScript('  play  ')).toBe('play');
  });

  it('collapses multiple spaces', () => {
    expect(normalizeScript('play   pause    stop')).toBe('play pause stop');
  });

  it('normalizes newlines', () => {
    expect(normalizeScript('line1\nline2\n\nline3')).toBe('line1 line2 line3');
  });

  it('normalizes tabs', () => {
    expect(normalizeScript('tell\t\tapplication')).toBe('tell application');
  });

  it('converts to lowercase', () => {
    expect(normalizeScript('TELL Application "Music"')).toBe(
      'tell application "music"'
    );
  });

  it('handles complex scripts', () => {
    const script = `
      tell application "Music"
        play
      end tell
    `;
    expect(normalizeScript(script)).toBe(
      'tell application "music" play end tell'
    );
  });
});
