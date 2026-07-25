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
  const relationText = RELATION_TEXT[input.relation] ?? '体用关系未落入既定规则（现有信息不足以作出这一项判断）：请结合事实继续核验。';
  const strengthText = STRENGTH_TEXT[input.bodyStrength] ?? '旺衰信息有限（当前条件不足以判断准备程度）：请采用保守、可调整的步骤。';
  const boundary = riskAdvice(input.risk);
  const actionText = boundary || '行动宜从小处验证（先做一个能撤回、损失可控的步骤）：根据现实反馈再调整，不把卦象当作唯一决策依据。';

  return Object.freeze({
    profileId: 'local-deterministic-v1',
    sections: Object.freeze([
      section('summary', '局势摘要', `本卦为${input.originalName}，互卦为${input.mutualName}，变卦为${input.changedName}。${relationText}`, ['original_hexagram', 'mutual_hexagram', 'changed_hexagram', `relation:${input.relation}`]),
      section('favorable', '有利因素', strengthText, [`body_strength:${input.bodyStrength}`, `relation:${input.relation}`]),
      section('obstacles', '阻碍因素', input.useStrength === 'prosperous' ? '用势较强（外部条件对事情的影响更大）：你的安排可能受到牵制，宜提前准备协商方案。' : '信息与执行仍有缺口（容易卡在前提不清或落实偏差）：先核对关键条件，再决定下一步。', [`use_strength:${input.useStrength}`, 'deterministic_caution']),
      section('timing', '时机倾向', `动爻所示为“${input.movingLineText}”。动爻（事情正在变化的位置）提示你留意当前阶段的转折；这是阶段提醒，不是具体日期或结果保证。`, ['moving_line', 'no_date_guarantee']),
      section('action', '行动建议', actionText, boundary ? [`risk:${input.risk.level}`, ...(input.risk.categories ?? []).map((category) => `risk_category:${category}`)] : ['reversible_action', 'human_judgment'])
    ])
  });
}
