import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSettings } from '../../src/ui/views/settings.js';

test('settings preserve only approved algorithm choices', () => {
  assert.deepEqual(normalizeSettings({ reduceMotion: true, dayBoundary: 'early-zi', yearBoundary: 'lunar-new-year', timeMode: 'civil' }), {
    reduceMotion: true,
    dayBoundary: 'early-zi',
    yearBoundary: 'lunar-new-year',
    timeMode: 'civil',
    algorithmProfile: 'traditional-v1'
  });
  assert.throws(() => normalizeSettings({ dayBoundary: 'silent-auto' }), /不支持/);
});
