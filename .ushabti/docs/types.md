# Type System Reference

## Overview

All TypeScript interfaces and type definitions are in `src/types.ts`. This document covers the core types used throughout the codebase.

## Response Types

### ToolResponse<T>

Standard wrapper for all tool operation results.

```typescript
interface ToolResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
```

All tools return `ToolResponse<SomeData>`. Check `success` before accessing `data`.

### ListAppsResponse

```typescript
interface ListAppsResponse {
  apps: string[];
}
```

### ExecuteResponse

```typescript
interface ExecuteResponse {
  stdout: string;
  stderr: string;
  exitCode: number;
}
```

## Parameter Types

### ExecuteParams

```typescript
interface ExecuteParams {
  script: string;
  timeout?: number;
}
```

### GetDictionaryParams

```typescript
interface GetDictionaryParams {
  app: string;
}
```

## Dictionary Types

These types represent parsed AppleScript dictionaries (SDEF).

### AppleScriptDictionary

```typescript
interface AppleScriptDictionary {
  application: string;
  suites: DictionarySuite[];
  version?: string | undefined;
}
```

### DictionarySuite

```typescript
interface DictionarySuite {
  name: string;
  code?: string | undefined;
  description?: string | undefined;
  classes: DictionaryClass[];
  commands: DictionaryCommand[];
  enumerations: DictionaryEnumeration[];
}
```

### DictionaryClass

```typescript
interface DictionaryClass {
  name: string;
  code?: string | undefined;
  description?: string | undefined;
  plural?: string | undefined;
  inherits?: string | undefined;
  properties: DictionaryProperty[];
  elements: DictionaryElement[];
  respondsTo?: string[] | undefined;
}
```

### DictionaryProperty

```typescript
interface DictionaryProperty {
  name: string;
  code?: string | undefined;
  type: string;
  access: 'r' | 'w' | 'rw';
  description?: string | undefined;
}
```

### DictionaryElement

```typescript
interface DictionaryElement {
  type: string;
  description?: string | undefined;
  access?: string | undefined;
}
```

### DictionaryCommand

```typescript
interface DictionaryCommand {
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
```

### CommandParameter

```typescript
interface CommandParameter {
  name: string;
  code?: string | undefined;
  type: string;
  description?: string | undefined;
  optional: boolean;
}
```

### DictionaryEnumeration

```typescript
interface DictionaryEnumeration {
  name: string;
  code?: string | undefined;
  description?: string | undefined;
  values: EnumerationValue[];
}
```

### EnumerationValue

```typescript
interface EnumerationValue {
  name: string;
  code?: string | undefined;
  description?: string | undefined;
}
```

## Cache Types

### CacheEntry<T>

```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  appPath: string;
}
```

## Type Guards

### isExecuteParams

```typescript
function isExecuteParams(value: unknown): value is ExecuteParams
```

Validates that value has required `script` string and optional `timeout` number.

### isGetDictionaryParams

```typescript
function isGetDictionaryParams(value: unknown): value is GetDictionaryParams
```

Validates that value has required `app` string.

## Extended Types (in other modules)

### SafetyAnalysis (execute.ts)

```typescript
interface SafetyAnalysis {
  safe: boolean;
  risk: 'none' | 'low' | 'medium' | 'high' | 'critical';
  warnings: string[];
  requiresConfirmation: boolean;
}
```

### ExecutionRecord (pattern-store.ts)

```typescript
interface ExecutionRecord {
  id: string;
  timestamp: string;
  intent: string;
  apps: string[];
  script: string;
  success: boolean;
  result: string;
  category: 'media' | 'files' | 'communication' | 'productivity' | 'system' | 'other';
  actions: string[];
  successCount: number;
  keywords: string[];
}
```

### SystemState (system-state.ts)

```typescript
interface SystemState {
  timestamp: string;
  frontmostApp: string;
  runningApps: string[];
  finderSelection: string[];
  clipboardText: string | null;
  currentVolume: number;
  musicPlaying: {
    isPlaying: boolean;
    track: string | null;
    artist: string | null;
    album: string | null;
  };
  safariTabs: Array<{ title: string; url: string }>;
}
```

### FailureAnalysis (analyzer.ts)

```typescript
interface FailureAnalysis {
  errorType: ErrorType;
  rootCause: string;
  suggestions: string[];
  relatedSuccessfulPattern: string | null;
  fixedScript: string | null;
  confidence: 'high' | 'medium' | 'low';
}

type ErrorType =
  | 'permission_denied'
  | 'app_not_running'
  | 'syntax_error'
  | 'object_not_found'
  | 'property_not_found'
  | 'command_not_understood'
  | 'timeout'
  | 'type_mismatch'
  | 'index_out_of_bounds'
  | 'missing_value'
  | 'user_cancelled'
  | 'unknown';
```

## TypeScript Configuration

The project uses strict TypeScript settings:

```json
{
  "strict": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true,
  "noImplicitOverride": true
}
```

Notable settings:

- `noUncheckedIndexedAccess`: Array/object index access returns `T | undefined`
- `exactOptionalPropertyTypes`: Optional properties cannot have `undefined` as a value unless explicitly typed
