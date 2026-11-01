import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createClient, tools } from './client.mjs';
const execute = createClient();
const server = new Server({ name: 'foreclosuredatahub', version: '1.0.0' }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
server.setRequestHandler(CallToolRequestSchema, async ({ params }) => {
  try { return { content: [{ type: 'text', text: JSON.stringify(await execute(params.name, params.arguments)) }] }; }
  catch (error) { return { isError: true, content: [{ type: 'text', text: error instanceof Error ? error.message : 'Request unavailable.' }] }; }
});
await server.connect(new StdioServerTransport());
