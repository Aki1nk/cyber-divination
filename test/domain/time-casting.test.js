import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createCalendarAdapter } from '../../src/domain/calendar.js';
import { castTime } from '../../src/domain/casting/time.js';
import { longitudeCorrectionMinutes } from '../../src/domain/solar-time.js';

const require = createRequire(import.meta.url);
const calendar = createCalendarAdapter(require('../../src/vendor/lunar.cjs'));

test('1986-05-29 at 子时 produces the approved totals', () => {
  const result = castTime({ year: 1986, month: 5, day: 29, hour: 0, minute: 0 }, { calendar, dayBoundary: 'midnight', yearBoundary: 'lunar-new-year' });
  assert.equal(result.lunar.month, 4);
  assert.equal(result.lunar.day, 21);
  assert.equal(result.yearBranchNumber, 3);
  assert.deepEqual({ upper: result.upperNumber, lower: result.lowerNumber, moving: result.movingLine }, { upper: 4, lower: 5, moving: 5 });
});

test('23:00 requires an explicit day-boundary choice', () => {
  assert.throws(() => castTime({ year: 2026, month: 7, day: 24, hour: 23, minute: 30 }, { calendar, dayBoundary: null, yearBoundary: 'lunar-new-year' }), /子时换日/);
});

test('longitude correction is four minutes per degree', () => {
  assert.equal(longitudeCorrectionMinutes({ longitude: 121, standardMeridian: 120 }), 4);
});
