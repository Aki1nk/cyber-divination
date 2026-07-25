import test from 'node:test';
import assert from 'node:assert/strict';
import { createReadingsClient } from '../../src/cloud/readings-client.js';

test('readings client creates and retries same-origin cloud readings', async () => {
  const calls = [];
  const client = createReadingsClient({ fetchImpl: async (url, options) => { calls.push({ url, options }); return new Response(JSON.stringify({ id: 'cloud-1', status: 'completed', aiReading: { overall_judgment: '宜先联调' }, errorCode: null }), { status: 200, headers: { 'Content-Type': 'application/json' } }); } });
  assert.equal((await client.create({ deviceId: 'device-1' })).status, 'completed');
  await client.retry('cloud-1', 'device-1');
  assert.equal(calls[0].url, '/api/readings');
  assert.equal(calls[1].url, '/api/readings/cloud-1/retry');
  assert.equal(calls[0].options.credentials, 'same-origin');
});

test('readings client throws stable errors for unavailable API', async () => {
  const client = createReadingsClient({ fetchImpl: async () => new Response(JSON.stringify({ errorCode: 'invalid_request' }), { status: 400 }) });
  await assert.rejects(() => client.create({}), /invalid_request/);
});
