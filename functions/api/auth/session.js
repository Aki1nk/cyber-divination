import { handleSession } from '../../_lib/user-auth-api.js';
export function onRequestGet(context) { return handleSession(context); }
export function onRequestDelete(context) { return handleSession(context); }
export function onRequest() { return new Response(null, { status: 405, headers: { Allow: 'GET, DELETE' } }); }
