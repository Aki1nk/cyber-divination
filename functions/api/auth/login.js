import { handleLogin } from '../../_lib/user-auth-api.js';
export function onRequestPost(context) { return handleLogin(context); }
export function onRequest() { return new Response(null, { status: 405, headers: { Allow: 'POST' } }); }
