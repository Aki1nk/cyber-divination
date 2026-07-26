import { createReadingsRepository } from './readings-repository.js';
import { json } from './http.js';
import { sessionFromRequest, verifyAdminSession } from './admin-auth.js';

async function authorized(context) {
  return verifyAdminSession(sessionFromRequest(context.request), context.env.ADMIN_SESSION_SECRET, context.now ?? new Date());
}

export async function handleAdminList(context) {
  if (context.request.method !== 'GET') return json({ errorCode: 'method_not_allowed' }, { status: 405, headers: { Allow: 'GET' } });
  if (!await authorized(context)) return json({ errorCode: 'unauthorized' }, { status: 401 });
  const url = new URL(context.request.url);
  const repository = context.repository ?? createReadingsRepository(context.env.DB);
  const result = await repository.list({
    q: url.searchParams.get('q')?.slice(0, 200) ?? '',
    status: url.searchParams.get('status') ?? '',
    category: url.searchParams.get('category') ?? '',
    page: Number(url.searchParams.get('page') ?? 1),
    pageSize: Number(url.searchParams.get('pageSize') ?? 25)
  });
  return json(result);
}

export async function handleAdminDetail(context) {
  if (!await authorized(context)) return json({ errorCode: 'unauthorized' }, { status: 401 });
  const repository = context.repository ?? createReadingsRepository(context.env.DB);
  if (context.request.method === 'GET') {
    const item = await repository.getAdmin(context.readingId);
    return item ? json({ item }) : json({ errorCode: 'not_found' }, { status: 404 });
  }
  if (context.request.method === 'DELETE') {
    await repository.delete(context.readingId);
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  }
  return json({ errorCode: 'method_not_allowed' }, { status: 405, headers: { Allow: 'GET, DELETE' } });
}
