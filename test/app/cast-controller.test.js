import test from 'node:test';
import assert from 'node:assert/strict';
import { createCastController } from '../../src/app/cast-controller.js';
import { createMemoryStorage, createRepository } from '../../src/storage/repository.js';
import { createCalendarAdapter } from '../../src/domain/calendar.js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

test('controller creates one immutable auditable number record', async () => {
  const repository = createRepository(createMemoryStorage());
  const controller = createCastController({ repository, now: () => new Date('2026-07-24T10:00:00.000Z') });
  const record = await controller.cast({
    question: '未来三个月是否适合推进当前职业选择？',
    background: '需要协调团队资源并确认外部接口',
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
  assert.equal(record.schemaVersion, 2);
  assert.equal(record.interpretation.profileId, 'local-deterministic-v2');
  assert.equal(record.interpretation.questionContext.category, 'career');
  assert.equal(record.interpretation.questionContext.intent, 'decision');
  assert.ok(record.interpretation.sections.length === 9);
  assert.equal(record.snapshot.background, '需要协调团队资源并确认外部接口');
  assert.ok(Object.isFrozen(record.interpretation.questionContext));
  assert.equal(record.ai.status, 'pending');
});

test('controller invokes post-save cloud hook only for a new record', async () => {
  const repository = createRepository(createMemoryStorage());
  const saved = [];
  const controller = createCastController({ repository, now: () => new Date('2026-07-24T10:00:00.000Z'), onRecordSaved: (record) => saved.push(record.id) });
  const input = { question: '项目是否进入排期？', category: 'career', method: 'number-pair', inputs: { first: '3', second: '5' } };
  await controller.cast(input);
  await controller.cast(input);
  await Promise.resolve();
  assert.equal(saved.length, 1);
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

test('controller integrates triple, random, time and external profiles', async () => {
  const repository = createRepository(createMemoryStorage());
  const values = [0, 1, 2];
  const controller = createCastController({
    repository,
    now: () => new Date('2026-07-24T10:00:00.000Z'),
    randomIndex: (max) => values.shift() % max,
    calendar: createCalendarAdapter(require('../../src/vendor/lunar.cjs'))
  });
  const records = [];
  records.push(await controller.cast({ question: 'triple case', method: 'number-triple', inputs: { first: '9', second: '16', third: '7' } }));
  records.push(await controller.cast({ question: 'random case', method: 'digital-symbol', inputs: {} }));
  records.push(await controller.cast({ question: 'time case', method: 'time', inputs: { year: 2026, month: 7, day: 24, hour: 10, minute: 0, dayBoundary: 'midnight', yearBoundary: 'lunar-new-year' } }));
  records.push(await controller.cast({ question: 'external case', method: 'external', inputs: { objectTrigram: 1, directionTrigram: 4, count: 2, hourBranchNumber: 6, confirmed: true } }));

  assert.deepEqual(records.map((record) => record.algorithm.id), ['number-triple-v1', 'digital-symbol-v1', 'meihua-time-classic-v1', 'external-object-direction-v1']);
  assert.equal((await repository.listRecords()).length, 4);
});

test('recent duplicate digital question does not draw another random symbol', async () => {
  const repository = createRepository(createMemoryStorage());
  let draws = 0;
  const controller = createCastController({ repository, now: () => new Date('2026-07-24T10:00:00.000Z'), randomIndex: () => draws++ });
  const input = { question: 'same digital question', method: 'digital-symbol', inputs: {} };
  const first = await controller.cast(input);
  const second = await controller.cast(input);
  assert.equal(first.id, second.id);
  assert.equal(draws, 3);
});
