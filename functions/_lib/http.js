export function json(data, { status = 200, headers = {} } = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });
}

export async function readJson(request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw Object.assign(new Error('content_type'), { code: 'invalid_content_type' });
  try { return await request.json(); } catch { throw Object.assign(new Error('json'), { code: 'invalid_json' }); }
}

export function publicReading(row) {
  return { id: row.id, status: row.status, aiReading: row.aiReading ?? null, errorCode: row.error_code ?? null };
}
