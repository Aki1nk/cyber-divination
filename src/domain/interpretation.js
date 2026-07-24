import { RELATION_TEXT, RISK_BOUNDARIES, STRENGTH_TEXT } from '../data/interpretation-rules.js';

function section(id, title, text, reasonKeys) {
  return Object.freeze({ id, title, text, reasonKeys: Object.freeze(reasonKeys) });
}

function riskAdvice(risk) {
  const categories = risk?.categories ?? [];
  const boundaries = categories.map((category) => RISK_BOUNDARIES[category]).filter(Boolean);
  if (risk?.level === 'urgent' && !boundaries.includes(RISK_BOUNDARIES.self_harm)) {
    boundaries.unshift(RISK_BOUNDARIES.self_harm);
  }
  return boundaries.join(' ');
}

export function interpret(input) {
  const relationText = RELATION_TEXT[input.relation] ?? '体用关系未落入既定规则，宜结合事实继续核验。';
  const strengthText = STRENGTH_TEXT[input.bodyStrength] ?? '当前旺衰信息有限，宜采用保守步骤。';
  const boundary = riskAdvice(input.risk);
  const actionText = boundary || '先完成一个可逆的小步骤，再依据实际反馈调整，不把卦象当作唯一决策依据。';

  return Object.freeze({
    profileId: 'local-deterministic-v1',
    sections: Object.freeze([
      section('summary', '局势摘要', `本卦为${input.originalName}，互卦为${input.mutualName}，变卦为${input.changedName}。${relationText}`, ['original_hexagram', 'mutual_hexagram', 'changed_hexagram', `relation:${input.relation}`]),
      section('favorable', '有利因素', strengthText, [`body_strength:${input.bodyStrength}`, `relation:${input.relation}`]),
      section('obstacles', '阻碍因素', input.useStrength === 'prosperous' ? '用势较强，外部条件可能牵制主观安排，宜预留协商空间。' : '主要阻碍来自信息不全与执行偏差，宜先核对关键前提。', [`use_strength:${input.useStrength}`, 'deterministic_caution']),
      section('timing', '时机倾向', `动爻所示为“${input.movingLineText}”。宜把它作为阶段提醒，而非具体日期或结果保证。`, ['moving_line', 'no_date_guarantee']),
      section('action', '行动建议', actionText, boundary ? [`risk:${input.risk.level}`, ...(input.risk.categories ?? []).map((category) => `risk_category:${category}`)] : ['reversible_action', 'human_judgment'])
    ])
  });
}
