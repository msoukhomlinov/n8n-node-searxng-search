jest.mock('n8n-core', () => ({ StructuredToolkit: class StructuredToolkit {} }), {
  virtual: true,
});
jest.mock('@langchain/classic/agents', () => ({ Toolkit: class Toolkit {} }), {
  virtual: true,
});

import { SearxngAiTools } from './SearxngAiTools.node';

describe('SearXNG Search AI tool node', () => {
  it('should expose AI tool metadata for the add tool picker', () => {
    const node = new SearxngAiTools();

    expect(node.description.name).toBe('searxngAiTools');
    expect(node.description.displayName).toBe('SearXNG Search AI Tool');
    expect(node.description.usableAsTool).toBeUndefined();
    expect(node.description.outputs).toEqual([{ type: 'ai_tool', displayName: 'Tool' }]);
  });
});
