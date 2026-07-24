import { escapeHtml } from '../dom.js';

export function filterClassics(classics, query = '') {
  const normalized = String(query).trim().toLowerCase();
  if (!normalized) return [...classics];
  return classics.filter((classic) => classic.name.toLowerCase().includes(normalized) || classic.id.includes(normalized));
}

export function renderClassicsList(classics) {
  if (classics.length === 0) return `<div class="empty-state"><h2>未找到相符卦象</h2><p>可输入卦名或六位阴阳 ID。</p></div>`;
  return classics.map((classic) => `
    <details class="classic-card">
      <summary><span>${escapeHtml(classic.symbol)}</span><strong>${escapeHtml(classic.name)}</strong><code>${escapeHtml(classic.id)}</code></summary>
      <div class="classic-card__body"><p class="classic-judgment">${escapeHtml(classic.judgment)}</p><p><strong>大象：</strong>${escapeHtml(classic.image)}</p><ol>${classic.lineTexts.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ol>${classic.specialLines.map((line) => `<p class="special-line">${escapeHtml(line.text)}</p>`).join('')}</div>
    </details>`).join('');
}

export function renderClassics(classics) {
  return `<section class="secondary-view" aria-labelledby="classics-title"><header class="view-heading"><p>经典原文 · 六十四卦</p><h1 id="classics-title">易经</h1><span>原文与推演解释分层呈现</span></header><label class="search-field">检索卦名或六位 ID<input type="search" data-classics-search placeholder="例如：乾 / 111111"></label><div class="classics-list" data-classics-list>${renderClassicsList(classics)}</div></section>`;
}
