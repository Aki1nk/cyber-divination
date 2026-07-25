import { parseRoute, routeForSession } from './app/router.js';
import { createCastController } from './app/cast-controller.js';
import { createCalendarAdapter } from './domain/calendar.js';
import { createClassicsIndex } from './data/classics.js';
import { createRepository } from './storage/repository.js';
import { getOrCreateDeviceId } from './cloud/device-id.js';
import { createReadingsClient } from './cloud/readings-client.js';
import { createAuthClient } from './cloud/auth-client.js';
import { createSyncManager } from './cloud/sync-manager.js';
import { renderLayout } from './ui/layout.js';
import { renderHome } from './ui/views/home.js';
import { renderAsk } from './ui/views/ask.js';
import { renderRitual } from './ui/views/ritual.js';
import { renderResult } from './ui/views/result.js';
import { renderHistory } from './ui/views/history.js';
import { filterClassics, renderClassics, renderClassicsList } from './ui/views/classics.js';
import { renderPrivacy } from './ui/views/privacy.js';
import { DEFAULT_SETTINGS, normalizeSettings, renderSettings } from './ui/views/settings.js';
import { renderAuth } from './ui/views/auth.js';
import { renderAccount } from './ui/views/account.js';

const app = document.querySelector('#app');
const repository = createRepository(window.localStorage);
const deviceId = getOrCreateDeviceId(window.localStorage);
const authClient = createAuthClient();
let currentUser;
const syncManager = createSyncManager({
  repository,
  deviceId,
  getAccountId: () => currentUser?.id ?? null,
  client: createReadingsClient(),
  onRecordUpdated(recordId) {
    if (window.location.hash === `#/result/${encodeURIComponent(recordId)}`) renderApp();
  }
});
let controllerPromise;
let classicsDataPromise;
let currentClassics = [];

async function getClassicsData() {
  if (!classicsDataPromise) {
    classicsDataPromise = fetch('/src/vendor/64gua.json')
      .then((response) => {
        if (!response.ok) throw new Error('经典数据加载失败');
        return response.json();
      })
      .then((records) => {
        const index = createClassicsIndex(records);
        return { index, classics: [...index.values()] };
      });
  }
  return classicsDataPromise;
}

async function getController() {
  if (!controllerPromise) {
    controllerPromise = getClassicsData().then(({ index }) => createCastController({
        repository,
        calendar: createCalendarAdapter({ Solar: globalThis.Solar }),
        classicsIndex: index,
        onRecordSaved: async (record) => {
          await syncManager.queue(record);
          await syncManager.flush();
        }
      }));
  }
  return controllerPromise;
}

function renderPlaceholder(title, message) {
  return `<section class="placeholder-view"><p>赛博天师</p><h1>${title}</h1><p>${message}</p><a class="text-link" href="#/">返回首页</a></section>`;
}

async function routeContent(route) {
  if (route.name === 'login') return renderAuth();
  if (route.name === 'account') return renderAccount(currentUser);
  if (route.name === 'home') return renderHome();
  if (route.name === 'ask') return renderAsk();
  if (route.name === 'result') {
    const record = await repository.getRecord(route.params.id);
    return record ? renderResult(record) : renderPlaceholder('未找到卦录', '该记录可能已被清除，或不属于当前设备。');
  }
  if (route.name === 'history') return renderHistory(await repository.listRecords());
  if (route.name === 'classics') {
    currentClassics = (await getClassicsData()).classics;
    return renderClassics(currentClassics);
  }
  if (route.name === 'privacy') return renderPrivacy();
  const [settings, records] = await Promise.all([repository.getSettings(), repository.listRecords()]);
  return renderSettings(settings, records.length);
}

function authError(error) {
  if (error.code === 'invalid_credentials') return '手机号或密码错误。';
  if (error.code === 'too_many_attempts') return '尝试次数过多，请 15 分钟后再试。';
  if (error.code === 'invalid_invite') return '邀请码无效、已使用或已过期。';
  if (error.code === 'phone_in_use') return '该手机号已注册，请直接登录。';
  return error.message || '操作未完成，请稍后重试。';
}

function bindAuthView() {
  app.querySelectorAll('[data-auth-mode]').forEach((button) => button.addEventListener('click', () => {
    app.innerHTML = renderLayout({ routeName: 'login', content: renderAuth({ mode: button.dataset.authMode }), authenticated: false });
    bindAuthView();
  }));
  app.querySelector('[data-auth-form]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    form.querySelector('button[type="submit"]').disabled = true;
    try {
      const result = form.dataset.authForm === 'register' ? await authClient.register(data) : await authClient.login(data);
      currentUser = result.user;
      window.location.hash = currentUser.mustChangePassword ? '#/account' : '#/';
      await renderApp();
      if (!currentUser.mustChangePassword) syncManager.flush().catch(() => {});
    } catch (error) {
      app.innerHTML = renderLayout({ routeName: 'login', content: renderAuth({ mode: form.dataset.authForm, error: authError(error) }), authenticated: false });
      bindAuthView();
    }
  });
}

function bindAccountView() {
  app.querySelector('[data-change-password]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await authClient.changePassword(data);
      currentUser = { ...currentUser, mustChangePassword: false };
      app.innerHTML = renderLayout({ routeName: 'account', content: renderAccount(currentUser, { success: '密码已更新。' }) });
      bindAccountView();
    } catch (error) {
      app.innerHTML = renderLayout({ routeName: 'account', content: renderAccount(currentUser, { error: authError(error) }) });
      bindAccountView();
    }
  });
  app.querySelector('[data-user-logout]')?.addEventListener('click', async () => {
    await authClient.logout(); currentUser = null; window.location.hash = '#/login'; await renderApp();
  });
  app.querySelector('[data-delete-account]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!window.confirm('确认永久注销账户？')) return;
    try {
      await authClient.deleteAccount(Object.fromEntries(new FormData(event.currentTarget)));
      currentUser = null; window.location.hash = '#/login'; await renderApp();
    } catch (error) {
      app.innerHTML = renderLayout({ routeName: 'account', content: renderAccount(currentUser, { error: authError(error) }) });
      bindAccountView();
    }
  });
}

function bindResultTabs() {
  const tabs = [...app.querySelectorAll('[data-result-tab]')];
  const panels = [...app.querySelectorAll('[data-result-panel]')];
  if (tabs.length === 0) return;

  function selectTab(index, moveFocus = false) {
    tabs.forEach((tab, tabIndex) => {
      const selected = tabIndex === index;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      panels[tabIndex].hidden = !selected;
    });
    if (moveFocus) tabs[index].focus();
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(index));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const offset = event.key === 'ArrowRight' ? 1 : -1;
      selectTab((index + offset + tabs.length) % tabs.length, true);
    });
  });

  app.querySelector('[data-ai-retry]')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const record = await repository.getRecord(button.dataset.aiRetry);
    if (!record) return;
    button.disabled = true;
    button.textContent = '正在重试…';
    try {
      await syncManager.retryRecord(record);
    } catch (error) {
      await repository.patchRecord(record.id, { ai: { ...record.ai, status: 'failed', errorCode: error.message, updatedAt: new Date().toISOString() } });
    }
    await renderApp();
  });
}

function bindClassicsView() {
  const input = app.querySelector('[data-classics-search]');
  const list = app.querySelector('[data-classics-list]');
  if (!input || !list) return;
  input.addEventListener('input', () => {
    list.innerHTML = renderClassicsList(filterClassics(currentClassics, input.value));
  });
}

function bindSettingsView() {
  const form = app.querySelector('[data-settings-form]');
  const dialog = app.querySelector('[data-clear-dialog]');
  if (!form || !dialog) return;
  const status = form.querySelector('[data-settings-status]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const data = new FormData(form);
      const settings = normalizeSettings({
        reduceMotion: data.get('reduceMotion') === 'on',
        dayBoundary: data.get('dayBoundary'),
        yearBoundary: data.get('yearBoundary'),
        timeMode: data.get('timeMode'),
        algorithmProfile: data.get('algorithmProfile')
      });
      await repository.saveSettings(settings);
      document.documentElement.dataset.reduceMotion = String(settings.reduceMotion);
      status.textContent = '设置已保存于本机。';
    } catch (error) {
      status.textContent = error.message;
    }
  });

  app.querySelector('[data-reset-settings]')?.addEventListener('click', async () => {
    await repository.saveSettings(DEFAULT_SETTINGS);
    document.documentElement.dataset.reduceMotion = 'false';
    await renderApp();
  });
  app.querySelector('[data-open-clear]')?.addEventListener('click', () => dialog.showModal());
  app.querySelector('[data-confirm-clear]')?.addEventListener('click', async (event) => {
    event.preventDefault();
    await repository.clearRecords();
    dialog.close();
    await renderApp();
  });
}

function methodInputs(form, data, method) {
  if (method === 'number-pair') return { first: data.get('first'), second: data.get('second') };
  if (method === 'number-triple') return { first: data.get('tripleFirst'), second: data.get('tripleSecond'), third: data.get('third') };
  if (method === 'digital-symbol') return {};
  if (method === 'external') {
    return {
      objectTrigram: data.get('objectTrigram'),
      directionTrigram: data.get('directionTrigram'),
      count: data.get('count'),
      hourBranchNumber: data.get('hourBranchNumber'),
      confirmed: data.get('confirmed') === 'on'
    };
  }
  return {
    year: data.get('year'),
    month: data.get('month'),
    day: data.get('day'),
    hour: data.get('hour'),
    minute: data.get('minute'),
    dayBoundary: data.get('dayBoundary'),
    yearBoundary: data.get('yearBoundary'),
    timezone: data.get('timezone'),
    trueSolar: data.get('trueSolar') === 'on',
    longitude: data.get('longitude'),
    cityLabel: data.get('cityLabel'),
    utcOffsetHours: data.get('utcOffsetHours')
  };
}

function bindAskView() {
  const form = app.querySelector('[data-casting-form]');
  if (!form) return;
  const methodRadios = [...form.querySelectorAll('input[name="method"]')];
  const panels = [...form.querySelectorAll('[data-method-panel]')];
  const solarToggle = form.querySelector('input[name="trueSolar"]');
  const solarFields = form.querySelector('[data-solar-fields]');
  const locationButton = form.querySelector('[data-location]');

  function syncMethod() {
    const method = methodRadios.find((radio) => radio.checked)?.value;
    panels.forEach((panel) => { panel.hidden = panel.dataset.methodPanel !== method; });
  }

  methodRadios.forEach((radio) => radio.addEventListener('change', syncMethod));
  solarToggle?.addEventListener('change', () => { solarFields.hidden = !solarToggle.checked; });
  locationButton?.addEventListener('click', () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => {
      form.elements.longitude.value = position.coords.longitude.toFixed(4);
      form.elements.cityLabel.value = '当前位置';
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = form.querySelector('[data-form-status]');
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    status.textContent = '正在校验并生成不可变快照…';
    try {
      const data = new FormData(form);
      const method = data.get('method');
      const controller = await getController();
      const record = await controller.cast({
        question: data.get('question'),
        category: data.get('category'),
        background: data.get('background'),
        method,
        inputs: methodInputs(form, data, method)
      });
      app.innerHTML = renderLayout({ routeName: 'ask', content: renderRitual(record) });
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.setTimeout(() => { window.location.hash = `#/result/${encodeURIComponent(record.id)}`; }, reduceMotion ? 0 : 1200);
    } catch (error) {
      status.textContent = error.message;
      submit.disabled = false;
    }
  });

  syncMethod();
}

async function renderApp() {
  if (!app) return;
  if (currentUser === undefined) currentUser = await authClient.session().catch(() => null);
  const requested = parseRoute(window.location.hash);
  const route = routeForSession(requested, currentUser);
  if (route.name !== requested.name) {
    window.location.hash = route.name === 'home' ? '#/' : `#/${route.name}`;
    return;
  }
  app.innerHTML = renderLayout({ routeName: route.name, content: await routeContent(route), authenticated: Boolean(currentUser) });
  app.dataset.ready = 'true';
  if (route.name === 'login') bindAuthView();
  if (route.name === 'account') bindAccountView();
  if (route.name === 'ask') bindAskView();
  if (route.name === 'result') bindResultTabs();
  if (route.name === 'classics') bindClassicsView();
  if (route.name === 'settings') bindSettingsView();
}

window.addEventListener('hashchange', renderApp);
renderApp().then(() => { if (currentUser && !currentUser.mustChangePassword) syncManager.flush().catch(() => {}); });
window.addEventListener('online', () => { if (currentUser && !currentUser.mustChangePassword) syncManager.flush().catch(() => {}); });
window.setInterval(() => { if (currentUser && !currentUser.mustChangePassword) syncManager.flush().catch(() => {}); }, 60_000);

const canRegisterServiceWorker = 'serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname));
if (canRegisterServiceWorker) {
  navigator.serviceWorker.register('/sw.js').catch((error) => {
    console.warn('Service Worker 注册失败，应用仍可在线运行。', error);
  });
}
