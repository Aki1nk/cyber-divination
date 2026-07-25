async function call(fetchImpl, url, options = {}) {
  const response = await fetchImpl(url, { credentials: 'same-origin', ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers ?? {}) } });
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data?.message ?? data?.errorCode ?? 'request_failed'), { status: response.status, code: data?.errorCode });
  return data;
}
export function createAuthClient(fetchImpl = fetch) {
  return Object.freeze({
    async session() { try { return (await call(fetchImpl, '/api/auth/session')).user; } catch (error) { if (error.status === 401) return null; throw error; } },
    login(value) { return call(fetchImpl, '/api/auth/login', { method: 'POST', body: JSON.stringify(value) }); },
    register(value) { return call(fetchImpl, '/api/auth/register', { method: 'POST', body: JSON.stringify(value) }); },
    logout() { return call(fetchImpl, '/api/auth/session', { method: 'DELETE' }); },
    changePassword(value) { return call(fetchImpl, '/api/auth/password', { method: 'POST', body: JSON.stringify(value) }); },
    deleteAccount(value) { return call(fetchImpl, '/api/auth/account', { method: 'DELETE', body: JSON.stringify(value) }); }
  });
}
