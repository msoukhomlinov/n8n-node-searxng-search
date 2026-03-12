// nodes/Searxng/ai-tools/schema-generator.test.ts
import { z } from 'zod';
import { getRuntimeSchemaBuilders } from './schema-generator';

// In test environment we pass local `zod` as runtimeZ.
// The converted schema must parse/reject identically to the original.
describe('getRuntimeSchemaBuilders', () => {
  const builders = getRuntimeSchemaBuilders(z);
  const schema = builders.getSearchSchema();

  it('accepts a valid query-only input', () => {
    const result = schema.safeParse({ query: 'typescript n8n' });
    expect(result.success).toBe(true);
  });

  it('rejects empty query (min:1 preserved)', () => {
    const result = schema.safeParse({ query: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing query', () => {
    const result = schema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('accepts all optional fields with valid values', () => {
    const result = schema.safeParse({
      query: 'test',
      categories: 'general,news',
      language: 'en',
      time_range: 'day',
      safesearch: '1',
      pageno: 2,
      engines: 'google,bing',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid time_range enum value', () => {
    const result = schema.safeParse({ query: 'test', time_range: 'week' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid safesearch enum value', () => {
    const result = schema.safeParse({ query: 'test', safesearch: '3' });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer pageno', () => {
    const result = schema.safeParse({ query: 'test', pageno: 1.5 });
    expect(result.success).toBe(false);
  });

  it('rejects pageno less than 1', () => {
    const result = schema.safeParse({ query: 'test', pageno: 0 });
    expect(result.success).toBe(false);
  });
});
