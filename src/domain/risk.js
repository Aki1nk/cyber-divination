const CATEGORY_PATTERNS = Object.freeze({
  self_harm: [/(自杀|轻生|不想活|结束生命|伤害自己)/],
  medical: [/(药|治好|病|癌|手术|诊断|症状|医生|医院)/],
  pregnancy: [/(怀孕|胎儿|流产|生产|孕检)/],
  life_death: [/(寿命|活多久|什么时候死|生死)/],
  legal: [/(诉讼|官司|起诉|判刑|律师|法院)/],
  crime: [/(犯罪|违法|逃避侦查|销毁证据|洗钱)/],
  investment: [/(股票|基金|期货|币圈|加密货币|买入|卖出|投资|稳赚)/],
  major_finance: [/(全部积蓄|全部存款|抵押|借贷|贷款|大额|倾家荡产)/]
});

export function classifyRisk(question = '') {
  const normalized = String(question).trim();
  const categories = Object.entries(CATEGORY_PATTERNS)
    .filter(([, patterns]) => patterns.some((pattern) => pattern.test(normalized)))
    .map(([category]) => category);

  const level = categories.includes('self_harm')
    ? 'urgent'
    : categories.length > 0
      ? 'high'
      : 'normal';

  return Object.freeze({ level, categories: Object.freeze(categories) });
}
