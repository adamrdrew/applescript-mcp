/**
 * Standard response format for all tool operations
 */
export interface ToolResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Response for list_scriptable_apps tool
 */
export interface ListAppsResponse {
  apps: string[];
}

/**
 * Response for execute_applescript tool
 */
export interface ExecuteResponse {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Parameters for execute_applescript tool
 */
export interface ExecuteParams {
  script: string;
  timeout?: number;
}

/**
 * Parameters for get_app_dictionary tool
 */
export interface GetDictionaryParams {
  app: string;
}

/**
 * AppleScript dictionary property definition
 */
export interface DictionaryProperty {
  name: string;
  code?: string | undefined;
  type: string;
  access: 'r' | 'w' | 'rw';
  description?: string | undefined;
}

/**
 * AppleScript dictionary element (contained objects)
 */
export interface DictionaryElement {
  type: string;
  description?: string | undefined;
  access?: string | undefined;
}

/**
 * AppleScript dictionary class definition
 */
export interface DictionaryClass {
  name: string;
  code?: string | undefined;
  description?: string | undefined;
  plural?: string | undefined;
  inherits?: string | undefined;
  properties: DictionaryProperty[];
  elements: DictionaryElement[];
  respondsTo?: string[] | undefined;
}

/**
 * AppleScript command parameter
 */
export interface CommandParameter {
  name: string;
  code?: string | undefined;
  type: string;
  description?: string | undefined;
  optional: boolean;
}

/**
 * AppleScript dictionary command definition
 */
export interface DictionaryCommand {
  name: string;
  code?: string | undefined;
  description?: string | undefined;
  directParameter?: {
    type: string;
    description?: string | undefined;
    optional: boolean;
  };
  parameters: CommandParameter[];
  result?: {
    type: string;
    description?: string | undefined;
  };
}

/**
 * AppleScript enumeration value
 */
export interface EnumerationValue {
  name: string;
  code?: string | undefined;
  description?: string | undefined;
}

/**
 * AppleScript dictionary enumeration
 */
export interface DictionaryEnumeration {
  name: string;
  code?: string | undefined;
  description?: string | undefined;
  values: EnumerationValue[];
}

/**
 * AppleScript dictionary suite
 */
export interface DictionarySuite {
  name: string;
  code?: string | undefined;
  description?: string | undefined;
  classes: DictionaryClass[];
  commands: DictionaryCommand[];
  enumerations: DictionaryEnumeration[];
}

/**
 * Complete AppleScript dictionary for an application
 */
export interface AppleScriptDictionary {
  application: string;
  suites: DictionarySuite[];
  version?: string | undefined;
}

/**
 * Cache entry for dictionaries
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  appPath: string;
}

/**
 * Type guard for ExecuteParams
 */
export function isExecuteParams(value: unknown): value is ExecuteParams {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  if (typeof obj['script'] !== 'string') {
    return false;
  }
  if (obj['timeout'] !== undefined && typeof obj['timeout'] !== 'number') {
    return false;
  }
  return true;
}

/**
 * Type guard for GetDictionaryParams
 */
export function isGetDictionaryParams(value: unknown): value is GetDictionaryParams {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return typeof obj['app'] === 'string';
}
