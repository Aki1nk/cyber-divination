import { handleAdminDetail } from '../../../_lib/admin-api.js';

export function onRequest(context) {
  return handleAdminDetail({ ...context, readingId: context.params.id });
}
