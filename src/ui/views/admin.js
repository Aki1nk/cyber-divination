import { escapeHtml } from '../dom.js';

export function renderAdminLogin({ error = '' } = {}) {
  return `<section class="admin-login"><p>赛博天师 · 管理后台</p><h1>管理员登录</h1><form data-admin-login><label>共享管理密码<input type="password" name="password" autocomplete="current-password" required></label><button class="primary-action primary-action--button" type="submit">登录</button><p role="status" class="admin-status">${escapeHtml(error)}</p></form></section>`;
}

export function renderAdminDashboard(data, filters = {}) {
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  return `<section class="admin-dashboard">
    <header class="admin-heading"><div><p>赛博天师 · 私有数据</p><h1>云端占问记录</h1><span>共 ${escapeHtml(data.total)} 条，自动保留 30 天</span></div><button type="button" class="secondary-action" data-admin-logout>退出</button></header>
    <form class="admin-filters" data-admin-filters>
      <label>搜索<input name="q" value="${escapeHtml(filters.q ?? '')}" placeholder="问题、背景或匿名设备编号"></label>
      <label>状态<select name="status"><option value="">全部</option>${['pending','processing','completed','failed','refused'].map((value) => `<option value="${value}"${filters.status === value ? ' selected' : ''}>${value}</option>`).join('')}</select></label>
      <label>类别<select name="category"><option value="">全部</option>${['career','relationship','study','travel','general'].map((value) => `<option value="${value}"${filters.category === value ? ' selected' : ''}>${value}</option>`).join('')}</select></label>
      <button class="secondary-action" type="submit">应用筛选</button>
    </form>
    <div class="admin-table-wrap"><table><thead><tr><th>时间</th><th>问题</th><th>类别</th><th>状态</th><th>风险</th><th></th></tr></thead><tbody>${data.items.map((item) => `<tr><td>${escapeHtml(new Date(item.created_at).toLocaleString('zh-CN'))}</td><td>${escapeHtml(item.question)}</td><td>${escapeHtml(item.category)}</td><td>${escapeHtml(item.status)}</td><td>${escapeHtml(item.risk_level)}</td><td><button type="button" class="secondary-action" data-admin-detail="${escapeHtml(item.id)}">查看</button></td></tr>`).join('') || '<tr><td colspan="6">没有符合条件的记录</td></tr>'}</tbody></table></div>
    <nav class="admin-pagination" aria-label="管理记录分页"><button type="button" class="secondary-action" data-admin-page="${data.page - 1}"${data.page <= 1 ? ' disabled' : ''}>上一页</button><span>第 ${data.page} / ${pages} 页</span><button type="button" class="secondary-action" data-admin-page="${data.page + 1}"${data.page >= pages ? ' disabled' : ''}>下一页</button></nav>
  </section>`;
}

export function renderAdminDetail(item) {
  return `<section class="admin-detail"><header class="admin-heading"><div><p>记录 ${escapeHtml(item.id)}</p><h1>完整占问详情</h1><span>状态：${escapeHtml(item.status)}</span></div><button type="button" class="secondary-action" data-admin-back>返回列表</button></header>
    <article><h2>完整请求与本地排盘</h2><pre>${escapeHtml(JSON.stringify(item.payload ?? {}, null, 2))}</pre></article>
    <article><h2>AI 深解</h2><pre>${escapeHtml(JSON.stringify(item.aiReading ?? null, null, 2))}</pre></article>
    <article><h2>服务端状态</h2><pre>${escapeHtml(JSON.stringify({ riskLevel: item.risk_level, riskCategories: item.riskCategories, errorCode: item.error_code, providerModel: item.provider_model, createdAt: item.created_at, expiresAt: item.expires_at }, null, 2))}</pre></article>
    <button type="button" class="danger-action" data-admin-delete="${escapeHtml(item.id)}">永久删除这条云端记录</button>
  </section>`;
}
