import { escapeHtml } from '../dom.js';

function renderNav(active) {
  return `<nav class="admin-tabs" aria-label="后台功能">${[['readings','卦录'],['users','用户'],['invites','邀请码']].map(([key, label]) => `<button type="button" class="secondary-action${active === key ? ' is-active' : ''}" data-admin-section="${key}">${label}</button>`).join('')}</nav>`;
}

function formatReadingUser(item) {
  if (!item.user_phone) return '旧记录（未关联用户）';
  const nickname = String(item.user_nickname ?? '').trim() || '未设置昵称';
  return `${nickname}（${item.user_phone}）`;
}

export function renderAdminLogin({ error = '' } = {}) {
  return `<section class="admin-login"><p>赛博天师 · 管理后台</p><h1>管理员登录</h1><form data-admin-login><label>共享管理密码<input type="password" name="password" autocomplete="current-password" required></label><button class="primary-action primary-action--button" type="submit">登录</button><p role="status" class="admin-status">${escapeHtml(error)}</p></form></section>`;
}

export function renderAdminDashboard(data, filters = {}) {
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  return `<section class="admin-dashboard">
    <header class="admin-heading"><div><p>赛博天师 · 私有数据</p><h1>云端占问记录</h1><span>共 ${escapeHtml(data.total)} 条，自动保留 30 天</span></div><button type="button" class="secondary-action" data-admin-logout>退出</button></header>${renderNav('readings')}
    <form class="admin-filters" data-admin-filters>
      <label>搜索<input name="q" value="${escapeHtml(filters.q ?? '')}" placeholder="问题、背景或匿名设备编号"></label>
      <label>状态<select name="status"><option value="">全部</option>${['pending','processing','completed','failed','refused'].map((value) => `<option value="${value}"${filters.status === value ? ' selected' : ''}>${value}</option>`).join('')}</select></label>
      <label>类别<select name="category"><option value="">全部</option>${['career','relationship','study','travel','general'].map((value) => `<option value="${value}"${filters.category === value ? ' selected' : ''}>${value}</option>`).join('')}</select></label>
      <button class="secondary-action" type="submit">应用筛选</button>
    </form>
    <div class="admin-table-wrap"><table><thead><tr><th>时间</th><th>用户</th><th>问题</th><th>类别</th><th>状态</th><th>风险</th><th></th></tr></thead><tbody>${data.items.map((item) => `<tr><td>${escapeHtml(new Date(item.created_at).toLocaleString('zh-CN'))}</td><td>${escapeHtml(formatReadingUser(item))}</td><td>${escapeHtml(item.question)}</td><td>${escapeHtml(item.category)}</td><td>${escapeHtml(item.status)}</td><td>${escapeHtml(item.risk_level)}</td><td><button type="button" class="secondary-action" data-admin-detail="${escapeHtml(item.id)}">查看</button></td></tr>`).join('') || '<tr><td colspan="7">没有符合条件的记录</td></tr>'}</tbody></table></div>
    <nav class="admin-pagination" aria-label="管理记录分页"><button type="button" class="secondary-action" data-admin-page="${data.page - 1}"${data.page <= 1 ? ' disabled' : ''}>上一页</button><span>第 ${data.page} / ${pages} 页</span><button type="button" class="secondary-action" data-admin-page="${data.page + 1}"${data.page >= pages ? ' disabled' : ''}>下一页</button></nav>
  </section>`;
}

export function renderAdminUsers(data, filters = {}) {
  return `<section class="admin-dashboard"><header class="admin-heading"><div><p>账户管理</p><h1>受邀用户</h1><span>共 ${escapeHtml(data.total)} 个账户</span></div><button type="button" class="secondary-action" data-admin-logout>退出</button></header>${renderNav('users')}<form class="admin-filters" data-user-filters><label>搜索<input name="q" value="${escapeHtml(filters.q ?? '')}" placeholder="手机号、昵称或备注"></label><label>状态<select name="status"><option value="">全部</option>${['active','disabled','deleted'].map((value) => `<option value="${value}"${filters.status === value ? ' selected' : ''}>${value}</option>`).join('')}</select></label><button class="secondary-action" type="submit">筛选</button></form><div class="admin-table-wrap"><table><thead><tr><th>手机号</th><th>昵称</th><th>状态</th><th>备注</th><th></th></tr></thead><tbody>${data.items.map((item) => `<tr><td>${escapeHtml(item.phone)}</td><td>${escapeHtml(item.nickname)}</td><td>${escapeHtml(item.status)}</td><td>${escapeHtml(item.admin_note)}</td><td><button type="button" class="secondary-action" data-user-edit="${escapeHtml(item.id)}">管理</button></td></tr>`).join('') || '<tr><td colspan="5">暂无用户</td></tr>'}</tbody></table></div></section>`;
}

export function renderAdminUserDetail(item, error = '') {
  return `<section class="admin-detail"><header class="admin-heading"><div><p>用户 ${escapeHtml(item.id)}</p><h1>账户设置</h1></div><button type="button" class="secondary-action" data-users-back>返回</button></header><form class="admin-user-form" data-user-update><label>手机号<input name="phone" value="${escapeHtml(item.phone)}" required></label><label>昵称<input name="nickname" value="${escapeHtml(item.nickname)}"></label><label>状态<select name="status">${['active','disabled'].map((value) => `<option value="${value}"${item.status === value ? ' selected' : ''}>${value}</option>`).join('')}</select></label><label>管理员备注<textarea name="adminNote" maxlength="500">${escapeHtml(item.admin_note)}</textarea></label><button class="primary-action primary-action--button" type="submit">保存用户</button></form><form class="admin-user-form" data-temp-password><label>下发临时密码<input type="password" name="password" minlength="8" maxlength="64" required></label><button class="secondary-action" type="submit">设置并强制用户改密</button><p class="admin-status">${escapeHtml(error)}</p></form></section>`;
}

export function renderAdminInvites(items, error = '') {
  return `<section class="admin-dashboard"><header class="admin-heading"><div><p>注册准入</p><h1>邀请码</h1><span>邀请码在此创建，不在 Cloudflare 变量中创建</span></div><button type="button" class="secondary-action" data-admin-logout>退出</button></header>${renderNav('invites')}<form class="admin-filters" data-invite-create><label>邀请码<input name="code" minlength="4" maxlength="64" required></label><label>过期时间（可选）<input type="datetime-local" name="expiresAt"></label><button class="primary-action primary-action--button" type="submit">创建邀请码</button><p class="admin-status">${escapeHtml(error)}</p></form><div class="admin-table-wrap"><table><thead><tr><th>邀请码</th><th>状态</th><th>过期</th><th></th></tr></thead><tbody>${items.map((item) => `<tr><td><code>${escapeHtml(item.code)}</code></td><td>${escapeHtml(item.status)}</td><td>${escapeHtml(item.expires_at || '永不过期')}</td><td>${item.status === 'active' ? `<button type="button" class="danger-action" data-invite-revoke="${escapeHtml(item.id)}">作废</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="4">暂无邀请码</td></tr>'}</tbody></table></div></section>`;
}

export function renderAdminDetail(item) {
  return `<section class="admin-detail"><header class="admin-heading"><div><p>记录 ${escapeHtml(item.id)}</p><h1>完整占问详情</h1><span>占问用户：${escapeHtml(formatReadingUser(item))}</span><span>状态：${escapeHtml(item.status)}</span></div><button type="button" class="secondary-action" data-admin-back>返回列表</button></header>
    <article><h2>完整请求与本地排盘</h2><pre>${escapeHtml(JSON.stringify(item.payload ?? {}, null, 2))}</pre></article>
    <article><h2>AI 深解</h2><pre>${escapeHtml(JSON.stringify(item.aiReading ?? null, null, 2))}</pre></article>
    <article><h2>服务端状态</h2><pre>${escapeHtml(JSON.stringify({ riskLevel: item.risk_level, riskCategories: item.riskCategories, errorCode: item.error_code, providerModel: item.provider_model, createdAt: item.created_at, expiresAt: item.expires_at }, null, 2))}</pre></article>
    <button type="button" class="danger-action" data-admin-delete="${escapeHtml(item.id)}">永久删除这条云端记录</button>
  </section>`;
}
