// nodes/Searxng/ai-tools/runtime.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare function require(id: string): any;
declare namespace require {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function resolve(id: string, options?: any): string;
}

import type { DynamicStructuredTool } from '@langchain/core/tools';
import type { z as ZodNamespace } from 'zod';

type DynamicStructuredToolCtor = new (fields: {
  name: string;
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: any;
  func: (params: Record<string, unknown>) => Promise<string>;
}) => DynamicStructuredTool;

export type RuntimeZod = typeof ZodNamespace;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getRuntimeRequire(): any {
  // Anchor: @langchain/classic/agents is always in n8n's dependency tree.
  // NOTE: if n8n drops @langchain/classic in a future version, update this
  // anchor to another package in n8n's tree that depends on @langchain/core.
  try {
    const classicAgentsPath = require.resolve('@langchain/classic/agents') as string;
    const { createRequire } = require('module') as {
      createRequire: (filename: string) => NodeRequire;
    };
    return createRequire(classicAgentsPath);
  } catch {
    return require;
  }
}

const runtimeRequire = getRuntimeRequire();

const coreTools = runtimeRequire('@langchain/core/tools') as Record<string, unknown>;
export const RuntimeDynamicStructuredTool = coreTools[
  'DynamicStructuredTool'
] as DynamicStructuredToolCtor;

export const runtimeZod = runtimeRequire('zod') as RuntimeZod;
