import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient, catalog } from '../src/client.mjs';
const key = 'fdh_ak_' + 'a'.repeat(40);
test('maps every tool to one bounded REST request, preserving repeated query filters', async () => {
  for (const tool of catalog) {
    const calls = [];
    const client = createClient({ key, fetchImpl: async (url, options) => { calls.push({ url, options }); return Response.json({ data: [] }); } });
    await client(tool.name, tool.name === 'single_source_data' ? { source: 'feed-01' } : {});
    assert.equal(calls.length, 1); assert.equal(calls[0].url.pathname, tool.path);
    assert.equal(calls[0].options.headers['x-api-key'], key); assert.equal(calls[0].options.redirect, 'error');
    assert.ok(!calls[0].url.href.includes(key));
  }
  let called;
  await createClient({ key, fetchImpl: async url => { called = url; return Response.json({}); } })('search_unified_properties', { state: ['TX', 'FL'], page_size: 2 });
  assert.deepEqual(called.searchParams.getAll('state'), ['TX', 'FL']); assert.equal(called.searchParams.get('mode'), 'unified');
});
test('rejects unsafe origins, unknown tools and invalid arguments before fetching', async () => {
  for (const baseUrl of ['http://evil.example', 'https://user:pass@example.com', 'https://example.com/path', 'https://example.com/?key=secret']) assert.throws(() => createClient({ key, baseUrl }));
  let calls = 0;
  const client = createClient({ key, fetchImpl: async () => { calls++; return Response.json({}); } });
  for (const [name,args] of [['unknown',{}],['single_source_data',{}],['tax_sales_search',{page_size:101}],['filings_search',{state:['TX']}],['list_sources',{url:'https://evil.example'}]]) await assert.rejects(client(name,args));
  assert.equal(calls,0);
});
test('redacts credentials and response text from errors and never retries quota failures', async () => {
  let calls = 0;
  const client = createClient({ key, fetchImpl: async () => { calls++; return new Response('private response '+key, { status: 429, headers: { 'Retry-After':'60' } }); } });
  await assert.rejects(client('list_sources'), error => /HTTP 429/.test(error.message) && /60/.test(error.message) && !error.message.includes(key));
  assert.equal(calls,1);
});
