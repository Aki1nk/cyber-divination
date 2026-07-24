import test from 'node:test';
import assert from 'node:assert/strict';
import { createCastController } from '../../src/app/cast-controller.js';
import { createMemoryStorage, createRepository } from '../../src/storage/repository.js';

test('controller creates one immutable auditable number record', async () => {
  const repository = createRepository(createMemoryStorage());
  const controller = createCastController({ repository, now: () => new Date('2026-07-24T10:00:00.000Z') });
  const record = await controller.cast({
    question: '未来三个月是否适合推进当前职业选择？',
    category: 'career',
    method: 'number-pair',
    inputs: { first: '9', second: '16' }
  });

  assert.equal(record.algorithm.id, 'number-pair-v1');
  assert.equal(record.hexagram.movingLine, 1);
  assert.equal(record.hexagram.mutualLines.length, 6);
  assert.equal((await repository.listRecords()).length, 1);
  assert.ok(Object.isFrozen(record.snapshot));
  assert.ok(record.calculationLog.length >= 3);
});

test('controller returns a recent duplicate without creating another record', async () => {
  const repository = createRepository(createMemoryStorage());
  const controller = createCastController({ repository, now: () => new Date('2026-07-24T10:00:00.000Z') });
  const input = { question: '这件事是否适合继续推进？', category: 'general', method: 'number-pair', inputs: { first: '3', second: '5' } };
  const original = await controller.cast(input);
  const duplicate = await controller.cast(input);

  assert.equal(duplicate.id, original.id);
  assert.equal((await repository.listRecords()).length, 1);
});
