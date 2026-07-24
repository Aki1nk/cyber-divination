import { escapeHtml } from '../dom.js';

const METHOD_LABELS = Object.freeze({
  time: '时间起卦',
  'number-pair': '双数起卦',
  'number-triple': '三数起卦',
  'digital-symbol': '现代数字取象',
  external: '外应取象'
});

export function renderHistory(records = []) {
  const content = records.length === 0
    ? `<div class="empty-state"><span>◇</span><h2>尚无卦录</h2><p>完成一次起卦后，不可变结果会仅保存在本机。</p><a class="primary-action" href="#/ask"><span>诚心问易</span></a></div>`
    : `<div class="history-list">${records.map((record) => `
      <a class="history-card" href="#/result/${encodeURIComponent(record.id)}">
        <span class="history-card__symbol">${escapeHtml(record.classics?.original?.symbol ?? '卦')}</span>
        <span class="history-card__content"><strong>${escapeHtml(record.question)}</strong><small>${escapeHtml(METHOD_LABELS[record.method] ?? record.method)} · ${escapeHtml(record.classics?.original?.name ?? '')}</small></span>
        <time datetime="${escapeHtml(record.createdAt)}">${escapeHtml(new Date(record.createdAt).toLocaleDateString('zh-CN'))}</time>
      </a>`).join('')}</div>`;
  return `<section class="secondary-view" aria-labelledby="history-title"><header class="view-heading"><p>仅存本机 · 不可变记录</p><h1 id="history-title">卦录</h1><span>共 ${records.length} 条</span></header>${content}</section>`;
}
