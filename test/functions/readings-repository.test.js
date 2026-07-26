import test from 'node:test';
import assert from 'node:assert/strict';
import { createReadingsRepository } from '../../functions/_lib/readings-repository.js';

function fakeDb(results = []) {
  const calls = [];
  return { calls, prepare(sql) { const call = { sql, values: [] }; calls.push(call); return { bind(...values) { call.values = values; return this; }, first: async () => results.shift() ?? null, all: async () => results.shift() ?? { results: [] }, run: async () => results.shift() ?? { success: true, meta: { changes: 1 } } }; } };
}

test('repository creates a 30-day expiring reading', async () => {
  const db = fakeDb();
  const repository = createReadingsRepository(db, { now: () => new Date('2026-07-25T00:00:00.000Z'), idFactory: () => 'reading-1' });
  const row = await repository.create({ idempotencyKey: 'gua-1', deviceId: 'device-1', question: { text: '项目是否排期？', background: '', category: 'career' } }, { level: 'normal', categories: [] }, 'user-1');
  assert.equal(row.id, 'reading-1');
  assert.equal(row.expiresAt, '2026-08-24T00:00:00.000Z');
  assert.match(db.calls[0].sql, /INSERT INTO readings/);
  assert.equal(db.calls[0].values[1], 'user-1');
  assert.match(db.calls[0].values.at(-1), /question/);
});

test('repository filters admin list with bounded pagination', async () => {
  const db = fakeDb([{ count: 0 }, { results: [] }]);
  const result = await createReadingsRepository(db).list({ q: '项目', status: 'completed', category: 'career', page: 2, pageSize: 500 });
  assert.equal(result.pageSize, 100);
  assert.match(db.calls[0].sql, /question LIKE/);
  assert.equal(db.calls[1].values.at(-2), 100);
});

test('repository joins users for admin reading list and detail', async () => {
  const db = fakeDb([
    { count: 1 },
    { results: [{ id: 'reading-1', user_nickname: '林', user_phone: '13800138000' }] },
    { id: 'reading-1', user_nickname: '林', user_phone: '13800138000' }
  ]);
  const repository = createReadingsRepository(db);

  const list = await repository.list();
  const detail = await repository.getAdmin('reading-1');

  assert.match(db.calls[0].sql, /LEFT JOIN users/);
  assert.match(db.calls[1].sql, /users\.nickname AS user_nickname/);
  assert.match(db.calls[2].sql, /LEFT JOIN users/);
  assert.equal(list.items[0].user_phone, '13800138000');
  assert.equal(detail.user_nickname, '林');
});

test('repository treats admin search wildcards as literal text', async () => {
  const db = fakeDb([{ count: 0 }, { results: [] }]);
  await createReadingsRepository(db).list({ q: '100%_完成' });
  assert.equal(db.calls[0].values[0], '%100\\%\\_完成%');
  assert.match(db.calls[0].sql, /ESCAPE/);
});
