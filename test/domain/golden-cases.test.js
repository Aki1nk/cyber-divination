import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { castNumberPair, castNumberTriple } from '../../src/domain/casting/number.js';
import { castExternal } from '../../src/domain/casting/external.js';
import { castTime } from '../../src/domain/casting/time.js';
import { createCalendarAdapter } from '../../src/domain/calendar.js';
import { deriveHexagram } from '../../src/domain/hexagrams.js';
import { createClassicsIndex } from '../../src/data/classics.js';
import { classifyRisk } from '../../src/domain/risk.js';
import { readFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const calendar = createCalendarAdapter(require('../../src/vendor/lunar.cjs'));

test('remainder-zero and very large values stay exact', () => {
  assert.deepEqual(castNumberPair('8', '16'), { profileId: 'number-pair-v1', upperNumber: 8, lowerNumber: 8, movingLine: 6, raw: ['8', '16'] });
  assert.equal(castNumberPair('900719925474099312345', '8').upperNumber, 1);
});

test('pair and triple profiles preserve distinct moving-line rules', () => {
  assert.equal(castNumberPair('9', '16').movingLine, 1);
  assert.equal(castNumberTriple('9', '16', '7').movingLine, 1);
  assert.equal(castNumberTriple('9', '16', '12').movingLine, 6);
});

test('calendar golden cases preserve approved totals, day boundary and leap month', () => {
  const approved = castTime({ year: 1986, month: 5, day: 29, hour: 0, minute: 0 }, { calendar, dayBoundary: 'midnight' });
  assert.deepEqual([approved.upperNumber, approved.lowerNumber, approved.movingLine], [4, 5, 5]);

  const midnight = castTime({ year: 2026, month: 7, day: 24, hour: 23, minute: 30 }, { calendar, dayBoundary: 'midnight' });
  const earlyZi = castTime({ year: 2026, month: 7, day: 24, hour: 23, minute: 30 }, { calendar, dayBoundary: 'early-zi' });
  assert.equal(midnight.lunar.adjustedDate.day, 24);
  assert.equal(earlyZi.lunar.adjustedDate.day, 25);

  const leap = calendar.convert({ year: 2020, month: 5, day: 23, hour: 12, minute: 0 }, { dayBoundary: 'midnight' });
  assert.equal(leap.isLeapMonth, true);
  assert.equal(leap.month, 4);
});

test('external directions and body-use placement remain deterministic', () => {
  const movingLines = [1, 2, 3, 4].map((directionTrigram) => castExternal({ objectTrigram: 1, directionTrigram, count: '1', hourBranchNumber: 1, confirmed: true }).movingLine);
  assert.deepEqual(movingLines, [3, 4, 5, 6]);

  const lowerMoving = deriveHexagram({ upperNumber: 1, lowerNumber: 8, movingLine: 2 });
  const upperMoving = deriveHexagram({ upperNumber: 1, lowerNumber: 8, movingLine: 5 });
  assert.equal(lowerMoving.body.number, 1);
  assert.equal(lowerMoving.use.number, 8);
  assert.equal(upperMoving.body.number, 8);
  assert.equal(upperMoving.use.number, 1);
});

test('special lines and high-risk boundaries are retained', async () => {
  const records = JSON.parse(await readFile('src/vendor/64gua.json', 'utf8'));
  const classics = createClassicsIndex(records);
  assert.match(classics.get('111111').specialLines[0].text, /用九/);
  assert.match(classics.get('000000').specialLines[0].text, /用六/);
  assert.equal(classifyRisk('这个药能不能治好我的病').level, 'high');
  assert.equal(classifyRisk('我现在想自杀').level, 'urgent');
});
