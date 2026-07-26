import test from 'node:test';
import assert from 'node:assert/strict';
import { renderAdminLogin, renderAdminDashboard, renderAdminDetail, renderAdminUsers, renderAdminInvites } from '../../src/ui/views/admin.js';

test('admin login never embeds a password value', () => {
  const html = renderAdminLogin({ error: '密码错误' });
  assert.match(html, /type="password"/);
  assert.match(html, /密码错误/);
  assert.doesNotMatch(html, /value="/);
});

test('admin dashboard renders filters, pagination and escaped questions', () => {
  const html = renderAdminDashboard({ items: [{ id: 'reading-1', question: '<script>alert(1)</script>', category: 'career', status: 'completed', created_at: '2026-07-25T00:00:00.000Z', expires_at: '2026-08-24T00:00:00.000Z', risk_level: 'normal', user_nickname: '<林>', user_phone: '13800138000' }], total: 26, page: 1, pageSize: 25 }, { q: '项目', status: '', category: '' });
  assert.match(html, /data-admin-filters/);
  assert.match(html, /下一页/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;林&gt;（13800138000）/);
  assert.doesNotMatch(html, /<林>/);
});

test('admin reading user labels cover missing nickname and legacy records', () => {
  const dashboard = renderAdminDashboard({ items: [{ id: 'reading-2', question: '问题', category: 'general', status: 'completed', created_at: '2026-07-25T00:00:00.000Z', risk_level: 'normal', user_nickname: '', user_phone: '13900139000' }], total: 1, page: 1, pageSize: 25 });
  assert.match(dashboard, /未设置昵称（13900139000）/);
  const detail = renderAdminDetail({ id: 'legacy', status: 'completed' });
  assert.match(detail, /占问用户：旧记录（未关联用户）/);
});

test('admin renders user notes and invitation creation controls', () => {
  const users = renderAdminUsers({ items: [{ id: 'u1', phone: '13800138000', nickname: '林', status: 'active', admin_note: '<内部>' }], total: 1, page: 1, pageSize: 25 });
  assert.match(users, /data-user-edit="u1"/);
  assert.match(users, /&lt;内部&gt;/);
  const invites = renderAdminInvites([{ id: 'i1', code: '天机AB12', status: 'active', expires_at: null }]);
  assert.match(invites, /data-invite-create/);
  assert.match(invites, /data-invite-revoke="i1"/);
});

test('admin detail exposes complete payload and deletion confirmation control', () => {
  const html = renderAdminDetail({ id: 'reading-1', status: 'completed', user_nickname: '林', user_phone: '13800138000', payload: { question: { text: '完整问题', background: '完整背景' }, casting: { hexagram: { originalId: '101111' } } }, aiReading: { overall_judgment: '宜先联调' } });
  assert.match(html, /完整问题/);
  assert.match(html, /完整背景/);
  assert.match(html, /占问用户：林（13800138000）/);
  assert.match(html, /data-admin-delete="reading-1"/);
});
