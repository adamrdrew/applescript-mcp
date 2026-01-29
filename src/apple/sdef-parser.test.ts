/**
 * Tests for apple/sdef-parser.ts
 *
 * These tests verify SDEF XML parsing and dictionary formatting.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseSdef,
  getCachedDictionary,
  clearCache,
  formatDictionaryForLLM,
  getCacheSize,
  CACHE_TTL,
} from './sdef-parser.js';

// ============================================================
// Test Data
// ============================================================

const MINIMAL_SDEF = `<?xml version="1.0"?>
<dictionary title="Test App Dictionary">
  <suite name="Standard Suite" code="????" description="Common commands">
    <command name="open" code="aevtodoc" description="Open a document">
      <direct-parameter type="file" description="The file to open"/>
      <result type="document" description="The opened document"/>
    </command>
    <class name="application" code="capp" description="The application">
      <property name="name" code="pnam" type="text" access="r" description="The name"/>
      <property name="version" code="vers" type="text" access="r" description="The version"/>
      <element type="document"/>
      <element type="window"/>
    </class>
    <class name="document" code="docu" description="A document" plural="documents">
      <property name="name" code="pnam" type="text" description="The name"/>
      <property name="modified" code="imod" type="boolean" access="r" description="Modified?"/>
    </class>
    <enumeration name="save options" code="savo">
      <enumerator name="yes" code="yes " description="Save changes"/>
      <enumerator name="no" code="no  " description="Discard changes"/>
      <enumerator name="ask" code="ask " description="Ask the user"/>
    </enumeration>
  </suite>
</dictionary>`;

const SDEF_WITH_EXTENSION = `<?xml version="1.0"?>
<dictionary title="Extended App">
  <suite name="Extended Suite" code="exts">
    <class name="window" code="cwin" description="A window">
      <property name="name" code="pnam" type="text"/>
    </class>
    <class-extension extends="window">
      <property name="bounds" code="pbnd" type="rectangle"/>
      <element type="button"/>
    </class-extension>
  </suite>
</dictionary>`;

const SDEF_WITH_PARAMS = `<?xml version="1.0"?>
<dictionary title="Params App">
  <suite name="Commands" code="cmds">
    <command name="make" code="corecrel" description="Create a new element">
      <direct-parameter type="type class" description="Type to create" optional="yes"/>
      <parameter name="new" code="kocl" type="type class" description="The class" optional="no"/>
      <parameter name="at" code="insh" type="location" description="Location" optional="yes"/>
      <parameter name="with properties" code="prdt" type="record" description="Initial values" optional="yes"/>
      <result type="object" description="The new object"/>
    </command>
  </suite>
</dictionary>`;

// ============================================================
// parseSdef Tests
// ============================================================

describe('parseSdef', () => {
  it('parses basic sdef structure', () => {
    const dict = parseSdef(MINIMAL_SDEF, 'TestApp');

    expect(dict.application).toBe('TestApp');
    expect(dict.version).toBe('Test App Dictionary');
    expect(dict.suites).toHaveLength(1);
  });

  it('parses suite with name and description', () => {
    const dict = parseSdef(MINIMAL_SDEF, 'TestApp');
    const suite = dict.suites[0];

    expect(suite?.name).toBe('Standard Suite');
    expect(suite?.description).toBe('Common commands');
  });

  it('parses commands with direct parameter and result', () => {
    const dict = parseSdef(MINIMAL_SDEF, 'TestApp');
    const cmd = dict.suites[0]?.commands[0];

    expect(cmd?.name).toBe('open');
    expect(cmd?.description).toBe('Open a document');
    expect(cmd?.directParameter?.type).toBe('file');
    expect(cmd?.result?.type).toBe('document');
  });

  it('parses classes with properties and elements', () => {
    const dict = parseSdef(MINIMAL_SDEF, 'TestApp');
    const appClass = dict.suites[0]?.classes.find((c) => c.name === 'application');

    expect(appClass).toBeDefined();
    expect(appClass?.properties).toHaveLength(2);
    expect(appClass?.elements).toHaveLength(2);

    const nameProp = appClass?.properties.find((p) => p.name === 'name');
    expect(nameProp?.type).toBe('text');
    expect(nameProp?.access).toBe('r');
  });

  it('parses class with plural form', () => {
    const dict = parseSdef(MINIMAL_SDEF, 'TestApp');
    const docClass = dict.suites[0]?.classes.find((c) => c.name === 'document');

    expect(docClass?.plural).toBe('documents');
  });

  it('parses enumerations with values', () => {
    const dict = parseSdef(MINIMAL_SDEF, 'TestApp');
    const enumeration = dict.suites[0]?.enumerations[0];

    expect(enumeration?.name).toBe('save options');
    expect(enumeration?.values).toHaveLength(3);
    expect(enumeration?.values[0]?.name).toBe('yes');
  });

  it('handles class-extension elements', () => {
    const dict = parseSdef(SDEF_WITH_EXTENSION, 'ExtApp');
    const windowClass = dict.suites[0]?.classes.find((c) => c.name === 'window');

    expect(windowClass).toBeDefined();
    // Original property plus extension property
    expect(windowClass?.properties.some((p) => p.name === 'name')).toBe(true);
    expect(windowClass?.properties.some((p) => p.name === 'bounds')).toBe(true);
    // Extension element
    expect(windowClass?.elements.some((e) => e.type === 'button')).toBe(true);
  });

  it('parses command with multiple parameters', () => {
    const dict = parseSdef(SDEF_WITH_PARAMS, 'ParamsApp');
    const makeCmd = dict.suites[0]?.commands[0];

    expect(makeCmd?.name).toBe('make');
    expect(makeCmd?.directParameter?.optional).toBe(true);
    expect(makeCmd?.parameters).toHaveLength(3);

    const newParam = makeCmd?.parameters.find((p) => p.name === 'new');
    expect(newParam?.optional).toBe(false);

    const atParam = makeCmd?.parameters.find((p) => p.name === 'at');
    expect(atParam?.optional).toBe(true);
  });

  it('handles empty sdef gracefully', () => {
    const dict = parseSdef('<dictionary></dictionary>', 'EmptyApp');

    expect(dict.application).toBe('EmptyApp');
    expect(dict.suites).toHaveLength(0);
  });
});

// ============================================================
// getCachedDictionary Tests
// ============================================================

describe('getCachedDictionary', () => {
  beforeEach(() => {
    clearCache();
  });

  it('caches parsed dictionary', () => {
    const dict1 = getCachedDictionary('/path/app1', 'App1', MINIMAL_SDEF);
    expect(getCacheSize()).toBe(1);

    const dict2 = getCachedDictionary('/path/app1', 'App1', MINIMAL_SDEF);
    expect(getCacheSize()).toBe(1); // Still 1, cached

    expect(dict1).toBe(dict2); // Same reference
  });

  it('caches by path, not app name', () => {
    getCachedDictionary('/path/app1', 'App1', MINIMAL_SDEF);
    getCachedDictionary('/path/app2', 'App2', MINIMAL_SDEF);

    expect(getCacheSize()).toBe(2);
  });

  it('returns fresh parse for different paths', () => {
    const dict1 = getCachedDictionary('/path/app1', 'App1', MINIMAL_SDEF);
    const dict2 = getCachedDictionary('/path/app2', 'App2', MINIMAL_SDEF);

    expect(dict1.application).toBe('App1');
    expect(dict2.application).toBe('App2');
  });
});

// ============================================================
// clearCache Tests
// ============================================================

describe('clearCache', () => {
  it('clears all cached dictionaries', () => {
    getCachedDictionary('/path/app1', 'App1', MINIMAL_SDEF);
    getCachedDictionary('/path/app2', 'App2', MINIMAL_SDEF);

    expect(getCacheSize()).toBe(2);

    clearCache();

    expect(getCacheSize()).toBe(0);
  });
});

// ============================================================
// formatDictionaryForLLM Tests
// ============================================================

describe('formatDictionaryForLLM', () => {
  it('includes application name in header', () => {
    const dict = parseSdef(MINIMAL_SDEF, 'TestApp');
    const formatted = formatDictionaryForLLM(dict);

    expect(formatted).toContain('# TestApp AppleScript Dictionary');
  });

  it('includes quick start examples', () => {
    const dict = parseSdef(MINIMAL_SDEF, 'TestApp');
    const formatted = formatDictionaryForLLM(dict);

    expect(formatted).toContain('## Quick Start Examples');
    expect(formatted).toContain('tell application "TestApp"');
  });

  it('includes key commands section', () => {
    const dict = parseSdef(MINIMAL_SDEF, 'TestApp');
    const formatted = formatDictionaryForLLM(dict);

    expect(formatted).toContain('## Key Commands');
    expect(formatted).toContain('### open');
  });

  it('includes command syntax', () => {
    const dict = parseSdef(MINIMAL_SDEF, 'TestApp');
    const formatted = formatDictionaryForLLM(dict);

    expect(formatted).toContain('**Syntax:**');
    expect(formatted).toContain('open');
  });

  it('includes key classes section', () => {
    const dict = parseSdef(MINIMAL_SDEF, 'TestApp');
    const formatted = formatDictionaryForLLM(dict);

    expect(formatted).toContain('## Key Classes');
  });

  it('includes property tables', () => {
    const dict = parseSdef(MINIMAL_SDEF, 'TestApp');
    const formatted = formatDictionaryForLLM(dict);

    expect(formatted).toContain('| Property | Type | Access | Description |');
  });

  it('includes complete reference section', () => {
    const dict = parseSdef(MINIMAL_SDEF, 'TestApp');
    const formatted = formatDictionaryForLLM(dict);

    expect(formatted).toContain('## Complete Reference');
    expect(formatted).toContain('### Suite: Standard Suite');
  });

  it('includes tips section', () => {
    const dict = parseSdef(MINIMAL_SDEF, 'TestApp');
    const formatted = formatDictionaryForLLM(dict);

    expect(formatted).toContain('## Tips for Using This Dictionary');
    expect(formatted).toContain('Tell blocks');
  });

  it('handles empty dictionary', () => {
    const dict = parseSdef('<dictionary></dictionary>', 'EmptyApp');
    const formatted = formatDictionaryForLLM(dict);

    expect(formatted).toContain('# EmptyApp AppleScript Dictionary');
    expect(formatted).toContain('## Quick Start Examples');
  });
});

// ============================================================
// CACHE_TTL constant Tests
// ============================================================

describe('CACHE_TTL', () => {
  it('is 1 hour in milliseconds', () => {
    expect(CACHE_TTL).toBe(3600000);
  });
});
