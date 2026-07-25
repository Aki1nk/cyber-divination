async function call(fetchImpl, url, body) {
  let response;
  try {
    response = await fetchImpl(url, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch {
    throw new Error('network_unavailable');
  }
  let data = {};
  try { data = await response.json(); } catch { data = {}; }
  if (!response.ok && response.status !== 202) throw new Error(data.errorCode ?? 'cloud_request_failed');
  return data;
}

export function createReadingsClient({ fetchImpl = fetch } = {}) {
  return Object.freeze({
    create(payload) { return call(fetchImpl, '/api/readings', payload); },
    retry(readingId, deviceId) { return call(fetchImpl, `/api/readings/${encodeURIComponent(readingId)}/retry`, { deviceId }); }
  });
}
