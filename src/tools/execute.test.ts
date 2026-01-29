/**
 * Tests for tools/execute.ts
 *
 * These tests verify the safety analysis system and script builder utilities.
 */

import { describe, it, expect } from 'vitest';
import { analyzeScriptSafety, ScriptBuilder } from './execute.js';

// ============================================================
// analyzeScriptSafety Tests
// ============================================================

describe('analyzeScriptSafety', () => {
  describe('safe scripts (none/low risk)', () => {
    it('allows simple play command', () => {
      const result = analyzeScriptSafety('tell application "Music" to play');
      expect(result.safe).toBe(true);
      expect(result.risk).toBe('none');
      expect(result.requiresConfirmation).toBe(false);
    });

    it('allows get operations', () => {
      const result = analyzeScriptSafety('tell application "Finder" to get name of every file');
      expect(result.safe).toBe(true);
      expect(result.risk).toBe('none');
    });

    it('allows activate commands', () => {
      const result = analyzeScriptSafety('tell application "Safari" to activate');
      expect(result.safe).toBe(true);
    });
  });

  describe('medium risk (warnings only)', () => {
    it('warns about keystroke', () => {
      const result = analyzeScriptSafety(
        'tell application "System Events" to keystroke "hello"'
      );
      expect(result.risk).toBe('medium');
      expect(result.safe).toBe(false);
      expect(result.requiresConfirmation).toBe(false);
      expect(result.warnings.some((w) => w.includes('KEYSTROKE'))).toBe(true);
    });

    it('warns about key code', () => {
      const result = analyzeScriptSafety(
        'tell application "System Events" to key code 36'
      );
      expect(result.risk).toBe('medium');
      expect(result.warnings.some((w) => w.includes('KEY CODE'))).toBe(true);
    });

    it('warns about bulk duplicate', () => {
      const result = analyzeScriptSafety(
        'tell application "Finder" to duplicate every file'
      );
      expect(result.risk).toBe('medium');
      expect(result.warnings.some((w) => w.includes('BULK DUPLICATE'))).toBe(true);
    });

    it('warns about sending email', () => {
      const result = analyzeScriptSafety(
        'tell application "Mail" to send outgoing message'
      );
      expect(result.risk).toBe('medium');
      expect(result.warnings.some((w) => w.includes('SEND EMAIL'))).toBe(true);
    });
  });

  describe('high risk (requires confirmation)', () => {
    it('blocks delete file', () => {
      const result = analyzeScriptSafety(
        'tell application "Finder" to delete file "test.txt"'
      );
      expect(result.risk).toBe('high');
      expect(result.requiresConfirmation).toBe(true);
      expect(result.warnings.some((w) => w.includes('DELETE'))).toBe(true);
    });

    it('blocks bulk move', () => {
      const result = analyzeScriptSafety(
        'tell application "Finder" to move every file to trash'
      );
      expect(result.risk).toBe('high');
      expect(result.requiresConfirmation).toBe(true);
    });

    it('blocks system power operations', () => {
      const scripts = [
        'tell application "System Events" to shutdown',
        'tell application "System Events" to restart',
        'tell application "System Events" to sleep',
      ];

      for (const script of scripts) {
        const result = analyzeScriptSafety(script);
        expect(result.risk).toBe('high');
        expect(result.requiresConfirmation).toBe(true);
        expect(result.warnings.some((w) => w.includes('SYSTEM POWER'))).toBe(true);
      }
    });

    it('blocks shell scripts', () => {
      const result = analyzeScriptSafety('do shell script "ls -la"');
      expect(result.risk).toBe('high');
      expect(result.requiresConfirmation).toBe(true);
      expect(result.warnings.some((w) => w.includes('SHELL'))).toBe(true);
    });

    it('blocks quit all applications', () => {
      const result = analyzeScriptSafety(
        'tell application "System Events" to quit every application'
      );
      expect(result.risk).toBe('high');
      expect(result.requiresConfirmation).toBe(true);
    });
  });

  describe('critical risk (blocked unless confirmed)', () => {
    it('blocks bulk delete files', () => {
      const result = analyzeScriptSafety(
        'tell application "Finder" to delete every file'
      );
      expect(result.risk).toBe('critical');
      expect(result.requiresConfirmation).toBe(true);
      expect(result.warnings.some((w) => w.includes('BULK DELETE'))).toBe(true);
    });

    it('blocks empty trash', () => {
      const result = analyzeScriptSafety(
        'tell application "Finder" to empty trash'
      );
      expect(result.risk).toBe('critical');
      expect(result.warnings.some((w) => w.includes('EMPTY TRASH'))).toBe(true);
    });

    it('blocks empty the trash', () => {
      const result = analyzeScriptSafety(
        'tell application "Finder" to empty the trash'
      );
      expect(result.risk).toBe('critical');
    });

    it('blocks dangerous shell commands', () => {
      const result = analyzeScriptSafety('do shell script "rm -rf /tmp/test"');
      expect(result.risk).toBe('critical');
      expect(result.warnings.some((w) => w.includes('DANGEROUS SHELL'))).toBe(true);
    });

    it('blocks sudo commands', () => {
      const result = analyzeScriptSafety('do shell script "sudo rm file"');
      expect(result.risk).toBe('critical');
    });

    it('blocks bulk email send', () => {
      const result = analyzeScriptSafety(
        'tell application "Mail" to send every message'
      );
      expect(result.risk).toBe('critical');
      expect(result.warnings.some((w) => w.includes('BULK EMAIL'))).toBe(true);
    });

    it('blocks bulk calendar delete', () => {
      const result = analyzeScriptSafety(
        'tell application "Calendar" to delete every event'
      );
      expect(result.risk).toBe('critical');
    });

    it('blocks bulk reminder delete', () => {
      const result = analyzeScriptSafety(
        'tell application "Reminders" to delete all reminders'
      );
      expect(result.risk).toBe('critical');
    });

    it('blocks bulk note delete', () => {
      const result = analyzeScriptSafety(
        'tell application "Notes" to delete every note'
      );
      expect(result.risk).toBe('critical');
    });

    it('blocks bulk contact delete', () => {
      const result = analyzeScriptSafety(
        'tell application "Contacts" to delete all contacts'
      );
      expect(result.risk).toBe('critical');
    });
  });

  describe('multiple warnings', () => {
    it('accumulates warnings from multiple patterns', () => {
      const script = 'do shell script "rm -rf /"\nkeystroke "test"';
      const result = analyzeScriptSafety(script);
      expect(result.warnings.length).toBeGreaterThan(1);
      expect(result.risk).toBe('critical'); // Highest risk wins
    });
  });
});

// ============================================================
// ScriptBuilder Tests
// ============================================================

describe('ScriptBuilder', () => {
  describe('tell', () => {
    it('wraps single command in tell block', () => {
      const script = ScriptBuilder.tell('Music', 'play');
      expect(script).toContain('tell application "Music"');
      expect(script).toContain('\tplay');
      expect(script).toContain('end tell');
    });

    it('wraps multiple commands', () => {
      const script = ScriptBuilder.tell('Music', ['play', 'set volume to 50']);
      expect(script).toContain('\tplay');
      expect(script).toContain('\tset volume to 50');
    });
  });

  describe('activate', () => {
    it('generates activate command', () => {
      const script = ScriptBuilder.activate('Safari');
      expect(script).toBe('tell application "Safari" to activate');
    });
  });

  describe('dialog', () => {
    it('generates basic dialog', () => {
      const script = ScriptBuilder.dialog('Hello World');
      expect(script).toBe('display dialog "Hello World"');
    });

    it('generates dialog with title', () => {
      const script = ScriptBuilder.dialog('Hello', { title: 'Greeting' });
      expect(script).toContain('with title "Greeting"');
    });

    it('generates dialog with buttons', () => {
      const script = ScriptBuilder.dialog('Choose', { buttons: ['Yes', 'No'] });
      expect(script).toContain('buttons {"Yes", "No"}');
    });

    it('escapes special characters', () => {
      const script = ScriptBuilder.dialog('Say "Hello"\nWorld');
      expect(script).toContain('\\"Hello\\"');
      expect(script).toContain('\\n');
    });
  });

  describe('notification', () => {
    it('generates basic notification', () => {
      const script = ScriptBuilder.notification('Alert');
      expect(script).toBe('display notification "Alert"');
    });

    it('generates notification with title', () => {
      const script = ScriptBuilder.notification('Body', { title: 'Title' });
      expect(script).toContain('with title "Title"');
    });

    it('generates notification with subtitle', () => {
      const script = ScriptBuilder.notification('Body', { subtitle: 'Sub' });
      expect(script).toContain('subtitle "Sub"');
    });
  });

  describe('getFrontmostApp', () => {
    it('generates correct script', () => {
      const script = ScriptBuilder.getFrontmostApp();
      expect(script).toContain('System Events');
      expect(script).toContain('frontmost is true');
    });
  });

  describe('listRunningApps', () => {
    it('generates correct script', () => {
      const script = ScriptBuilder.listRunningApps();
      expect(script).toContain('System Events');
      expect(script).toContain('every process');
      expect(script).toContain('background only is false');
    });
  });
});
