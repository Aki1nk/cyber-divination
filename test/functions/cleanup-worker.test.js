import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../../cleanup-worker/src/index.js';

test('scheduled worker deletes expired rows without selecting private content', async () => {
  const statements = [];
  const db = { prepare(sql) { statements.push(sql); return { run: async () => ({ meta: { changes: 2 } }) }; } };
  let task;
  worker.scheduled({}, { DB: db }, { waitUntil(value) { task = value; } });
  await task;
  assert.equal(statements.length, 4);
  assert.match(statements[0], /^DELETE FROM readings/);
  assert.match(statements[1], /^DELETE FROM ai_attempts/);
  assert.match(statements[2], /^DELETE FROM user_sessions/);
  assert.match(statements[3], /^DELETE FROM login_attempts/);
  assert.equal(statements.join(' ').includes('question'), false);
});
