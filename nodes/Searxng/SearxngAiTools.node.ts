// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare function require(id: string): any;

import { NodeOperationError } from 'n8n-workflow';
import type {
  NodeConnectionType,
  IDataObject,
  IExecuteFunctions,
  INodeType,
  INodeTypeDescription,
  INodeExecutionData,
  ISupplyDataFunctions,
  SupplyData,
} from 'n8n-workflow';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { CREDENTIAL_NAME } from './constants';
import { searchToolSchema } from './ai-tools/schema-generator';
import { TOOL_NAME, TOOL_DESCRIPTION } from './ai-tools/description-builders';
import { executeSearchTool } from './ai-tools/tool-executor';

// ---------------------------------------------------------------------------
// Toolkit compatibility — n8n 2.9+ vs older n8n
//
// n8n >= 2.9  exports StructuredToolkit from n8n-core.
// Older n8n   uses Toolkit from @langchain/classic/agents.
//
// The AI Agent checks `toolOrToolkit instanceof <ToolkitBase>` to flatten tools.
// We MUST extend the EXACT same constructor n8n loaded, so instanceof passes.
// Probe n8n-core first; fall back to classic if StructuredToolkit is absent.
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let LangChainToolkitBase: new (...args: any[]) => {
  tools?: DynamicStructuredTool[];
  getTools?(): DynamicStructuredTool[];
};
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const nCore = require('n8n-core') as Record<string, unknown>;
  const StructuredToolkit = nCore['StructuredToolkit'];
  if (typeof StructuredToolkit !== 'function') throw new Error('not found');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  LangChainToolkitBase = StructuredToolkit as any;
} catch {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  ({ Toolkit: LangChainToolkitBase } = require('@langchain/classic/agents') as {
    Toolkit: typeof LangChainToolkitBase;
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
class SearxngToolkit extends (LangChainToolkitBase as any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  declare tools: any[];
  constructor(toolList: DynamicStructuredTool[]) {
    super();
    this.tools = toolList;
  }
  getTools(): DynamicStructuredTool[] {
    return this.tools as DynamicStructuredTool[];
  }
}

export class SearxngAiTools implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'SearXNG Search AI Tool',
    name: 'searxngAiTools',
    icon: 'file:searxng.svg',
    group: ['output'],
    version: 1,
    description: 'Expose SearXNG web search as a structured AI tool for use with the AI Agent node',
    defaults: { name: 'SearXNG Search AI Tool' },
    inputs: [],
    outputs: [{ type: 'ai_tool' as NodeConnectionType, displayName: 'Tool' }],
    credentials: [
      {
        name: CREDENTIAL_NAME,
        required: true,
      },
    ],
    codex: {
      categories: ['AI', 'Search'],
      alias: ['searxng', 'search', 'web-search', 'ai-tool'],
      subcategories: {
        ai: ['Tools'],
      },
    },
    properties: [
      {
        displayName: 'Max Results',
        name: 'maxResults',
        type: 'number',
        default: 10,
        typeOptions: { minValue: 1, maxValue: 50 },
        description: 'Maximum number of search results to return to the AI agent (1–50)',
      },
    ],
  };

  async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
    const maxResults = this.getNodeParameter('maxResults', itemIndex, 10) as number;

    if (maxResults < 1 || maxResults > 50) {
      throw new NodeOperationError(this.getNode(), 'Max Results must be between 1 and 50');
    }

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const supplyDataContext = this;

    const tool = new DynamicStructuredTool({
      name: TOOL_NAME,
      description: TOOL_DESCRIPTION,
      // Pass raw Zod — never pre-convert. n8n/LangChain handles Zod→JSON schema
      // conversion internally for tool definition extraction.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      schema: searchToolSchema as any,
      // func() is NOT called by n8n's AI Agent execution path.
      // n8n uses this only for schema/description extraction.
      // Real dispatch goes through execute() below.
      func: async (params: Record<string, unknown>) => {
        return executeSearchTool(supplyDataContext, params, maxResults);
      },
    });

    const toolkit = new SearxngToolkit([tool]);
    return { response: toolkit };
  }

  /**
   * execute() is called by n8n for BOTH "Test step" clicks AND real AI Agent tool invocations.
   *
   * CRITICAL: n8n's AI Agent routes tool calls through execute(), NOT DynamicStructuredTool.func().
   * supplyData() + getTools() only provide tool definitions (names, schemas, descriptions) to the LLM.
   * When the LLM calls a tool, n8n dispatches via execute() with LLM-provided params merged into
   * the input item JSON alongside n8n metadata fields (tool, toolCallId, sessionId, etc).
   *
   * Detect real calls by checking for the 'tool' field. Absent = "Test step", return stub.
   */
  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const firstItemTool = items[0]?.json?.['tool'] as string | undefined;

    // No tool field → "Test step" click, not a real AI Agent tool call
    if (!firstItemTool) {
      return [
        [
          {
            json: {
              message: 'This is an AI Tool node. Connect it to an AI Agent node to use it.',
              tool: TOOL_NAME,
            } as IDataObject,
            pairedItem: { item: 0 },
          },
        ],
      ];
    }

    if (firstItemTool !== TOOL_NAME) {
      return [
        [
          {
            json: { error: `Unknown tool: ${firstItemTool}` } as IDataObject,
            pairedItem: { item: 0 },
          },
        ],
      ];
    }

    const maxResults = this.getNodeParameter('maxResults', 0, 10) as number;
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      const rawParams = items[i].json as Record<string, unknown>;
      try {
        // Safe cast: IExecuteFunctions has all methods ISupplyDataFunctions requires.
        const resultStr = await executeSearchTool(
          this as unknown as ISupplyDataFunctions,
          rawParams,
          maxResults,
        );
        returnData.push({
          json: JSON.parse(resultStr) as IDataObject,
          pairedItem: { item: i },
        });
      } catch (error) {
        if (this.continueOnFail()) {
          const msg = error instanceof Error ? error.message : String(error);
          returnData.push({ json: { error: msg } as IDataObject, pairedItem: { item: i } });
        } else {
          throw error;
        }
      }
    }

    return [returnData];
  }
}
