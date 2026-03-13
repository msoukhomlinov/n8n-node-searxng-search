// nodes/Searxng/SearxngAiTools.node.ts
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
import { CREDENTIAL_NAME } from './constants';
import { getRuntimeSchemaBuilders } from './ai-tools/schema-generator';
import { TOOL_NAME, TOOL_DESCRIPTION } from './ai-tools/description-builders';
import { executeSearchTool } from './ai-tools/tool-executor';
import { wrapError, ERROR_TYPES } from './ai-tools/error-formatter';
import { RuntimeDynamicStructuredTool, runtimeZod } from './ai-tools/runtime';

// Resolve runtime schemas once at module load.
// getRuntimeSchemaBuilders converts compile-time Zod schemas to runtime-Zod
// instances so schema instanceof ZodType passes in n8n's MCP Trigger (queue mode).
const runtimeSchemas = getRuntimeSchemaBuilders(runtimeZod);

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

    // RuntimeDynamicStructuredTool resolves DynamicStructuredTool from n8n's module
    // tree so instanceof checks pass in both execution paths:
    //   - AI Agent: supplyData() → tool definition extracted → execute() called
    //   - MCP Trigger (including queue mode): supplyData() → tool.invoke(args) → func() called
    //
    // MCP annotations (future): when n8n supports MCP tool annotations, add:
    //   annotations: { title: 'SearXNG Web Search', readOnlyHint: true, openWorldHint: true }
    const tool = new RuntimeDynamicStructuredTool({
      name: TOOL_NAME,
      description: TOOL_DESCRIPTION,
      // Runtime-converted Zod schema — ensures schema.parseAsync() in MCP Trigger's
      // queue worker uses n8n's Zod instance, not this package's bundled copy.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      schema: runtimeSchemas.getSearchSchema() as any,
      // func() is called by MCP Trigger (direct and queue mode).
      // AI Agent dispatches via execute() below instead.
      func: async (params: Record<string, unknown>) => {
        return executeSearchTool(supplyDataContext, params, maxResults);
      },
    });

    // Return bare tool — no Toolkit wrapper needed.
    // AI Agent and MCP Trigger both consume a single DynamicStructuredTool directly.
    return { response: tool };
  }

  /**
   * execute() is called by n8n's AI Agent for real tool invocations and "Test step" clicks.
   * MCP Trigger does NOT use this path — it calls func() on the tool directly.
   * Detect real AI Agent calls by checking for the 'tool' field injected by n8n's framework.
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
            json: wrapError(
              'search', 'search', ERROR_TYPES.SEARCH_ERROR,
              `Unknown tool: ${firstItemTool}`,
              `Use the tool name "${TOOL_NAME}" for search requests.`,
            ) as unknown as IDataObject,
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
