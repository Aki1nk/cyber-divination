const CATEGORIES = new Set(['career', 'relationship', 'study', 'travel', 'general']);

const INTENT_RULES = Object.freeze([
  ['comparison', ['哪个', '哪一个', '二选一', '比较', '还是']],
  ['action_planning', ['如何', '怎样', '先做什么', '推进顺序', '安排']],
  ['timing', ['什么时候', '何时', '现在是否适合', '近期是否适合', '哪天', '时机']],
  ['decision', ['要不要', '是否', '能否', '可不可以', '适不适合']],
  ['relationship', ['复合', '关系发展', '对方态度', '相处']]
]);

const FOCUS_RULES = Object.freeze([
  ['timing', ['什么时候', '何时', '近期', '最近', '下周', '下个月', '今年', '时间', '时机']],
  ['collaboration', ['团队', '合作', '协作', '同事', '负责人', '同行']],
  ['resources', ['资源', '资金', '预算', '人手', '接口', '材料']],
  ['communication', ['沟通', '联系', '表达', '说明', '复合']],
  ['risk', ['风险', '损失', '安全', '失败', '后果']],
  ['results', ['结果', '成功', '通过', '录取', '完成']],
  ['obstacles', ['阻碍', '困难', '卡住', '问题', '冲突']]
]);

const SUBJECT_RULES = Object.freeze([
  ['项目', ['项目']],
  ['团队', ['团队', '同事', '负责人']],
  ['工作', ['工作', '职位', '职业', '升职', '应聘', '创业']],
  ['对方', ['对方', '伴侣', '对象', '朋友']],
  ['考试', ['考试', '复习']],
  ['申请', ['申请', '录取', '材料']],
  ['行程', ['行程', '旅行', '出发', '搬家', '路线']]
]);

const TIME_TERMS = Object.freeze(['今天', '明天', '近期', '最近', '下周', '下个月', '今年']);

function includesAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function matchedIds(text, rules) {
  return rules
    .map(([id, terms], order) => ({
      id,
      order,
      position: Math.min(...terms.map((term) => text.indexOf(term)).filter((position) => position >= 0))
    }))
    .filter(({ position }) => Number.isFinite(position))
    .sort((left, right) => left.position - right.position || left.order - right.order)
    .map(({ id }) => id);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

export function analyzeQuestion({ question = '', background = '', category = 'general' } = {}) {
  const normalizedQuestion = String(question).normalize('NFKC').trim();
  const normalizedBackground = String(background).normalize('NFKC').trim();
  const text = `${normalizedQuestion} ${normalizedBackground}`;
  const safeCategory = CATEGORIES.has(category) ? category : 'general';
  const intent = INTENT_RULES.find(([, terms]) => includesAny(text, terms))?.[0] ?? 'general';
  const focuses = matchedIds(text, FOCUS_RULES);
  const subjects = matchedIds(text, SUBJECT_RULES);
  const timeSignals = TIME_TERMS.filter((term) => normalizedQuestion.includes(term));
  const matched = intent !== 'general' || focuses.length > 0 || subjects.length > 0 || timeSignals.length > 0;
  const reasonKeys = [`category:${safeCategory}`, `intent:${intent}`, ...focuses.map((focus) => `focus:${focus}`)];

  return deepFreeze({
    category: safeCategory,
    intent,
    focuses,
    subjects,
    timeSignals,
    confidence: matched ? 'matched' : 'category-only',
    reasonKeys
  });
}
