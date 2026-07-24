import { parseRoute } from './app/router.js';
import { createCastController } from './app/cast-controller.js';
import { createCalendarAdapter } from './domain/calendar.js';
import { createClassicsIndex } from './data/classics.js';
import { createRepository } from './storage/repository.js';
import { renderLayout } from './ui/layout.js';
import { renderHome } from './ui/views/home.js';
import { renderAsk } from './ui/views/ask.js';
import { renderRitual } from './ui/views/ritual.js';
import { renderResult } from './ui/views/result.js';

const app = document.querySelector('#app');
const repository = createRepository(window.localStorage);
let controllerPromise;

async function getController() {
  if (!controllerPromise) {
    controllerPromise = fetch('/src/vendor/64gua.json')
      .then((response) => {
        if (!response.ok) throw new Error('经典数据加载失败');
        return response.json();
      })
      .then((records) => createCastController({
        repository,
        calendar: createCalendarAdapter({ Solar: globalThis.Solar }),
        classicsIndex: createClassicsIndex(records)
      }));
  }
  return controllerPromise;
}

function renderPlaceholder(title, message) {
  return `<section class="placeholder-view"><p>赛博天师</p><h1>${title}</h1><p>${message}</p><a class="text-link" href="#/">返回首页</a></section>`;
}

async function routeContent(route) {
  if (route.name === 'home') return renderHome();
  if (route.name === 'ask') return renderAsk();
  if (route.name === 'result') {
    const record = await repository.getRecord(route.params.id);
    return record ? renderResult(record) : renderPlaceholder('未找到卦录', '该记录可能已被清除，或不属于当前设备。');
  }
  if (route.name === 'history') return renderPlaceholder('卦录', '仅在此设备保存的占问记录。');
  if (route.name === 'classics') return renderPlaceholder('易经', '六十四卦经典原文索引。');
  return renderPlaceholder('设置', '调整算法口径、动效与隐私选项。');
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
  const route = parseRoute(window.location.hash);
  app.innerHTML = renderLayout({ routeName: route.name, content: await routeContent(route) });
  app.dataset.ready = 'true';
  if (route.name === 'ask') bindAskView();
  if (route.name === 'result') bindResultTabs();
}

window.addEventListener('hashchange', renderApp);
renderApp();
