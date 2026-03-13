// ── Error types ─────────────────────────────────────────────────────────────
export const ERROR_TYPES = {
  SEARCH_ERROR: 'search_error',
  AUTHENTICATION: 'authentication',
  NETWORK: 'network',
  RATE_LIMIT: 'rate_limit',
  NOT_FOUND: 'not_found',
  MISSING_QUERY: 'missing_query',
} as const;

export type ErrorType = (typeof ERROR_TYPES)[keyof typeof ERROR_TYPES];

// ── Envelope interfaces ─────────────────────────────────────────────────────
export interface SuccessEnvelope {
  schemaVersion: '1';
  success: true;
  resource: string;
  operation: string;
  result: unknown;
}

export interface ErrorEnvelope {
  schemaVersion: '1';
  success: false;
  resource: string;
  operation: string;
  errorType: ErrorType;
  message: string;
  nextAction: string;
  context?: Record<string, unknown>;
}

// ── Envelope factories ──────────────────────────────────────────────────────
export function wrapSuccess(resource: string, operation: string, result: unknown): SuccessEnvelope {
  return { schemaVersion: '1', success: true, resource, operation, result };
}

export function wrapError(
  resource: string,
  operation: string,
  errorType: ErrorType,
  message: string,
  nextAction: string,
  context?: Record<string, unknown>,
): ErrorEnvelope {
  const envelope: ErrorEnvelope = {
    schemaVersion: '1',
    success: false,
    resource,
    operation,
    errorType,
    message,
    nextAction,
  };
  if (context !== undefined) {
    envelope.context = context;
  }
  return envelope;
}

// ── Legacy-compatible error classifier ──────────────────────────────────────
// Thin wrapper over wrapError — classifies the error and returns a JSON string.
export function formatToolError(error: unknown, query?: string): string {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  let errorType: ErrorType;
  let nextAction: string;

  if (lower.includes('401') || lower.includes('forbidden') || lower.includes('unauthorized')) {
    errorType = ERROR_TYPES.AUTHENTICATION;
    nextAction = 'Check your SearXNG API credentials and ensure the API key is correct.';
  } else if (
    lower.includes('econnrefused') ||
    lower.includes('network') ||
    lower.includes('enotfound')
  ) {
    errorType = ERROR_TYPES.NETWORK;
    nextAction = 'Check that your SearXNG instance is reachable at the configured URL.';
  } else if (
    lower.includes('429') ||
    lower.includes('rate limit') ||
    lower.includes('too many requests')
  ) {
    errorType = ERROR_TYPES.RATE_LIMIT;
    nextAction = 'Too many requests — wait a moment and retry.';
  } else if (lower.includes('404') || lower.includes('not found')) {
    errorType = ERROR_TYPES.NOT_FOUND;
    nextAction = 'The SearXNG endpoint was not found. Verify the API URL in credentials.';
  } else {
    errorType = ERROR_TYPES.SEARCH_ERROR;
    nextAction = 'Verify the query and parameters, then retry.';
  }

  const context = query !== undefined ? { query } : undefined;
  return JSON.stringify(wrapError('search', 'search', errorType, message, nextAction, context));
}
