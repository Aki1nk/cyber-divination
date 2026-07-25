import { handleRegister } from '../../_lib/user-auth-api.js';
export function onRequestPost(context) { return handleRegister(context); }
export function onRequest() { return new Response(null, { status: 405, headers: { Allow: 'POST' } }); }
