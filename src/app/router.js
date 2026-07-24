const STATIC_ROUTES = Object.freeze({
  '#/': 'home',
  '#/ask': 'ask',
  '#/history': 'history',
  '#/classics': 'classics',
  '#/settings': 'settings'
});

export function parseRoute(hash = '#/') {
  const normalized = hash || '#/';
  if (STATIC_ROUTES[normalized]) return { name: STATIC_ROUTES[normalized], params: {} };
  const resultMatch = normalized.match(/^#\/result\/([^/?#]+)$/);
  if (resultMatch) return { name: 'result', params: { id: decodeURIComponent(resultMatch[1]) } };
  return { name: 'home', params: {} };
}
