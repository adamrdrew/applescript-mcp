import type {
  AppleScriptDictionary,
  DictionaryClass,
  DictionaryCommand,
  DictionaryElement,
  DictionaryEnumeration,
  DictionaryProperty,
  DictionarySuite,
  CommandParameter,
  EnumerationValue,
  CacheEntry,
} from '../types.js';

/**
 * Simple XML parser for sdef files
 * Uses regex-based parsing since we're dealing with well-formed sdef XML
 */

export const CACHE_TTL = 3600000; // 1 hour
const dictionaryCache = new Map<string, CacheEntry<AppleScriptDictionary>>();

/**
 * Get the current cache size (for testing)
 */
export function getCacheSize(): number {
  return dictionaryCache.size;
}

/**
 * Parse an sdef XML string into a structured dictionary
 */
export function parseSdef(xml: string, appName: string): AppleScriptDictionary {
  const dictionary: AppleScriptDictionary = {
    application: appName,
    suites: [],
  };

  // Extract version if available
  const versionMatch = xml.match(/<dictionary[^>]*\stitle="([^"]+)"/);
  if (versionMatch?.[1]) {
    dictionary.version = versionMatch[1];
  }

  // Parse suites
  const suiteRegex = /<suite\s+([^>]*)>([\s\S]*?)<\/suite>/g;
  let suiteMatch;
  while ((suiteMatch = suiteRegex.exec(xml)) !== null) {
    const suiteAttrs = suiteMatch[1] ?? '';
    const suiteContent = suiteMatch[2] ?? '';
    const suite = parseSuite(suiteAttrs, suiteContent);
    dictionary.suites.push(suite);
  }

  return dictionary;
}

/**
 * Parse a suite element
 */
function parseSuite(attrs: string, content: string): DictionarySuite {
  const suite: DictionarySuite = {
    name: extractAttr(attrs, 'name') ?? 'Unknown Suite',
    code: extractAttr(attrs, 'code'),
    description: extractAttr(attrs, 'description'),
    classes: [],
    commands: [],
    enumerations: [],
  };

  // Parse classes
  const classRegex = /<class\s+([^>]*)(?:\/>|>([\s\S]*?)<\/class>)/g;
  let classMatch;
  while ((classMatch = classRegex.exec(content)) !== null) {
    const classAttrs = classMatch[1] ?? '';
    const classContent = classMatch[2] ?? '';
    const cls = parseClass(classAttrs, classContent);
    suite.classes.push(cls);
  }

  // Parse class-extension elements (extend existing classes)
  const extensionRegex = /<class-extension\s+([^>]*)(?:\/>|>([\s\S]*?)<\/class-extension>)/g;
  let extensionMatch;
  while ((extensionMatch = extensionRegex.exec(content)) !== null) {
    const extAttrs = extensionMatch[1] ?? '';
    const extContent = extensionMatch[2] ?? '';
    const extends_ = extractAttr(extAttrs, 'extends');

    // Find existing class or create placeholder
    let existingClass = suite.classes.find((c) => c.name === extends_);
    if (!existingClass && extends_) {
      existingClass = {
        name: extends_,
        properties: [],
        elements: [],
      };
      suite.classes.push(existingClass);
    }

    if (existingClass && extContent) {
      // Merge properties and elements from extension
      const extProperties = parseProperties(extContent);
      const extElements = parseElements(extContent);
      existingClass.properties.push(...extProperties);
      existingClass.elements.push(...extElements);
    }
  }

  // Parse commands
  const commandRegex = /<command\s+([^>]*)(?:\/>|>([\s\S]*?)<\/command>)/g;
  let commandMatch;
  while ((commandMatch = commandRegex.exec(content)) !== null) {
    const cmdAttrs = commandMatch[1] ?? '';
    const cmdContent = commandMatch[2] ?? '';
    const cmd = parseCommand(cmdAttrs, cmdContent);
    suite.commands.push(cmd);
  }

  // Parse enumerations
  const enumRegex = /<enumeration\s+([^>]*)(?:\/>|>([\s\S]*?)<\/enumeration>)/g;
  let enumMatch;
  while ((enumMatch = enumRegex.exec(content)) !== null) {
    const enumAttrs = enumMatch[1] ?? '';
    const enumContent = enumMatch[2] ?? '';
    const enumeration = parseEnumeration(enumAttrs, enumContent);
    suite.enumerations.push(enumeration);
  }

  return suite;
}

/**
 * Parse a class element
 */
function parseClass(attrs: string, content: string): DictionaryClass {
  const cls: DictionaryClass = {
    name: extractAttr(attrs, 'name') ?? 'Unknown Class',
    code: extractAttr(attrs, 'code'),
    description: extractAttr(attrs, 'description'),
    plural: extractAttr(attrs, 'plural'),
    inherits: extractAttr(attrs, 'inherits'),
    properties: [],
    elements: [],
  };

  if (content) {
    cls.properties = parseProperties(content);
    cls.elements = parseElements(content);
    cls.respondsTo = parseRespondsTo(content);
  }

  return cls;
}

/**
 * Parse properties from class content
 */
function parseProperties(content: string): DictionaryProperty[] {
  const properties: DictionaryProperty[] = [];
  const propRegex = /<property\s+([^>]*)\/?>/g;
  let propMatch;

  while ((propMatch = propRegex.exec(content)) !== null) {
    const propAttrs = propMatch[1] ?? '';
    const prop: DictionaryProperty = {
      name: extractAttr(propAttrs, 'name') ?? 'unknown',
      code: extractAttr(propAttrs, 'code'),
      type: extractAttr(propAttrs, 'type') ?? 'any',
      access: parseAccess(extractAttr(propAttrs, 'access')),
      description: extractAttr(propAttrs, 'description'),
    };
    properties.push(prop);
  }

  return properties;
}

/**
 * Parse elements from class content
 */
function parseElements(content: string): DictionaryElement[] {
  const elements: DictionaryElement[] = [];
  const elemRegex = /<element\s+([^>]*)\/?>/g;
  let elemMatch;

  while ((elemMatch = elemRegex.exec(content)) !== null) {
    const elemAttrs = elemMatch[1] ?? '';
    const elem: DictionaryElement = {
      type: extractAttr(elemAttrs, 'type') ?? 'unknown',
      description: extractAttr(elemAttrs, 'description'),
      access: extractAttr(elemAttrs, 'access'),
    };
    elements.push(elem);
  }

  return elements;
}

/**
 * Parse responds-to references from class content
 */
function parseRespondsTo(content: string): string[] | undefined {
  const respondsTo: string[] = [];
  const rtRegex = /<responds-to\s+([^>]*)\/?>/g;
  let rtMatch;

  while ((rtMatch = rtRegex.exec(content)) !== null) {
    const rtAttrs = rtMatch[1] ?? '';
    const command = extractAttr(rtAttrs, 'command');
    if (command) {
      respondsTo.push(command);
    }
  }

  return respondsTo.length > 0 ? respondsTo : undefined;
}

/**
 * Parse a command element
 */
function parseCommand(attrs: string, content: string): DictionaryCommand {
  const cmd: DictionaryCommand = {
    name: extractAttr(attrs, 'name') ?? 'Unknown Command',
    code: extractAttr(attrs, 'code'),
    description: extractAttr(attrs, 'description'),
    parameters: [],
  };

  if (content) {
    // Parse direct parameter
    const directMatch = content.match(/<direct-parameter\s+([^>]*)\/?>/);
    if (directMatch?.[1]) {
      const dpAttrs = directMatch[1];
      cmd.directParameter = {
        type: extractAttr(dpAttrs, 'type') ?? 'any',
        description: extractAttr(dpAttrs, 'description'),
        optional: extractAttr(dpAttrs, 'optional') === 'yes',
      };
    }

    // Parse named parameters
    const paramRegex = /<parameter\s+([^>]*)\/?>/g;
    let paramMatch;
    while ((paramMatch = paramRegex.exec(content)) !== null) {
      const paramAttrs = paramMatch[1] ?? '';
      const param: CommandParameter = {
        name: extractAttr(paramAttrs, 'name') ?? 'unknown',
        code: extractAttr(paramAttrs, 'code'),
        type: extractAttr(paramAttrs, 'type') ?? 'any',
        description: extractAttr(paramAttrs, 'description'),
        optional: extractAttr(paramAttrs, 'optional') === 'yes',
      };
      cmd.parameters.push(param);
    }

    // Parse result
    const resultMatch = content.match(/<result\s+([^>]*)\/?>/);
    if (resultMatch?.[1]) {
      const resAttrs = resultMatch[1];
      cmd.result = {
        type: extractAttr(resAttrs, 'type') ?? 'any',
        description: extractAttr(resAttrs, 'description'),
      };
    }
  }

  return cmd;
}

/**
 * Parse an enumeration element
 */
function parseEnumeration(attrs: string, content: string): DictionaryEnumeration {
  const enumeration: DictionaryEnumeration = {
    name: extractAttr(attrs, 'name') ?? 'Unknown Enumeration',
    code: extractAttr(attrs, 'code'),
    description: extractAttr(attrs, 'description'),
    values: [],
  };

  if (content) {
    const enumValueRegex = /<enumerator\s+([^>]*)\/?>/g;
    let valueMatch;
    while ((valueMatch = enumValueRegex.exec(content)) !== null) {
      const valueAttrs = valueMatch[1] ?? '';
      const value: EnumerationValue = {
        name: extractAttr(valueAttrs, 'name') ?? 'unknown',
        code: extractAttr(valueAttrs, 'code'),
        description: extractAttr(valueAttrs, 'description'),
      };
      enumeration.values.push(value);
    }
  }

  return enumeration;
}

/**
 * Extract an attribute value from an attribute string
 */
function extractAttr(attrs: string, name: string): string | undefined {
  const regex = new RegExp(`${name}="([^"]*)"`, 'i');
  const match = attrs.match(regex);
  if (match?.[1]) {
    return decodeXmlEntities(match[1]);
  }
  return undefined;
}

/**
 * Decode XML entities
 */
function decodeXmlEntities(str: string): string {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

/**
 * Parse access attribute
 */
function parseAccess(access: string | undefined): 'r' | 'w' | 'rw' {
  if (!access) return 'rw';
  if (access === 'r') return 'r';
  if (access === 'w') return 'w';
  return 'rw';
}

/**
 * Get a cached dictionary or parse fresh
 */
export function getCachedDictionary(
  appPath: string,
  appName: string,
  sdefXml: string
): AppleScriptDictionary {
  const cached = dictionaryCache.get(appPath);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const dictionary = parseSdef(sdefXml, appName);

  dictionaryCache.set(appPath, {
    data: dictionary,
    timestamp: Date.now(),
    appPath,
  });

  return dictionary;
}

/**
 * Clear the dictionary cache
 */
export function clearCache(): void {
  dictionaryCache.clear();
}

/**
 * Generate example AppleScript code for a command
 */
function generateCommandExample(appName: string, cmd: DictionaryCommand): string {
  let example = `tell application "${appName}"\n`;

  // Build the command call
  let cmdCall = `  ${cmd.name}`;

  // Add direct parameter if present
  if (cmd.directParameter) {
    const placeholder = getPlaceholder(cmd.directParameter.type);
    cmdCall += ` ${placeholder}`;
  }

  // Add required parameters
  const requiredParams = cmd.parameters.filter((p) => !p.optional);
  for (const param of requiredParams) {
    const placeholder = getPlaceholder(param.type);
    cmdCall += ` ${param.name} ${placeholder}`;
  }

  example += cmdCall + '\n';
  example += 'end tell';

  return example;
}

/**
 * Get a placeholder value for a type
 */
function getPlaceholder(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('text') || t.includes('string')) return '"your text here"';
  if (t.includes('integer') || t.includes('number') || t.includes('real')) return '1';
  if (t.includes('boolean')) return 'true';
  if (t.includes('file')) return 'file "path/to/file"';
  if (t.includes('folder')) return 'folder "path/to/folder"';
  if (t.includes('list')) return '{item1, item2}';
  if (t.includes('record')) return '{key:value}';
  if (t.includes('date')) return 'current date';
  if (t.includes('specifier') || t.includes('reference')) return 'someObject';
  return `<${type}>`;
}

/**
 * Generate example for accessing a class property
 */
function generatePropertyExample(appName: string, className: string, prop: DictionaryProperty): string {
  const access = prop.access === 'r' ? 'get' : prop.access === 'w' ? 'set' : 'get/set';
  if (access === 'set' || access === 'get/set') {
    return `tell application "${appName}" to set ${prop.name} of ${className} 1 to ${getPlaceholder(prop.type)}`;
  }
  return `tell application "${appName}" to get ${prop.name} of ${className} 1`;
}

/**
 * Format dictionary as a comprehensive, LLM-friendly guide
 */
export function formatDictionaryForLLM(dict: AppleScriptDictionary): string {
  const lines: string[] = [];
  const appName = dict.application;

  // Header
  lines.push(`# ${appName} AppleScript Dictionary`);
  lines.push('');
  lines.push('This dictionary describes all AppleScript commands, classes, and properties available for automating this application.');
  lines.push('');

  // Quick reference
  lines.push('## Quick Start Examples');
  lines.push('');
  lines.push('```applescript');
  lines.push(`-- Basic tell block structure`);
  lines.push(`tell application "${appName}"`);
  lines.push('  -- your commands here');
  lines.push('end tell');
  lines.push('');
  lines.push('-- One-liner syntax');
  lines.push(`tell application "${appName}" to activate`);
  lines.push('```');
  lines.push('');

  // Collect key commands for quick reference
  const keyCommands: DictionaryCommand[] = [];
  const keyClasses: DictionaryClass[] = [];

  for (const suite of dict.suites) {
    keyCommands.push(...suite.commands.slice(0, 5));
    keyClasses.push(...suite.classes.filter((c) => c.properties.length > 0).slice(0, 3));
  }

  if (keyCommands.length > 0) {
    lines.push('## Key Commands');
    lines.push('');
    for (const cmd of keyCommands.slice(0, 8)) {
      lines.push(`### ${cmd.name}`);
      if (cmd.description) {
        lines.push(cmd.description);
      }
      lines.push('');

      // Syntax
      let syntax = cmd.name;
      if (cmd.directParameter) {
        const opt = cmd.directParameter.optional ? '?' : '';
        syntax += ` <${cmd.directParameter.type}>${opt}`;
      }
      for (const param of cmd.parameters) {
        const opt = param.optional ? '?' : '';
        syntax += ` [${param.name}${opt}: ${param.type}]`;
      }
      if (cmd.result) {
        syntax += ` → ${cmd.result.type}`;
      }
      lines.push(`**Syntax:** \`${syntax}\``);
      lines.push('');

      // Parameters detail
      if (cmd.directParameter || cmd.parameters.length > 0) {
        lines.push('**Parameters:**');
        if (cmd.directParameter) {
          const req = cmd.directParameter.optional ? 'optional' : 'required';
          lines.push(`- Direct object (${cmd.directParameter.type}, ${req}): ${cmd.directParameter.description ?? 'The object to act on'}`);
        }
        for (const param of cmd.parameters) {
          const req = param.optional ? 'optional' : 'required';
          lines.push(`- \`${param.name}\` (${param.type}, ${req}): ${param.description ?? 'No description'}`);
        }
        lines.push('');
      }

      // Example
      lines.push('**Example:**');
      lines.push('```applescript');
      lines.push(generateCommandExample(appName, cmd));
      lines.push('```');
      lines.push('');
    }
  }

  if (keyClasses.length > 0) {
    lines.push('## Key Classes');
    lines.push('');
    for (const cls of keyClasses.slice(0, 5)) {
      lines.push(`### ${cls.name}`);
      if (cls.description) {
        lines.push(cls.description);
      }
      if (cls.inherits) {
        lines.push(`*Inherits from: ${cls.inherits}*`);
      }
      if (cls.plural) {
        lines.push(`*Plural form: ${cls.plural}*`);
      }
      lines.push('');

      // Properties
      if (cls.properties.length > 0) {
        lines.push('**Properties:**');
        lines.push('| Property | Type | Access | Description |');
        lines.push('|----------|------|--------|-------------|');
        for (const prop of cls.properties.slice(0, 15)) {
          const accessLabel = prop.access === 'r' ? 'read-only' : prop.access === 'w' ? 'write-only' : 'read/write';
          const desc = prop.description?.slice(0, 50) ?? '-';
          lines.push(`| ${prop.name} | ${prop.type} | ${accessLabel} | ${desc} |`);
        }
        if (cls.properties.length > 15) {
          lines.push(`| ... | | | (${cls.properties.length - 15} more properties) |`);
        }
        lines.push('');
      }

      // Elements (contained objects)
      if (cls.elements.length > 0) {
        lines.push('**Contains:**');
        for (const elem of cls.elements) {
          lines.push(`- ${elem.type}s`);
        }
        lines.push('');
      }

      // Example
      if (cls.properties.length > 0 && cls.properties[0]) {
        lines.push('**Example:**');
        lines.push('```applescript');
        lines.push(`-- Get all ${cls.plural ?? cls.name + 's'}`);
        lines.push(`tell application "${appName}" to get every ${cls.name}`);
        lines.push('');
        lines.push(`-- Get a property`);
        lines.push(generatePropertyExample(appName, cls.name, cls.properties[0]));
        lines.push('```');
        lines.push('');
      }
    }
  }

  // Full reference section
  lines.push('---');
  lines.push('');
  lines.push('## Complete Reference');
  lines.push('');

  for (const suite of dict.suites) {
    lines.push(`### Suite: ${suite.name}`);
    if (suite.description) {
      lines.push(`*${suite.description}*`);
    }
    lines.push('');

    if (suite.commands.length > 0) {
      lines.push('#### Commands');
      lines.push('');
      for (const cmd of suite.commands) {
        let cmdLine = `- **${cmd.name}**`;
        if (cmd.directParameter) {
          cmdLine += ` <${cmd.directParameter.type}>`;
        }
        if (cmd.result) {
          cmdLine += ` → ${cmd.result.type}`;
        }
        lines.push(cmdLine);
        if (cmd.description) {
          lines.push(`  *${cmd.description}*`);
        }
        for (const param of cmd.parameters) {
          const opt = param.optional ? ' (optional)' : '';
          lines.push(`  - ${param.name}: ${param.type}${opt}`);
        }
      }
      lines.push('');
    }

    if (suite.classes.length > 0) {
      lines.push('#### Classes');
      lines.push('');
      for (const cls of suite.classes) {
        let clsLine = `- **${cls.name}**`;
        if (cls.inherits) {
          clsLine += ` (inherits: ${cls.inherits})`;
        }
        lines.push(clsLine);
        if (cls.description) {
          lines.push(`  *${cls.description}*`);
        }
        for (const prop of cls.properties.slice(0, 8)) {
          const access = prop.access === 'r' ? ' [r]' : prop.access === 'w' ? ' [w]' : '';
          lines.push(`  - ${prop.name}: ${prop.type}${access}`);
        }
        if (cls.properties.length > 8) {
          lines.push(`  - *(${cls.properties.length - 8} more properties)*`);
        }
        if (cls.elements.length > 0) {
          lines.push(`  - **contains:** ${cls.elements.map((e) => e.type).join(', ')}`);
        }
      }
      lines.push('');
    }

    if (suite.enumerations.length > 0) {
      lines.push('#### Enumerations');
      lines.push('');
      for (const enumeration of suite.enumerations) {
        lines.push(`- **${enumeration.name}**`);
        if (enumeration.description) {
          lines.push(`  *${enumeration.description}*`);
        }
        lines.push(`  Values: ${enumeration.values.map((v) => `\`${v.name}\``).join(', ')}`);
      }
      lines.push('');
    }
  }

  // Tips section
  lines.push('---');
  lines.push('');
  lines.push('## Tips for Using This Dictionary');
  lines.push('');
  lines.push('1. **Tell blocks**: Wrap commands in `tell application "' + appName + '"` ... `end tell`');
  lines.push('2. **Plurals**: Use plural forms to get collections (e.g., `every window`, `all documents`)');
  lines.push('3. **Specifiers**: Reference objects by index (`window 1`), name (`window "Main"`), or property');
  lines.push('4. **Chaining**: Access nested objects with `of` (e.g., `name of document 1 of application "' + appName + '"`)');
  lines.push('5. **Read-only [r]**: Properties marked [r] cannot be set, only read');
  lines.push('');

  return lines.join('\n');
}
