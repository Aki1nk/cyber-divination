import { handleRetryReading } from '../../../_lib/readings-api.js';

export function onRequestPost(context) {
  return handleRetryReading({ ...context, readingId: context.params.id });
}

export function onRequest() {
  return new Response(JSON.stringify({ errorCode: 'method_not_allowed' }), { status: 405, headers: { 'Content-Type': 'application/json', Allow: 'POST', 'Cache-Control': 'no-store' } });
}
