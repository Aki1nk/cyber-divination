import { handleAccount } from '../../_lib/user-auth-api.js';
export function onRequestDelete(context) { return handleAccount(context); }
export function onRequest() { return new Response(null, { status: 405, headers: { Allow: 'DELETE' } }); }
