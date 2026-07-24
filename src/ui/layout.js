const NAV_ITEMS = Object.freeze([
  { route: 'home', href: '#/', icon: '卦', label: '问易' },
  { route: 'history', href: '#/history', icon: '录', label: '卦录' },
  { route: 'classics', href: '#/classics', icon: '经', label: '易经' },
  { route: 'settings', href: '#/settings', icon: '设', label: '设置' }
]);

export function renderLayout({ routeName, content }) {
  const nav = NAV_ITEMS.map((item) => `
    <a class="bottom-nav__link${item.route === routeName ? ' is-active' : ''}" href="${item.href}" ${item.route === routeName ? 'aria-current="page"' : ''}>
      <span class="bottom-nav__icon" aria-hidden="true">${item.icon}</span>
      <span>${item.label}</span>
    </a>`).join('');

  return `
    <div class="app-shell">
      <header class="top-bar">
        <a class="brand" href="#/" aria-label="赛博天师首页">
          <span class="brand__seal" aria-hidden="true">易</span>
          <span><strong>赛博天师</strong><small>梅花易数 · 易经推演</small></span>
        </a>
        <span class="local-badge">本地推演</span>
      </header>
      <main id="main-content" class="main-content" tabindex="-1">${content}</main>
      <nav class="bottom-nav" aria-label="主导航">${nav}</nav>
    </div>`;
}
