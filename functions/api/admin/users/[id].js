import { handleAdminUser } from '../../../_lib/admin-accounts-api.js';
export function onRequestGet(context) { return handleAdminUser({ ...context, userId: context.params.id }); }
export function onRequestPatch(context) { return handleAdminUser({ ...context, userId: context.params.id }); }
export function onRequest() { return new Response(null, { status: 405, headers: { Allow: 'GET, PATCH' } }); }
