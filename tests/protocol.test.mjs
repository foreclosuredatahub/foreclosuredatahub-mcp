import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'node:url';
test('real stdio client initializes, lists tools and rejects unknown calls without credentials', async () => {
  const transport = new StdioClientTransport({ command: process.execPath, args: [fileURLToPath(new URL('../src/index.mjs', import.meta.url))], env: { PATH: process.env.PATH }, stderr: 'pipe' });
  const client = new Client({name:'offline-test',version:'1'}, {capabilities:{}});
  try {
    await client.connect(transport);
    const {tools} = await client.listTools(); assert.equal(tools.length,15);
    assert.ok(tools.every(tool => tool.annotations.readOnlyHint));
    const result = await client.callTool({name:'list_sources',arguments:{}});
    assert.equal(result.isError,true); assert.match(result.content[0].text,/FORECLOSUREDATAHUB_API_KEY/);
  } finally { await client.close(); }
});
