import { handleTemporaryPassword } from '../../../../_lib/admin-accounts-api.js';
export function onRequestPost(context) { return handleTemporaryPassword({ ...context, userId: context.params.id }); }
export function onRequest() { return new Response(null, { status: 405, headers: { Allow: 'POST' } }); }
