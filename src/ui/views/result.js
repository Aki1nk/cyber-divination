import { escapeHtml } from '../dom.js';
import { renderHexagramLines } from '../components/hexagram-lines.js';
import { renderReasonList } from '../components/reason-list.js';
import { renderRiskBanner } from '../components/risk-banner.js';

export function createResultModel(record) {
  return Object.freeze({
    question: record.question,
    createdAt: record.createdAt,
    risk: record.risk ?? { level: 'normal', categories: [] },
    tabs: Object.freeze({
      summary: { sections: record.interpretation?.sections ?? [] },
      hexagram: {
        original: record.classics?.original,
        mutual: record.classics?.mutual,
        changed: record.classics?.changed,
        originalLines: record.hexagram?.originalLines ?? [],
        mutualLines: record.hexagram?.mutualLines ?? [],
        changedLines: record.hexagram?.changedLines ?? [],
        movingLine: record.hexagram?.movingLine,
        fiveElements: record.fiveElements ?? {}
      },
      classics: {
        originalName: record.classics?.original?.name ?? '',
        originalGuaCi: record.classics?.original?.guaCi ?? '',
        mutualName: record.classics?.mutual?.name ?? '',
        mutualGuaCi: record.classics?.mutual?.guaCi ?? '',
        changedName: record.classics?.changed?.name ?? '',
        changedGuaCi: record.classics?.changed?.guaCi ?? '',
        movingLine: record.classics?.movingLine ?? ''
      },
      evidence: {
        rows: record.calculationLog ?? [],
        algorithm: record.algorithm ?? {},
        rawInputs: record.rawInputs ?? {},
        timeBasis: record.timeBasis,
        schemaVersion: record.schemaVersion,
        questionContext: record.interpretation?.questionContext ?? null,
        interpretationProfile: record.interpretation?.profileId ?? 'local-deterministic-v1',
      }
    })
  });
}

function renderSummary(model) {
  return model.tabs.summary.sections.map((section) => {
    const classes = ['interpretation-card'];
    if (section.id === 'verdict') classes.push('interpretation-card--verdict');
    if (['action', 'action_order', 'avoid_and_verify'].includes(section.id)) classes.push('interpretation-card--action');
    const inlineRisk = ['action', 'action_order'].includes(section.id) ? renderRiskBanner(model.risk) : '';

    return `
    <article class="${classes.join(' ')}">
      <h2>${escapeHtml(section.title ?? section.id)}</h2>
      ${inlineRisk}
      <p>${escapeHtml(section.text)}</p>
      ${renderReasonList(section.reasonKeys)}
    </article>`;
  }).join('');
}

function renderHexagrams(model) {
  const tab = model.tabs.hexagram;
  const cards = [
    ['本卦', tab.original, tab.originalLines, tab.movingLine],
    ['互卦', tab.mutual, tab.mutualLines, null],
    ['变卦', tab.changed, tab.changedLines, null]
  ];
  return `<div class="hexagram-grid">${cards.map(([label, classic, lines, moving]) => `
    <article class="hexagram-card"><span>${label}</span><h2>${escapeHtml(classic?.symbol ?? '')} ${escapeHtml(classic?.name ?? '')}</h2>${renderHexagramLines(lines, moving)}</article>`).join('')}</div>
    <dl class="relation-grid"><div><dt>体卦</dt><dd>${escapeHtml(tab.fiveElements.bodyElement ?? '')} · ${escapeHtml(tab.fiveElements.bodyStrength ?? '')}</dd></div><div><dt>用卦</dt><dd>${escapeHtml(tab.fiveElements.useElement ?? '')} · ${escapeHtml(tab.fiveElements.useStrength ?? '')}</dd></div><div><dt>体用关系</dt><dd>${escapeHtml(tab.fiveElements.relation ?? '')}</dd></div></dl>`;
}

function renderClassics(model) {
  const tab = model.tabs.classics;
  return `<div class="classic-stack">
    <article><span>本卦卦辞</span><h2>${escapeHtml(tab.originalName)}</h2><p>${escapeHtml(tab.originalGuaCi)}</p></article>
    <article class="moving-classic"><span>动爻爻辞</span><p>${escapeHtml(tab.movingLine)}</p></article>
    <article><span>互卦卦辞</span><h2>${escapeHtml(tab.mutualName)}</h2><p>${escapeHtml(tab.mutualGuaCi)}</p></article>
    <article><span>变卦卦辞</span><h2>${escapeHtml(tab.changedName)}</h2><p>${escapeHtml(tab.changedGuaCi)}</p></article>
  </div>`;
}

function renderEvidence(model) {
  const tab = model.tabs.evidence;
  return `<div class="evidence-grid" aria-label="计算依据">
    <article><h2>计算日志</h2><dl>${tab.rows.map((row) => `<div><dt>${escapeHtml(row.label)}</dt><dd>${escapeHtml(row.value)}</dd></div>`).join('')}</dl></article>
    <article><h2>算法档案</h2><dl><div><dt>算法 ID</dt><dd>${escapeHtml(tab.algorithm.id ?? '')}</dd></div><div><dt>算法版本</dt><dd>${escapeHtml(tab.algorithm.version ?? '')}</dd></div><div><dt>记录版本</dt><dd>${escapeHtml(tab.schemaVersion ?? '')}</dd></div><div><dt>解读档案</dt><dd>${escapeHtml(tab.interpretationProfile)}</dd></div></dl></article>
    ${tab.questionContext ? `<article><h2>问题解析</h2><pre>${escapeHtml(JSON.stringify(tab.questionContext, null, 2))}</pre></article>` : ''}
    <article><h2>原始输入</h2><pre>${escapeHtml(JSON.stringify(tab.rawInputs, null, 2))}</pre></article>
    ${tab.timeBasis ? `<article><h2>时间口径</h2><pre>${escapeHtml(JSON.stringify(tab.timeBasis, null, 2))}</pre></article>` : ''}
  </div>`;
}

export function renderResult(record) {
  const model = createResultModel(record);
  const labels = [['summary', '摘要'], ['hexagram', '卦象'], ['classics', '经典'], ['evidence', '依据']];
  return `<section class="result-view" aria-labelledby="result-title">
    <header class="result-heading"><p>占问完成 · 仅存本机</p><h1 id="result-title">${escapeHtml(model.question)}</h1><time datetime="${escapeHtml(model.createdAt)}">${escapeHtml(new Date(model.createdAt).toLocaleString('zh-CN'))}</time></header>
    ${renderRiskBanner(model.risk)}
    <div class="result-tabs" role="tablist" aria-label="推演结果层级">${labels.map(([id, label], index) => `<button role="tab" id="tab-${id}" aria-controls="panel-${id}" aria-selected="${index === 0}" tabindex="${index === 0 ? '0' : '-1'}" data-result-tab="${id}">${label}</button>`).join('')}</div>
    <section id="panel-summary" role="tabpanel" aria-labelledby="tab-summary" data-result-panel="summary">${renderSummary(model)}</section>
    <section id="panel-hexagram" role="tabpanel" aria-labelledby="tab-hexagram" data-result-panel="hexagram" hidden>${renderHexagrams(model)}</section>
    <section id="panel-classics" role="tabpanel" aria-labelledby="tab-classics" data-result-panel="classics" hidden>${renderClassics(model)}</section>
    <section id="panel-evidence" role="tabpanel" aria-labelledby="tab-evidence" data-result-panel="evidence" hidden>${renderEvidence(model)}</section>
  </section>`;
}
