const TITLES = Object.freeze({ high: '重要边界提示', urgent: '请先获得现实帮助' });

export function renderRiskBanner(risk = { level: 'normal', categories: [] }) {
  if (risk.level === 'normal') return '';
  const urgent = risk.level === 'urgent';
  const text = urgent
    ? '如果你可能伤害自己，请立即联系当地急救服务、危机热线，或请可信任的人陪在身边。卦象不能替代现实援助。'
    : '此问题涉及医疗、法律、投资、生死或大额财务等高风险领域。排盘仅作文化参考，请把现实决定交给合格专业人员与可核实证据。';
  return `<aside class="risk-banner risk-banner--${risk.level}" role="${urgent ? 'alert' : 'note'}"><strong>${TITLES[risk.level]}</strong><p>${text}</p></aside>`;
}
