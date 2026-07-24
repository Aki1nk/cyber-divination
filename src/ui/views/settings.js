import { escapeHtml } from '../dom.js';

export const DEFAULT_SETTINGS = Object.freeze({
  reduceMotion: false,
  dayBoundary: 'midnight',
  yearBoundary: 'lunar-new-year',
  timeMode: 'civil',
  algorithmProfile: 'traditional-v1'
});

const ALLOWED = Object.freeze({
  dayBoundary: ['midnight', 'early-zi'],
  yearBoundary: ['lunar-new-year', 'start-of-spring'],
  timeMode: ['civil', 'true-solar'],
  algorithmProfile: ['traditional-v1']
});

export function normalizeSettings(input = {}) {
  const settings = { ...DEFAULT_SETTINGS, ...input, reduceMotion: Boolean(input.reduceMotion) };
  for (const [key, values] of Object.entries(ALLOWED)) {
    if (!values.includes(settings[key])) throw new RangeError(`不支持的设置：${key}=${settings[key]}`);
  }
  return {
    reduceMotion: settings.reduceMotion,
    dayBoundary: settings.dayBoundary,
    yearBoundary: settings.yearBoundary,
    timeMode: settings.timeMode,
    algorithmProfile: settings.algorithmProfile
  };
}

function selected(actual, value) {
  return actual === value ? 'selected' : '';
}

export function renderSettings(settingsInput = {}, recordCount = 0) {
  const settings = normalizeSettings(settingsInput);
  return `<section class="secondary-view settings-view" aria-labelledby="settings-title"><header class="view-heading"><p>传统档案 · 本地隐私</p><h1 id="settings-title">设置</h1><span>所有选择仅保存在此设备</span></header>
    <form class="settings-form" data-settings-form>
      <article><h2>算法档案</h2><label>默认档案<select name="algorithmProfile"><option value="traditional-v1" selected>传统口径 v1</option></select></label><p>算法档案具名并版本化，既有卦录不会随设置变化。</p></article>
      <article><h2>时间口径</h2><label>默认时间模式<select name="timeMode"><option value="civil" ${selected(settings.timeMode, 'civil')}>民用时间</option><option value="true-solar" ${selected(settings.timeMode, 'true-solar')}>真太阳时</option></select></label><label>年界<select name="yearBoundary"><option value="lunar-new-year" ${selected(settings.yearBoundary, 'lunar-new-year')}>农历新年</option><option value="start-of-spring" ${selected(settings.yearBoundary, 'start-of-spring')}>立春</option></select></label><label>子时换日<select name="dayBoundary"><option value="midnight" ${selected(settings.dayBoundary, 'midnight')}>午夜换日</option><option value="early-zi" ${selected(settings.dayBoundary, 'early-zi')}>早子时换日</option></select></label></article>
      <article><h2>显示与动效</h2><label class="switch-row"><input type="checkbox" name="reduceMotion" ${settings.reduceMotion ? 'checked' : ''}><span>减少动态效果</span></label></article>
      <div class="settings-actions"><button class="primary-action primary-action--button" type="submit"><span>保存设置</span></button><button class="secondary-action" type="button" data-reset-settings>恢复默认</button><p role="status" data-settings-status></p></div>
    </form>
    <article class="danger-zone"><h2>本机数据</h2><p>当前共有 ${recordCount} 条卦录。首版不提供导出或云同步。</p><button type="button" data-open-clear>清除全部卦录</button></article>
    <dialog class="clear-dialog" data-clear-dialog><form method="dialog"><h2>确认清除 ${recordCount} 条卦录？</h2><p>此操作不可撤销，设置将会保留。</p><div><button value="cancel">取消</button><button value="confirm" data-confirm-clear>确认清除</button></div></form></dialog>
  </section>`;
}
