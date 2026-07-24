import { parseRoute } from './app/router.js';
import { renderLayout } from './ui/layout.js';
import { renderHome } from './ui/views/home.js';

const app = document.querySelector('#app');

function renderPlaceholder(title, message) {
  return `<section class="placeholder-view"><p>赛博天师</p><h1>${title}</h1><p>${message}</p><a class="text-link" href="#/">返回首页</a></section>`;
}

function routeContent(route) {
  if (route.name === 'home') return renderHome();
  if (route.name === 'ask') return renderPlaceholder('诚心问易', '起卦向导正在就位。');
  if (route.name === 'result') return renderPlaceholder('推演结果', `正在读取卦录 ${route.params.id}。`);
  if (route.name === 'history') return renderPlaceholder('卦录', '仅在此设备保存的占问记录。');
  if (route.name === 'classics') return renderPlaceholder('易经', '六十四卦经典原文索引。');
  return renderPlaceholder('设置', '调整算法口径、动效与隐私选项。');
}

function renderApp() {
  if (!app) return;
  const route = parseRoute(window.location.hash);
  app.innerHTML = renderLayout({ routeName: route.name, content: routeContent(route) });
  app.dataset.ready = 'true';
}

window.addEventListener('hashchange', renderApp);
renderApp();
