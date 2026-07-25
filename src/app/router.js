const STATIC_ROUTES = Object.freeze({
  '#/': 'home',
  '#/ask': 'ask',
  '#/history': 'history',
  '#/classics': 'classics',
  '#/privacy': 'privacy',
  '#/settings': 'settings',
  '#/login': 'login',
  '#/account': 'account'
});

export function parseRoute(hash = '#/') {
  const normalized = hash || '#/';
  if (STATIC_ROUTES[normalized]) return { name: STATIC_ROUTES[normalized], params: {} };
  const resultMatch = normalized.match(/^#\/result\/([^/?#]+)$/);
  if (resultMatch) return { name: 'result', params: { id: decodeURIComponent(resultMatch[1]) } };
  return { name: 'home', params: {} };
}

export function routeForSession(route, user) {
  if (route.name === 'privacy') return route;
  if (!user) return route.name === 'login' ? route : { name: 'login', params: {} };
  if (user.mustChangePassword && route.name !== 'account') return { name: 'account', params: {} };
  if (route.name === 'login') return { name: 'home', params: {} };
  return route;
}
