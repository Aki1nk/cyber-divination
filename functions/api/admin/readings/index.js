import { handleAdminList } from '../../../_lib/admin-api.js';

export function onRequest(context) {
  return handleAdminList(context);
}
