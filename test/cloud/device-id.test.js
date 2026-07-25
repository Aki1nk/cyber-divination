import test from 'node:test';
import assert from 'node:assert/strict';
import { getOrCreateDeviceId } from '../../src/cloud/device-id.js';
import { createMemoryStorage } from '../../src/storage/repository.js';

test('device id is generated once and persisted', () => {
  const storage = createMemoryStorage();
  const cryptoApi = { randomUUID: () => '11111111-2222-4333-8444-555555555555' };
  assert.equal(getOrCreateDeviceId(storage, cryptoApi), '11111111-2222-4333-8444-555555555555');
  assert.equal(getOrCreateDeviceId(storage, { randomUUID: () => 'different' }), '11111111-2222-4333-8444-555555555555');
});

test('invalid stored identity is replaced', () => {
  const storage = createMemoryStorage({ 'cyber-divination:device-id:v1': 'not-an-id' });
  assert.equal(getOrCreateDeviceId(storage, { randomUUID: () => 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' }), 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
});
