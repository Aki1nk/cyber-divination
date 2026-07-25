import { handleAdminInvite } from '../../../_lib/admin-accounts-api.js';
export function onRequestDelete(context) { return handleAdminInvite({ ...context, inviteId: context.params.id }); }
export function onRequest() { return new Response(null, { status: 405, headers: { Allow: 'DELETE' } }); }
