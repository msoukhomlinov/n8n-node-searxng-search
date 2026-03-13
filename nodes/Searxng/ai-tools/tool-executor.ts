import type { IExecuteFunctions, ISupplyDataFunctions } from 'n8n-workflow';
import { searxngRequest, type SearxngSearchResponse } from '../lib/transport';
import { normalizeCommaSeparatedValues, normalizeSingleValue } from '../lib/helpers';
import { wrapSuccess, wrapError, ERROR_TYPES, formatToolError } from './error-formatter';

/**
 * n8n framework injects these fields into every DynamicStructuredTool call.
 * They must be stripped before forwarding params to the API.
 */
const N8N_METADATA_FIELDS = new Set([
  'sessionId',
  'action',
  'chatInput',
  'root',        // n8n canvas root node UUID — collides with some API 'root' params
  'tool',
  'toolName',
  'toolCallId',
  'operation',   // unified tool routing field — must not leak into API request bodies
]);

export async function executeSearchTool(
  context: ISupplyDataFunctions,
  rawInput: Record<string, unknown>,
  maxResults: number,
): Promise<string> {
  // Strip n8n framework metadata injected into every DynamicStructuredTool call
  const input: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rawInput)) {
    if (!N8N_METADATA_FIELDS.has(key)) input[key] = value;
  }

  const query = input.query as string | undefined;

  try {
    if (!query || query.trim().length === 0) {
      return JSON.stringify(
        wrapError('search', 'search', ERROR_TYPES.MISSING_QUERY, 'query is required', 'Provide a non-empty search query string.'),
      );
    }

    const queryParameters: Record<string, string | number | boolean> = {
      q: query,
      format: 'json',
    };

    const normalizedCategories = normalizeCommaSeparatedValues(
      input.categories as string | undefined,
    );
    if (normalizedCategories) {
      queryParameters.categories = normalizedCategories;
    }

    const normalizedLanguage = normalizeSingleValue(input.language as string | undefined);
    if (normalizedLanguage && normalizedLanguage !== 'all') {
      queryParameters.language = normalizedLanguage;
    }

    if (input.time_range) {
      queryParameters.time_range = input.time_range as string;
    }

    if (input.safesearch !== undefined) {
      queryParameters.safesearch = input.safesearch as string;
    }

    if (input.pageno !== undefined) {
      queryParameters.pageno = input.pageno as number;
    }

    const normalizedEngines = normalizeCommaSeparatedValues(input.engines as string | undefined);
    if (normalizedEngines) {
      queryParameters.engines = normalizedEngines;
    }

    // Safe cast: searxngRequest only uses getCredentials + helpers.httpRequest,
    // both present on ISupplyDataFunctions.
    const response = await searxngRequest(
      context as unknown as IExecuteFunctions,
      queryParameters,
      'json',
    );
    const jsonResponse = response as SearxngSearchResponse;
    const rawResults = jsonResponse.results ?? [];

    const allResults: Array<{ title: string; url: string; content: string }> = Array.isArray(rawResults)
      ? rawResults.map((r: Record<string, unknown>) => ({
          title: String(r.title ?? ''),
          url: String(r.url ?? ''),
          content: String(r.content ?? r.snippet ?? ''),
        }))
      : [];

    const results = allResults.slice(0, maxResults);

    return JSON.stringify(
      wrapSuccess('search', 'search', {
        items: results,
        count: results.length,
        totalAvailable: allResults.length,
        query,
      }),
    );
  } catch (error) {
    return formatToolError(error, query);
  }
}
