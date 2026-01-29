/**
 * Unit tests for Xcode check module.
 */

import { describe, it, expect } from 'vitest';
import { checkXcodeInstalled, formatXcodeMissingError } from './xcode-check.js';

describe('checkXcodeInstalled', () => {
  describe('when Xcode is installed', () => {
    it('returns installed: true when path exists', () => {
      const mockPathChecker = (): boolean => true;
      const result = checkXcodeInstalled(mockPathChecker);
      expect(result.installed).toBe(true);
    });

    it('checks the correct path', () => {
      let checkedPath = '';
      const mockPathChecker = (path: string): boolean => {
        checkedPath = path;
        return true;
      };
      checkXcodeInstalled(mockPathChecker);
      expect(checkedPath).toBe('/Applications/Xcode.app');
    });
  });

  describe('when Xcode is not installed', () => {
    it('returns installed: false when path does not exist', () => {
      const mockPathChecker = (): boolean => false;
      const result = checkXcodeInstalled(mockPathChecker);
      expect(result.installed).toBe(false);
    });
  });

  describe('default path checker', () => {
    it('uses existsSync by default and returns a result', () => {
      // This test verifies the function works with the default implementation
      // The result depends on whether Xcode is actually installed
      const result = checkXcodeInstalled();
      expect(typeof result.installed).toBe('boolean');
    });
  });
});

describe('formatXcodeMissingError', () => {
  it('returns a string', () => {
    const result = formatXcodeMissingError();
    expect(typeof result).toBe('string');
  });

  it('includes statement that Xcode is required', () => {
    const result = formatXcodeMissingError();
    expect(result).toContain('Xcode is required');
  });

  it('includes explanation about sdef command', () => {
    const result = formatXcodeMissingError();
    expect(result).toContain('sdef');
  });

  it('includes explanation about dictionary retrieval', () => {
    const result = formatXcodeMissingError();
    expect(result).toContain('scripting dictionaries');
  });

  it('includes Mac App Store URL', () => {
    const result = formatXcodeMissingError();
    expect(result).toContain('https://apps.apple.com/us/app/xcode/id497799835?mt=12');
  });

  it('includes xcode-select instruction', () => {
    const result = formatXcodeMissingError();
    expect(result).toContain('xcode-select');
  });

  it('is not an empty string', () => {
    const result = formatXcodeMissingError();
    expect(result.length).toBeGreaterThan(0);
  });

  it('includes multiple lines for readability', () => {
    const result = formatXcodeMissingError();
    const lines = result.split('\n');
    expect(lines.length).toBeGreaterThan(1);
  });
});
