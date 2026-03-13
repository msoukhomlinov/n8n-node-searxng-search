// nodes/Searxng/ai-tools/error-formatter.test.ts
import {
  ERROR_TYPES,
  wrapSuccess,
  wrapError,
  formatToolError,
  type SuccessEnvelope,
  type ErrorEnvelope,
} from './error-formatter';

describe('ERROR_TYPES', () => {
  it('has all expected error type values', () => {
    expect(ERROR_TYPES.SEARCH_ERROR).toBe('search_error');
    expect(ERROR_TYPES.AUTHENTICATION).toBe('authentication');
    expect(ERROR_TYPES.NETWORK).toBe('network');
    expect(ERROR_TYPES.RATE_LIMIT).toBe('rate_limit');
    expect(ERROR_TYPES.NOT_FOUND).toBe('not_found');
    expect(ERROR_TYPES.MISSING_QUERY).toBe('missing_query');
  });
});

describe('wrapSuccess', () => {
  it('returns a valid SuccessEnvelope', () => {
    const result = wrapSuccess('search', 'search', { items: [], count: 0 });
    expect(result).toEqual({
      schemaVersion: '1',
      success: true,
      resource: 'search',
      operation: 'search',
      result: { items: [], count: 0 },
    } satisfies SuccessEnvelope);
  });

  it('preserves arbitrary result payloads', () => {
    const payload = { items: [{ title: 'test' }], count: 1, totalAvailable: 5, query: 'hello' };
    const envelope = wrapSuccess('search', 'search', payload);
    expect(envelope.result).toEqual(payload);
  });
});

describe('wrapError', () => {
  it('returns a valid ErrorEnvelope without context', () => {
    const result = wrapError('search', 'search', ERROR_TYPES.NETWORK, 'connection refused', 'Check URL.');
    expect(result).toEqual({
      schemaVersion: '1',
      success: false,
      resource: 'search',
      operation: 'search',
      errorType: 'network',
      message: 'connection refused',
      nextAction: 'Check URL.',
    } satisfies ErrorEnvelope);
    expect(result).not.toHaveProperty('context');
  });

  it('includes context when provided', () => {
    const result = wrapError(
      'search', 'search', ERROR_TYPES.MISSING_QUERY, 'query is required',
      'Provide a query.', { query: '' },
    );
    expect(result.context).toEqual({ query: '' });
  });
});

describe('formatToolError', () => {
  function parse(jsonStr: string): ErrorEnvelope {
    return JSON.parse(jsonStr) as ErrorEnvelope;
  }

  it('classifies 401 errors as AUTHENTICATION', () => {
    const envelope = parse(formatToolError(new Error('Request failed with status 401')));
    expect(envelope.errorType).toBe(ERROR_TYPES.AUTHENTICATION);
    expect(envelope.schemaVersion).toBe('1');
    expect(envelope.success).toBe(false);
  });

  it('classifies ECONNREFUSED as NETWORK', () => {
    const envelope = parse(formatToolError(new Error('connect ECONNREFUSED 127.0.0.1:8080')));
    expect(envelope.errorType).toBe(ERROR_TYPES.NETWORK);
  });

  it('classifies 429 as RATE_LIMIT', () => {
    const envelope = parse(formatToolError(new Error('429 Too Many Requests')));
    expect(envelope.errorType).toBe(ERROR_TYPES.RATE_LIMIT);
  });

  it('classifies 404 as NOT_FOUND', () => {
    const envelope = parse(formatToolError(new Error('404 Not Found')));
    expect(envelope.errorType).toBe(ERROR_TYPES.NOT_FOUND);
  });

  it('classifies generic errors as SEARCH_ERROR', () => {
    const envelope = parse(formatToolError(new Error('something went wrong')));
    expect(envelope.errorType).toBe(ERROR_TYPES.SEARCH_ERROR);
  });

  it('includes query in context when provided', () => {
    const envelope = parse(formatToolError(new Error('timeout'), 'test query'));
    expect(envelope.context).toEqual({ query: 'test query' });
  });

  it('omits context when query is undefined', () => {
    const envelope = parse(formatToolError(new Error('timeout')));
    expect(envelope).not.toHaveProperty('context');
  });

  it('handles non-Error inputs', () => {
    const envelope = parse(formatToolError('string error'));
    expect(envelope.message).toBe('string error');
    expect(envelope.success).toBe(false);
  });
});
