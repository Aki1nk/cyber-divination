import test from 'node:test';
import assert from 'node:assert/strict';
import { renderAdminLogin, renderAdminDashboard, renderAdminDetail } from '../../src/ui/views/admin.js';

test('admin login never embeds a password value', () => {
  const html = renderAdminLogin({ error: '密码错误' });
  assert.match(html, /type="password"/);
  assert.match(html, /密码错误/);
  assert.doesNotMatch(html, /value="/);
});

test('admin dashboard renders filters, pagination and escaped questions', () => {
  const html = renderAdminDashboard({ items: [{ id: 'reading-1', question: '<script>alert(1)</script>', category: 'career', status: 'completed', created_at: '2026-07-25T00:00:00.000Z', expires_at: '2026-08-24T00:00:00.000Z', risk_level: 'normal' }], total: 26, page: 1, pageSize: 25 }, { q: '项目', status: '', category: '' });
  assert.match(html, /data-admin-filters/);
  assert.match(html, /下一页/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>alert/);
});

test('admin detail exposes complete payload and deletion confirmation control', () => {
  const html = renderAdminDetail({ id: 'reading-1', status: 'completed', payload: { question: { text: '完整问题', background: '完整背景' }, casting: { hexagram: { originalId: '101111' } } }, aiReading: { overall_judgment: '宜先联调' } });
  assert.match(html, /完整问题/);
  assert.match(html, /完整背景/);
  assert.match(html, /data-admin-delete="reading-1"/);
});
