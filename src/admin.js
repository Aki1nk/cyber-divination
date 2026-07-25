import { renderAdminDashboard, renderAdminDetail, renderAdminInvites, renderAdminLogin, renderAdminUserDetail, renderAdminUsers } from './ui/views/admin.js';

const root = document.querySelector('#admin-app');
const readingState = { q: '', status: '', category: '', page: 1, pageSize: 25 };
const userState = { q: '', status: '', page: 1, pageSize: 25 };

async function api(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers ?? {}) } });
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data?.message ?? data?.errorCode ?? 'request_failed'), { status: response.status });
  return data;
}

function bindCommon() {
  root.querySelectorAll('[data-admin-section]').forEach((button) => button.addEventListener('click', () => ({ readings: loadReadings, users: loadUsers, invites: loadInvites }[button.dataset.adminSection]())));
  root.querySelector('[data-admin-logout]')?.addEventListener('click', async () => { await api('/api/admin/session', { method: 'DELETE' }); showLogin(); });
}

function showLogin(error = '') {
  root.innerHTML = renderAdminLogin({ error });
  root.querySelector('[data-admin-login]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    try { await api('/api/admin/session', { method: 'POST', body: JSON.stringify({ password: new FormData(event.currentTarget).get('password') }) }); await loadReadings(); }
    catch (failure) { showLogin(failure.status === 401 ? '密码错误，请重新输入。' : '登录服务暂不可用。'); }
  });
}

async function loadReadings() {
  const params = new URLSearchParams(Object.fromEntries(Object.entries(readingState).map(([key, value]) => [key, String(value)])));
  try {
    const data = await api(`/api/admin/readings?${params}`);
    root.innerHTML = renderAdminDashboard(data, readingState); bindCommon();
    root.querySelector('[data-admin-filters]')?.addEventListener('submit', (event) => { event.preventDefault(); Object.assign(readingState, Object.fromEntries(new FormData(event.currentTarget)), { page: 1 }); loadReadings(); });
    root.querySelectorAll('[data-admin-page]').forEach((button) => button.addEventListener('click', () => { readingState.page = Number(button.dataset.adminPage); loadReadings(); }));
    root.querySelectorAll('[data-admin-detail]').forEach((button) => button.addEventListener('click', () => loadReading(button.dataset.adminDetail)));
  } catch (failure) { failure.status === 401 ? showLogin() : showUnavailable(); }
}

async function loadReading(id) {
  try {
    const { item } = await api(`/api/admin/readings/${encodeURIComponent(id)}`);
    root.innerHTML = renderAdminDetail(item);
    root.querySelector('[data-admin-back]')?.addEventListener('click', loadReadings);
    root.querySelector('[data-admin-delete]')?.addEventListener('click', async () => { if (window.confirm('确认永久删除这条云端记录？')) { await api(`/api/admin/readings/${encodeURIComponent(id)}`, { method: 'DELETE' }); await loadReadings(); } });
  } catch (failure) { if (failure.status === 401) showLogin(); }
}

async function loadUsers() {
  const params = new URLSearchParams(Object.fromEntries(Object.entries(userState).map(([key, value]) => [key, String(value)])));
  try {
    const data = await api(`/api/admin/users?${params}`);
    root.innerHTML = renderAdminUsers(data, userState); bindCommon();
    root.querySelector('[data-user-filters]')?.addEventListener('submit', (event) => { event.preventDefault(); Object.assign(userState, Object.fromEntries(new FormData(event.currentTarget)), { page: 1 }); loadUsers(); });
    root.querySelectorAll('[data-user-edit]').forEach((button) => button.addEventListener('click', () => loadUser(button.dataset.userEdit)));
  } catch (failure) { failure.status === 401 ? showLogin() : showUnavailable(); }
}

async function loadUser(id, error = '') {
  try {
    const { item } = await api(`/api/admin/users/${encodeURIComponent(id)}`);
    root.innerHTML = renderAdminUserDetail(item, error);
    root.querySelector('[data-users-back]')?.addEventListener('click', loadUsers);
    root.querySelector('[data-user-update]')?.addEventListener('submit', async (event) => { event.preventDefault(); await api(`/api/admin/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) }); await loadUsers(); });
    root.querySelector('[data-temp-password]')?.addEventListener('submit', async (event) => { event.preventDefault(); try { await api(`/api/admin/users/${encodeURIComponent(id)}/temporary-password`, { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) }); await loadUser(id, '临时密码已设置，用户下次登录必须修改。'); } catch (failure) { await loadUser(id, failure.message); } });
  } catch (failure) { failure.status === 401 ? showLogin() : showUnavailable(); }
}

async function loadInvites(error = '') {
  try {
    const { items } = await api('/api/admin/invites');
    root.innerHTML = renderAdminInvites(items, error); bindCommon();
    root.querySelector('[data-invite-create]')?.addEventListener('submit', async (event) => {
      event.preventDefault(); const value = Object.fromEntries(new FormData(event.currentTarget));
      if (value.expiresAt) value.expiresAt = new Date(value.expiresAt).toISOString(); else delete value.expiresAt;
      try { await api('/api/admin/invites', { method: 'POST', body: JSON.stringify(value) }); await loadInvites(); } catch (failure) { await loadInvites(failure.message); }
    });
    root.querySelectorAll('[data-invite-revoke]').forEach((button) => button.addEventListener('click', async () => { if (window.confirm('确认作废这个邀请码？')) { await api(`/api/admin/invites/${encodeURIComponent(button.dataset.inviteRevoke)}`, { method: 'DELETE' }); await loadInvites(); } }));
  } catch (failure) { failure.status === 401 ? showLogin() : showUnavailable(); }
}

function showUnavailable() { root.innerHTML = '<section class="admin-login"><h1>后台暂不可用</h1><p>请稍后刷新页面重试。</p></section>'; }
loadReadings();
