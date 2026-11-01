import { readFileSync } from 'node:fs';
import { z } from 'zod';
export const catalog = JSON.parse(readFileSync(new URL('../catalog.json', import.meta.url), 'utf8'));
const validators = new Map(catalog.map(tool => [tool.name, z.fromJSONSchema(tool.inputSchema)]));
export const tools = catalog.map(({ name, description, inputSchema, annotations }) => ({ name, description, inputSchema, annotations }));
export function createClient({ key = process.env.FORECLOSUREDATAHUB_API_KEY, baseUrl = process.env.FORECLOSUREDATAHUB_BASE_URL || 'https://www.foreclosuredatahub.com', fetchImpl = fetch } = {}) {
  const origin = new URL(baseUrl);
  if (origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/') throw new Error('Use an origin without credentials, query strings or paths.');
  if (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname))) throw new Error('HTTPS is required.');
  return async (name, input = {}) => {
    if (!key || !/^fdh_ak_[a-f0-9]{40}$/.test(key)) throw new Error('Set FORECLOSUREDATAHUB_API_KEY to your API key.');
    const tool = catalog.find(item => item.name === name);
    if (!tool) throw new Error('Unknown tool.');
    const parsed = validators.get(name).safeParse(input);
    if (!parsed.success) throw new Error('Invalid tool arguments. Check tools/list for the accepted parameters and types.');
    const url = new URL(tool.path, origin);
    for (const [name, value] of Object.entries({ ...parsed.data, ...tool.fixedQuery })) {
      for (const item of Array.isArray(value) ? value : [value]) url.searchParams.append(name, String(item));
    }
    const response = await fetchImpl(url, { headers: { 'x-api-key': key, Accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(55_000) });
    if (!response.ok) throw new Error(`API returned HTTP ${response.status}. Retry-After: ${response.headers.get('Retry-After') || 'not provided'}. Check access and remaining allowances before retrying.`);
    return response.json();
  };
}
