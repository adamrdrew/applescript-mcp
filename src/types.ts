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

// ============================================================
// Additional Tool Parameter Types and Guards
// ============================================================

/**
 * Extended parameters for execute_applescript tool (includes intent and confirmedDangerous)
 */
export interface ExtendedExecuteParams {
  script: string;
  intent?: string;
  timeout?: number;
  confirmedDangerous?: boolean;
}

/**
 * Type guard for ExtendedExecuteParams
 */
export function isExtendedExecuteParams(value: unknown): value is ExtendedExecuteParams {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  if (typeof obj['script'] !== 'string') {
    return false;
  }
  if (obj['intent'] !== undefined && typeof obj['intent'] !== 'string') {
    return false;
  }
  if (obj['timeout'] !== undefined && typeof obj['timeout'] !== 'number') {
    return false;
  }
  if (obj['confirmedDangerous'] !== undefined && typeof obj['confirmedDangerous'] !== 'boolean') {
    return false;
  }
  return true;
}

/**
 * Parameters for validate_applescript tool
 */
export interface ValidateScriptParams {
  script: string;
}

/**
 * Type guard for ValidateScriptParams
 */
export function isValidateScriptParams(value: unknown): value is ValidateScriptParams {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return typeof obj['script'] === 'string';
}

/**
 * Parameters for get_workflow_pattern tool
 */
export interface WorkflowPatternParams {
  intent: string;
  app?: string;
  action?: string;
}

/**
 * Type guard for WorkflowPatternParams
 */
export function isWorkflowPatternParams(value: unknown): value is WorkflowPatternParams {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  if (typeof obj['intent'] !== 'string') {
    return false;
  }
  if (obj['app'] !== undefined && typeof obj['app'] !== 'string') {
    return false;
  }
  if (obj['action'] !== undefined && typeof obj['action'] !== 'string') {
    return false;
  }
  return true;
}

/**
 * Parameters for analyze_failure tool
 */
export interface AnalyzeFailureParams {
  script: string;
  error: string;
}

/**
 * Type guard for AnalyzeFailureParams
 */
export function isAnalyzeFailureParams(value: unknown): value is AnalyzeFailureParams {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return typeof obj['script'] === 'string' && typeof obj['error'] === 'string';
}

/**
 * Parameters for get_app_skill tool
 */
export interface AppSkillParams {
  app: string;
}

/**
 * Type guard for AppSkillParams
 */
export function isAppSkillParams(value: unknown): value is AppSkillParams {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return typeof obj['app'] === 'string';
}

/**
 * Parameters for get_smart_suggestion tool
 */
export interface SmartSuggestionParams {
  app: string;
  intent: string;
}

/**
 * Type guard for SmartSuggestionParams
 */
export function isSmartSuggestionParams(value: unknown): value is SmartSuggestionParams {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return typeof obj['app'] === 'string' && typeof obj['intent'] === 'string';
}

/**
 * Parameters for discover_capabilities tool
 */
export interface DiscoverCapabilitiesParams {
  app?: string;
}

/**
 * Type guard for DiscoverCapabilitiesParams
 */
export function isDiscoverCapabilitiesParams(value: unknown): value is DiscoverCapabilitiesParams {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  if (obj['app'] !== undefined && typeof obj['app'] !== 'string') {
    return false;
  }
  return true;
}
