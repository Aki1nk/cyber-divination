import { handleAdminInvites } from '../../../_lib/admin-accounts-api.js';
export function onRequestGet(context) { return handleAdminInvites(context); }
export function onRequestPost(context) { return handleAdminInvites(context); }
export function onRequest() { return new Response(null, { status: 405, headers: { Allow: 'GET, POST' } }); }
