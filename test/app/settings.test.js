import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSettings, renderSettings } from '../../src/ui/views/settings.js';

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

test('clear records requires an explicit native dialog confirmation', () => {
  const html = renderSettings({}, 3);
  assert.match(html, /<dialog[^>]+data-clear-dialog/);
  assert.match(html, /value="cancel">取消/);
  assert.match(html, /data-confirm-clear>确认清除/);
  assert.match(html, /确认清除 3 条卦录/);
});

test('settings expose privacy boundaries and visible version information', () => {
  const html = renderSettings({}, 0);
  assert.match(html, /href="#\/privacy"/);
  assert.match(html, /隐私与安全边界/);
  assert.match(html, /版本\s+1\.0\.0/);
  assert.match(html, /构建\s+development/);
});
