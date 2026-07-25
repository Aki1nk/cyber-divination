import test from 'node:test';
import assert from 'node:assert/strict';
import { createUploadTask, nextRetryAt } from '../../src/cloud/upload-queue.js';

test('upload task starts immediately with stable identifiers', () => {
  const task = createUploadTask({ readingId: 'gua-1', payload: { question: 'test' }, createdAt: '2026-07-25T00:00:00.000Z' });
  assert.equal(task.id, 'upload:gua-1');
  assert.equal(task.attempts, 0);
  assert.equal(task.nextAttemptAt, '2026-07-25T00:00:00.000Z');
});

test('retry uses capped exponential delay', () => {
  const now = new Date('2026-07-25T00:00:00.000Z');
  assert.equal(nextRetryAt(now, 1), '2026-07-25T00:00:30.000Z');
  assert.equal(nextRetryAt(now, 20), '2026-07-25T06:00:00.000Z');
});
