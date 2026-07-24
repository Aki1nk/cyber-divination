import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute } from '../../src/app/router.js';
import { createSession, transition } from '../../src/app/session.js';

test('parseRoute recognizes result ids and navigation pages', () => {
  assert.deepEqual(parseRoute('#/result/gua-1'), { name: 'result', params: { id: 'gua-1' } });
  assert.deepEqual(parseRoute('#/classics'), { name: 'classics', params: {} });
  assert.deepEqual(parseRoute('#/privacy'), { name: 'privacy', params: {} });
  assert.deepEqual(parseRoute('#/unknown'), { name: 'home', params: {} });
});

test('session cannot cast before question and method are confirmed', () => {
  const session = createSession();
  assert.throws(() => transition(session, { type: 'CAST' }), /尚未确认/);
});

test('session creates an immutable confirmation snapshot', () => {
  let session = createSession();
  session = transition(session, { type: 'SET_QUESTION', question: '未来三个月是否适合推进当前职业选择？', category: 'career' });
  session = transition(session, { type: 'SET_METHOD', method: 'number-pair' });
  session = transition(session, { type: 'SET_INPUT', inputs: { first: '9', second: '16' } });
  session = transition(session, { type: 'CONFIRM' });

  assert.equal(session.stage, 'confirmed');
  assert.ok(Object.isFrozen(session.snapshot));
  assert.ok(Object.isFrozen(session.snapshot.inputs));
});
