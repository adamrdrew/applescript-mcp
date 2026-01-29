/**
 * Unit tests for version utility module.
 */

import { describe, it, expect } from 'vitest';
import { getPackageVersion, formatStartupBanner } from './version.js';

describe('getPackageVersion', () => {
  describe('success cases', () => {
    it('returns version from valid package.json', () => {
      const mockReader = (): string => JSON.stringify({ version: '1.2.3' });
      const result = getPackageVersion(mockReader);
      expect(result).toBe('1.2.3');
    });

    it('handles package.json with additional fields', () => {
      const mockReader = (): string =>
        JSON.stringify({
          name: 'test-package',
          version: '2.0.0',
          description: 'A test package',
        });
      const result = getPackageVersion(mockReader);
      expect(result).toBe('2.0.0');
    });

    it('handles semver with prerelease tags', () => {
      const mockReader = (): string => JSON.stringify({ version: '3.0.0-beta.1' });
      const result = getPackageVersion(mockReader);
      expect(result).toBe('3.0.0-beta.1');
    });
  });

  describe('failure cases', () => {
    it('returns "unknown" when file read throws', () => {
      const mockReader = (): string => {
        throw new Error('ENOENT: file not found');
      };
      const result = getPackageVersion(mockReader);
      expect(result).toBe('unknown');
    });

    it('returns "unknown" for invalid JSON', () => {
      const mockReader = (): string => 'not valid json';
      const result = getPackageVersion(mockReader);
      expect(result).toBe('unknown');
    });

    it('returns "unknown" when version field is missing', () => {
      const mockReader = (): string => JSON.stringify({ name: 'test' });
      const result = getPackageVersion(mockReader);
      expect(result).toBe('unknown');
    });

    it('returns "unknown" when version is not a string', () => {
      const mockReader = (): string => JSON.stringify({ version: 123 });
      const result = getPackageVersion(mockReader);
      expect(result).toBe('unknown');
    });

    it('returns "unknown" for empty JSON object', () => {
      const mockReader = (): string => JSON.stringify({});
      const result = getPackageVersion(mockReader);
      expect(result).toBe('unknown');
    });

    it('returns "unknown" for null JSON', () => {
      const mockReader = (): string => JSON.stringify(null);
      const result = getPackageVersion(mockReader);
      expect(result).toBe('unknown');
    });
  });

  describe('default file reader', () => {
    it('reads from actual package.json when no reader provided', () => {
      // This test uses the default file reader and verifies it works
      const result = getPackageVersion();
      // Should return a valid semver-like version string
      expect(result).toMatch(/^\d+\.\d+\.\d+/);
    });
  });
});

describe('formatStartupBanner', () => {
  it('formats banner with version', () => {
    const result = formatStartupBanner('1.0.0');
    expect(result).toBe(`🍎 Welcome to AppleScript MCP
Version 1.0.0

✅ Server now running...`);
  });

  it('formats banner with unknown version', () => {
    const result = formatStartupBanner('unknown');
    expect(result).toBe(`🍎 Welcome to AppleScript MCP
Version unknown

✅ Server now running...`);
  });

  it('formats banner with prerelease version', () => {
    const result = formatStartupBanner('2.0.0-alpha.3');
    expect(result).toBe(`🍎 Welcome to AppleScript MCP
Version 2.0.0-alpha.3

✅ Server now running...`);
  });

  it('includes apple emoji at start', () => {
    const result = formatStartupBanner('1.0.0');
    expect(result.startsWith('🍎')).toBe(true);
  });

  it('includes checkmark emoji for running message', () => {
    const result = formatStartupBanner('1.0.0');
    expect(result).toContain('✅ Server now running...');
  });

  it('contains blank line between version and running message', () => {
    const result = formatStartupBanner('1.0.0');
    const lines = result.split('\n');
    expect(lines).toHaveLength(4);
    expect(lines[0]).toContain('Welcome');
    expect(lines[1]).toContain('Version');
    expect(lines[2]).toBe('');
    expect(lines[3]).toContain('running');
  });
});
