import test from 'node:test';
import assert from 'node:assert/strict';

test('privacy page explains local data, permissions and cultural boundaries', async () => {
  let privacyModule;
  try {
    privacyModule = await import('../../src/ui/views/privacy.js');
  } catch {
    assert.fail('缺少应用内隐私与安全页面');
  }

  const html = privacyModule.renderPrivacy();
  assert.match(html, /所有占问与卦录仅保存在当前设备/);
  assert.match(html, /定位权限/);
  assert.match(html, /不替代医疗、法律或投资专业意见/);
  assert.match(html, /不预测死亡时间/);
  assert.match(html, /版本\s+1\.0\.0/);
});
