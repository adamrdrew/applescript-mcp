import type { AppleScriptDictionary, ToolResponse } from '../types.js';
import { findAppPath, getSdef } from '../apple/executor.js';
import { getCachedDictionary, formatDictionaryForLLM } from '../apple/sdef-parser.js';

export interface DictionaryResult {
  dictionary: AppleScriptDictionary;
  summary: string;
}

/**
 * Get the AppleScript dictionary for an application
 */
export async function getAppDictionary(
  appName: string
): Promise<ToolResponse<DictionaryResult>> {
  try {
    // Find the application path
    const appPath = await findAppPath(appName);

    if (!appPath) {
      return {
        success: false,
        error: `Application "${appName}" not found. Make sure the application is installed and the name is spelled correctly.`,
      };
    }

    // Get the sdef XML
    const sdefResult = await getSdef(appPath);

    if (!sdefResult.success || !sdefResult.data) {
      // Try some common variations
      const variations = [
        appName,
        `${appName}.app`,
        appName.replace(/\s+/g, ''),
        appName.replace(/\s+/g, '-'),
      ];

      for (const variation of variations) {
        const altPath = await findAppPath(variation);
        if (altPath && altPath !== appPath) {
          const altSdef = await getSdef(altPath);
          if (altSdef.success && altSdef.data) {
            const dictionary = getCachedDictionary(altPath, appName, altSdef.data);
            const summary = formatDictionaryForLLM(dictionary);

            return {
              success: true,
              data: {
                dictionary,
                summary,
              },
            };
          }
        }
      }

      return {
        success: false,
        error: `Application "${appName}" does not appear to have an AppleScript dictionary. This application may not support AppleScript automation.`,
      };
    }

    // Parse the sdef XML
    const dictionary = getCachedDictionary(appPath, appName, sdefResult.data);
    const summary = formatDictionaryForLLM(dictionary);

    return {
      success: true,
      data: {
        dictionary,
        summary,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get application dictionary',
    };
  }
}

/**
 * Search for a specific command or class in an application's dictionary
 */
export async function searchDictionary(
  appName: string,
  searchTerm: string
): Promise<ToolResponse<{ matches: SearchMatch[] }>> {
  const dictResult = await getAppDictionary(appName);

  if (!dictResult.success || !dictResult.data) {
    return {
      success: false,
      error: dictResult.error ?? 'Failed to get dictionary',
    };
  }

  const { dictionary } = dictResult.data;
  const matches: SearchMatch[] = [];
  const term = searchTerm.toLowerCase();

  for (const suite of dictionary.suites) {
    // Search commands
    for (const cmd of suite.commands) {
      if (
        cmd.name.toLowerCase().includes(term) ||
        cmd.description?.toLowerCase().includes(term)
      ) {
        matches.push({
          type: 'command',
          suite: suite.name,
          name: cmd.name,
          description: cmd.description,
        });
      }
    }

    // Search classes
    for (const cls of suite.classes) {
      if (
        cls.name.toLowerCase().includes(term) ||
        cls.description?.toLowerCase().includes(term)
      ) {
        matches.push({
          type: 'class',
          suite: suite.name,
          name: cls.name,
          description: cls.description,
        });
      }

      // Search properties
      for (const prop of cls.properties) {
        if (
          prop.name.toLowerCase().includes(term) ||
          prop.description?.toLowerCase().includes(term)
        ) {
          matches.push({
            type: 'property',
            suite: suite.name,
            name: `${cls.name}.${prop.name}`,
            description: prop.description,
          });
        }
      }
    }

    // Search enumerations
    for (const enumeration of suite.enumerations) {
      if (
        enumeration.name.toLowerCase().includes(term) ||
        enumeration.values.some((v) => v.name.toLowerCase().includes(term))
      ) {
        matches.push({
          type: 'enumeration',
          suite: suite.name,
          name: enumeration.name,
          description: enumeration.description,
        });
      }
    }
  }

  return {
    success: true,
    data: { matches },
  };
}

interface SearchMatch {
  type: 'command' | 'class' | 'property' | 'enumeration';
  suite: string;
  name: string;
  description?: string | undefined;
}

/**
 * Get a specific class from an application's dictionary
 */
export async function getClass(
  appName: string,
  className: string
): Promise<ToolResponse<{ class: AppleScriptDictionary['suites'][number]['classes'][number] | null; suite: string | null }>> {
  const dictResult = await getAppDictionary(appName);

  if (!dictResult.success || !dictResult.data) {
    return {
      success: false,
      error: dictResult.error ?? 'Failed to get dictionary',
    };
  }

  const { dictionary } = dictResult.data;

  for (const suite of dictionary.suites) {
    const cls = suite.classes.find(
      (c) => c.name.toLowerCase() === className.toLowerCase()
    );
    if (cls) {
      return {
        success: true,
        data: {
          class: cls,
          suite: suite.name,
        },
      };
    }
  }

  return {
    success: true,
    data: {
      class: null,
      suite: null,
    },
  };
}

/**
 * Get a specific command from an application's dictionary
 */
export async function getCommand(
  appName: string,
  commandName: string
): Promise<ToolResponse<{ command: AppleScriptDictionary['suites'][number]['commands'][number] | null; suite: string | null }>> {
  const dictResult = await getAppDictionary(appName);

  if (!dictResult.success || !dictResult.data) {
    return {
      success: false,
      error: dictResult.error ?? 'Failed to get dictionary',
    };
  }

  const { dictionary } = dictResult.data;

  for (const suite of dictionary.suites) {
    const cmd = suite.commands.find(
      (c) => c.name.toLowerCase() === commandName.toLowerCase()
    );
    if (cmd) {
      return {
        success: true,
        data: {
          command: cmd,
          suite: suite.name,
        },
      };
    }
  }

  return {
    success: true,
    data: {
      command: null,
      suite: null,
    },
  };
}
