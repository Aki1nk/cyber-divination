import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryStorage, createRepository } from '../../src/storage/repository.js';
import { fingerprintQuestion, normalizeQuestion } from '../../src/storage/fingerprint.js';

test('repository persists versioned records and settings', async () => {
  const storage = createMemoryStorage();
  const repository = createRepository(storage);
  await repository.saveRecord({ id: 'gua-1', questionFingerprint: 'abc', createdAt: '2026-07-24T10:00:00.000Z' });
  await repository.saveSettings({ reduceMotion: true, dayBoundary: 'early-zi' });

  assert.equal((await repository.listRecords()).length, 1);
  assert.equal((await repository.getSettings()).reduceMotion, true);
  assert.equal(JSON.parse(storage.getItem('cyber-divination:v1')).schemaVersion, 1);
});

test('recent duplicate returns the original record', async () => {
  const repository = createRepository(createMemoryStorage());
  await repository.saveRecord({ id: 'gua-1', questionFingerprint: 'abc', createdAt: '2026-07-24T10:00:00.000Z' });

  assert.equal((await repository.findRecentDuplicate('abc', new Date('2026-07-25T09:59:00.000Z'))).id, 'gua-1');
  assert.equal(await repository.findRecentDuplicate('abc', new Date('2026-07-25T10:01:00.000Z')), null);
});

test('corrupted data is preserved for recovery before reset', async () => {
  const storage = createMemoryStorage({ 'cyber-divination:v1': '{broken' });
  const repository = createRepository(storage, { now: () => new Date('2026-07-24T12:00:00.000Z') });

  assert.deepEqual(await repository.listRecords(), []);
  assert.equal(storage.getItem('cyber-divination:recovery:2026-07-24T12:00:00.000Z'), '{broken');
});

test('question fingerprints normalize spaces and full-width punctuation', async () => {
  assert.equal(normalizeQuestion('  工作，  是否顺利？ '), '工作, 是否顺利?');
  assert.equal(
    await fingerprintQuestion('工作，是否顺利？'),
    await fingerprintQuestion('  工作,   是否顺利?  ')
  );
});

test('repository clears records without discarding settings', async () => {
  const repository = createRepository(createMemoryStorage());
  await repository.saveRecord({ id: 'gua-1', createdAt: '2026-07-24T10:00:00.000Z' });
  await repository.saveSettings({ reduceMotion: true });
  await repository.clearRecords();
  assert.deepEqual(await repository.listRecords(), []);
  assert.equal((await repository.getSettings()).reduceMotion, true);
});
