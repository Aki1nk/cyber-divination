import test from 'node:test';
import assert from 'node:assert/strict';
import { createSyncManager } from '../../src/cloud/sync-manager.js';
import { createMemoryStorage, createRepository } from '../../src/storage/repository.js';

const record = { id: 'gua-1', createdAt: '2026-07-25T00:00:00.000Z', question: '项目是否排期？', background: '', category: 'career', method: 'number-pair', algorithm: {}, rawInputs: {}, hexagram: {}, fiveElements: {}, classics: {}, calculationLog: [], interpretation: { sections: [] }, risk: { level: 'normal', categories: [] }, ai: { status: 'pending' } };

test('sync manager uploads queued reading and stores AI result', async () => {
  const repository = createRepository(createMemoryStorage());
  await repository.saveRecord(record);
  const manager = createSyncManager({ repository, deviceId: '11111111-2222-4333-8444-555555555555', client: { create: async () => ({ id: 'cloud-1', status: 'completed', aiReading: { overall_judgment: '宜先联调' }, errorCode: null }) } });
  await manager.queue(record);
  await manager.flush();
  const stored = await repository.getRecord('gua-1');
  assert.equal(stored.ai.status, 'completed');
  assert.equal(stored.ai.readingId, 'cloud-1');
  assert.deepEqual(await repository.listDueUploads(new Date('2030-01-01T00:00:00.000Z')), []);
});

test('sync manager keeps failed network upload for retry', async () => {
  const repository = createRepository(createMemoryStorage());
  await repository.saveRecord(record);
  const manager = createSyncManager({ repository, deviceId: '11111111-2222-4333-8444-555555555555', now: () => new Date('2026-07-25T00:00:00.000Z'), client: { create: async () => { throw new Error('network'); } } });
  await manager.queue(record);
  await manager.flush();
  assert.equal((await repository.getRecord('gua-1')).ai.status, 'queued');
  assert.equal((await repository.listDueUploads(new Date('2026-07-25T00:01:00.000Z'))).length, 1);
});

test('sync manager switches to retry endpoint after server creates a failed reading', async () => {
  const repository = createRepository(createMemoryStorage());
  await repository.saveRecord(record);
  const calls = [];
  const times = [new Date('2026-07-25T00:00:00.000Z'), new Date('2026-07-25T00:01:00.000Z')];
  const manager = createSyncManager({ repository, deviceId: '11111111-2222-4333-8444-555555555555', now: () => times[0], client: {
    create: async () => { calls.push('create'); return { id: 'cloud-1', status: 'failed', aiReading: null, errorCode: 'provider_unavailable' }; },
    retry: async (id) => { calls.push(`retry:${id}`); return { id, status: 'completed', aiReading: { overall_judgment: '完成' }, errorCode: null }; }
  } });
  await manager.queue(record);
  await manager.flush();
  times.shift();
  await manager.flush();
  assert.deepEqual(calls, ['create', 'retry:cloud-1']);
  assert.equal((await repository.getRecord('gua-1')).ai.status, 'completed');
});
