import test from 'node:test';
import assert from 'node:assert/strict';

test('privacy page explains local and 30-day cloud data boundaries', async () => {
  let privacyModule;
  try {
    privacyModule = await import('../../src/ui/views/privacy.js');
  } catch {
    assert.fail('缺少应用内隐私与安全页面');
  }

  const html = privacyModule.renderPrivacy();
  assert.match(html, /本地卦录保存在当前设备/);
  assert.match(html, /所有新占问会上传/);
  assert.match(html, /云端记录保留 30 天/);
  assert.match(html, /第三方 AI 中转服务/);
  assert.match(html, /中转服务及其上游供应商/);
  assert.match(html, /定位权限/);
  assert.match(html, /不替代医疗、法律或投资专业意见/);
  assert.match(html, /不预测死亡时间/);
  assert.match(html, /版本\s+1\.0\.0/);
});
