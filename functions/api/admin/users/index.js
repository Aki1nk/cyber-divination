import { handleAdminUsers } from '../../../_lib/admin-accounts-api.js';
export function onRequestGet(context) { return handleAdminUsers(context); }
export function onRequest() { return new Response(null, { status: 405, headers: { Allow: 'GET' } }); }
