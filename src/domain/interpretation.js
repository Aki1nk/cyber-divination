import { getHexagramGuidance } from '../data/hexagram-guidance.js';
import {
  CATEGORY_GUIDANCE,
  FOCUS_ACTIONS,
  RELATION_TEXT,
  RISK_BOUNDARIES,
  STRENGTH_ADJUSTMENTS,
  VERDICT_RULES
} from '../data/interpretation-rules.js';
import { analyzeQuestion } from './question-context.js';

function section(id, title, text, reasonKeys) {
  return Object.freeze({ id, title, text, reasonKeys: Object.freeze([...reasonKeys]) });
}

function riskAdvice(risk) {
  const categories = risk?.categories ?? [];
  const boundaries = categories.map((category) => RISK_BOUNDARIES[category]).filter(Boolean);
  if (risk?.level === 'urgent' && !boundaries.includes(RISK_BOUNDARIES.self_harm)) {
    boundaries.unshift(RISK_BOUNDARIES.self_harm);
  }
  return boundaries.join(' ');
}

function movingStage(line) {
  if (line <= 2) return Object.freeze({ id: 'early', text: '早期阶段，宜先确认基础条件并小范围验证' });
  if (line <= 4) return Object.freeze({ id: 'middle', text: '中段阶段，宜处理协作、执行和方向修正' });
  return Object.freeze({ id: 'late', text: '后段阶段，宜重视收尾、责任和后续承接' });
}

function subjectFor(context, categoryRule) {
  return context.subjects[0] ?? categoryRule.subject;
}

function directLead(intent) {
  const leads = {
    decision: '你问的是这件事是否适合继续',
    action_planning: '你问的是如何安排后续行动',
    timing: '你关注的是现在是否到了行动时机',
    relationship: '你关注的是关系如何继续发展',
    comparison: '你正在比较多个选择',
    general: '你希望了解这件事的现实方向'
  };
  return leads[intent] ?? leads.general;
}

function urgentInterpretation(context, boundary) {
  const keys = ['risk:urgent', ...context.reasonKeys];
  return Object.freeze([
    section('verdict', '宜 / 不宜结论', '当前不宜继续进行宿命式判断。', keys),
    section('direct_answer', '直接回答', boundary, keys),
    section('current_situation', '当前局势', '当前最重要的是现实安全与有人陪伴，而不是继续分析吉凶。', keys),
    section('development_process', '发展过程', '请立即联系当地急救服务、危机热线，或请可信任的人陪在身边。', keys),
    section('future_tendency', '后续倾向', '获得现实支持后，再由合格专业人员协助处理接下来的问题。', keys),
    section('favorable', '有利条件', '可信任的人、急救服务、危机热线和专业支持都是当前可以立即使用的帮助。', keys),
    section('obstacles', '主要阻碍', '独自承受、隔离自己或把卦象当作结论会增加现实风险。', keys),
    section('action_order', '行动次序', boundary, keys),
    section('avoid_and_verify', '暂不宜做与验证标准', '暂不宜独处或继续强化宿命式解释。验证标准：已经联系到现实中的支持人员并获得陪伴。', keys)
  ]);
}

export function interpret(input) {
  const context = analyzeQuestion({
    question: input.question,
    background: input.background,
    category: input.category
  });
  const categoryRule = CATEGORY_GUIDANCE[context.category] ?? CATEGORY_GUIDANCE.general;
  const subject = subjectFor(context, categoryRule);
  const verdictRule = VERDICT_RULES[input.relation] ?? VERDICT_RULES.use_overcomes_body;
  const strengthText = STRENGTH_ADJUSTMENTS[input.bodyStrength] ?? STRENGTH_ADJUSTMENTS.resting;
  const original = getHexagramGuidance(input.originalId);
  const mutual = getHexagramGuidance(input.mutualId);
  const changed = getHexagramGuidance(input.changedId);
  const stage = movingStage(Number(input.movingLine));
  const boundary = riskAdvice(input.risk);

  if (input.risk?.level === 'urgent') {
    return Object.freeze({
      profileId: 'local-deterministic-v2',
      questionContext: context,
      sections: urgentInterpretation(context, boundary)
    });
  }

  const contextKeys = context.reasonKeys;
  const relationKeys = [`relation:${input.relation}`, `body_strength:${input.bodyStrength}`];
  const originalKeys = original.sourceKeys;
  const mutualKeys = [...mutual.sourceKeys, `moving_stage:${stage.id}`, 'moving_line'];
  const changedKeys = changed.sourceKeys;
  const primaryFocus = context.focuses[0];
  const firstStep = FOCUS_ACTIONS[primaryFocus] ?? categoryRule.firstStep;
  const usePressure = input.useStrength === 'prosperous'
    ? '用势较强，外部条件对事情的影响更大，还需提前准备协商或替代方案。'
    : '外部影响仍需核验，重点防止信息不全和执行偏差。';
  const verdictText = boundary ? '此事不宜仅凭卦象决定。' : `${verdictRule.label}。${verdictRule.advice} ${strengthText}`;
  const directText = boundary
    ? boundary
    : `${directLead(context.intent)}。针对“${String(input.question).trim()}”，当前判断是${verdictRule.label}；${verdictRule.advice}`;
  const actionText = boundary
    ? boundary
    : `第一步：${firstStep}；第二步：${original.actions[0]}；第三步：达到“${categoryRule.verification}”后，再决定是否扩大行动。`;
  const avoidText = boundary
    ? boundary
    : `暂不宜：${original.cautions[0]}；验证标准：${categoryRule.verification}。`;

  return Object.freeze({
    profileId: 'local-deterministic-v2',
    questionContext: context,
    sections: Object.freeze([
      section('verdict', '宜 / 不宜结论', verdictText, boundary ? [`risk:${input.risk.level}`, ...contextKeys] : [...relationKeys, ...contextKeys]),
      section('direct_answer', '直接回答', directText, boundary ? [`risk:${input.risk.level}`, ...contextKeys] : [...relationKeys, ...contextKeys]),
      section('current_situation', '当前局势', `你所问的${subject}对应本卦${input.originalName}。${original.situation}`, [...originalKeys, ...contextKeys]),
      section('development_process', '发展过程', `互卦${input.mutualName}提示中间过程。${stage.text}；${mutual.process}`, [...mutualKeys, ...contextKeys]),
      section('future_tendency', '后续倾向', `变卦${input.changedName}表示完成必要调整后的倾向。${changed.tendency}`, [...changedKeys, 'no_result_guarantee', ...contextKeys]),
      section('favorable', '有利条件', `${RELATION_TEXT[input.relation] ?? verdictRule.advice} ${strengthText} ${original.favorable[0]}`, [...relationKeys, ...originalKeys]),
      section('obstacles', '主要阻碍', `${usePressure} ${original.cautions[0]}`, [`use_strength:${input.useStrength}`, ...originalKeys, ...contextKeys]),
      section('action_order', '行动次序', actionText, boundary ? [`risk:${input.risk.level}`, ...contextKeys] : [...originalKeys, ...contextKeys, 'reversible_action']),
      section('avoid_and_verify', '暂不宜做与验证标准', avoidText, boundary ? [`risk:${input.risk.level}`, ...contextKeys] : [...changedKeys, ...contextKeys, 'human_judgment'])
    ])
  });
}
