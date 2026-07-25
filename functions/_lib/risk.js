const RULES = Object.freeze({
  self_harm: [/(自杀|轻生|不想活|结束生命|伤害自己|割腕|跳楼)/i],
  medical: [/(药物|治好|癌|手术|诊断|症状|医生|医院|疾病)/i],
  pregnancy: [/(怀孕|胎儿|流产|生产|孕检)/i],
  life_death: [/(寿命|活多久|什么时候死|生死)/i],
  legal: [/(诉讼|官司|起诉|判刑|律师|法院)/i],
  crime: [/(犯罪|违法|逃避侦查|销毁证据|洗钱)/i],
  investment: [/(股票|基金|期货|币圈|加密货币|买入|卖出|投资|稳赚)/i],
  major_finance: [/(全部积蓄|全部存款|抵押|借贷|贷款|大额|倾家荡产)/i]
});

export function classifyServerRisk(question = '', background = '') {
  const content = `${question}\n${background}`;
  const categories = Object.entries(RULES).filter(([, rules]) => rules.some((rule) => rule.test(content))).map(([category]) => category);
  return Object.freeze({ level: categories.includes('self_harm') ? 'urgent' : categories.length ? 'high' : 'normal', categories: Object.freeze(categories) });
}
