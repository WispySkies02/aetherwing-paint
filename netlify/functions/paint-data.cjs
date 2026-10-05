const REGISTRY_URL = 'https://aetherwing.net/api/paints';

exports.handler = async (event) => {
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'public, max-age=15, stale-while-revalidate=300',
    'netlify-cdn-cache-control': 'public, durable, s-maxage=60, stale-while-revalidate=600',
    'x-content-type-options': 'nosniff'
  };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers: { ...headers, allow: 'GET' }, body: JSON.stringify({ error: 'Method not allowed.' }) };
  try {
    const response = await fetch(REGISTRY_URL, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`Central registry returned ${response.status}`);
    const registry = await response.json();
    if (!Array.isArray(registry.paints)) throw new Error('Invalid central paint registry.');
    return { statusCode: 200, headers, body: JSON.stringify({ version: 1, paints: registry.paints, feature: registry.feature || null }) };
  } catch (error) {
    console.error('paint-data', error);
    return { statusCode: 503, headers, body: JSON.stringify({ error: 'The central paint registry is temporarily unavailable.' }) };
  }
};
