import { renderAdminDashboard, renderAdminDetail, renderAdminLogin } from './ui/views/admin.js';

const root = document.querySelector('#admin-app');
const state = { q: '', status: '', category: '', page: 1, pageSize: 25 };

async function api(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers ?? {}) } });
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data?.errorCode ?? 'request_failed'), { status: response.status, data });
  return data;
}

function showLogin(error = '') {
  root.innerHTML = renderAdminLogin({ error });
  root.querySelector('[data-admin-login]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button');
    button.disabled = true;
    try {
      await api('/api/admin/session', { method: 'POST', body: JSON.stringify({ password: new FormData(form).get('password') }) });
      await loadList();
    } catch (failure) {
      showLogin(failure.status === 401 ? '密码错误，请重新输入。' : '登录服务暂不可用。');
    }
  });
}

async function loadList() {
  const params = new URLSearchParams({ q: state.q, status: state.status, category: state.category, page: String(state.page), pageSize: String(state.pageSize) });
  try {
    const data = await api(`/api/admin/readings?${params}`);
    root.innerHTML = renderAdminDashboard(data, state);
    bindDashboard();
  } catch (failure) {
    if (failure.status === 401) showLogin();
    else root.innerHTML = '<section class="admin-login"><h1>后台暂不可用</h1><p>请稍后刷新页面重试。</p></section>';
  }
}

function bindDashboard() {
  root.querySelector('[data-admin-filters]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    Object.assign(state, { q: String(data.get('q') ?? ''), status: String(data.get('status') ?? ''), category: String(data.get('category') ?? ''), page: 1 });
    loadList();
  });
  root.querySelectorAll('[data-admin-page]').forEach((button) => button.addEventListener('click', () => { state.page = Number(button.dataset.adminPage); loadList(); }));
  root.querySelectorAll('[data-admin-detail]').forEach((button) => button.addEventListener('click', () => loadDetail(button.dataset.adminDetail)));
  root.querySelector('[data-admin-logout]')?.addEventListener('click', async () => { await api('/api/admin/session', { method: 'DELETE' }); showLogin(); });
}

async function loadDetail(id) {
  try {
    const data = await api(`/api/admin/readings/${encodeURIComponent(id)}`);
    root.innerHTML = renderAdminDetail(data.item);
    root.querySelector('[data-admin-back]')?.addEventListener('click', loadList);
    root.querySelector('[data-admin-delete]')?.addEventListener('click', async () => {
      if (!window.confirm('确认永久删除这条云端记录？此操作不可恢复。')) return;
      await api(`/api/admin/readings/${encodeURIComponent(id)}`, { method: 'DELETE' });
      await loadList();
    });
  } catch (failure) {
    if (failure.status === 401) showLogin();
  }
}

loadList();
