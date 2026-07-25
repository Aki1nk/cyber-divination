# 结合问题的本地详细解读 v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建完全离线、可复核的 v2 解读引擎，从问题和背景中提取意图与关注点，并结合 64 卦现代主题、体用、旺衰和动爻阶段生成明确宜/不宜的九段式详细解读。

**Architecture:** 新增纯函数问题解析器和完整的 64 卦现代主题表；`interpret()` 只负责组合已解析的问题上下文和结构化卦象规则。起卦控制器传入问题与卦 ID，保存 `questionContext` 和 `local-deterministic-v2` 结果；结果页继续使用通用 section 渲染，并在依据页展示问题解析快照。

**Tech Stack:** 原生 JavaScript ES modules、`node:test`、本地 JSON/JS 数据、现有静态 PWA 与 Cloudflare Pages 构建流程。

---

## File Map

- Create: `src/domain/question-context.js` — 本地解析类别、意图、关注点、主体和时间信号。
- Create: `src/data/hexagram-guidance.js` — 64 卦现代主题数据和安全查询函数。
- Modify: `src/domain/interpretation.js` — v2 宜/不宜矩阵和九段式解读生成器。
- Modify: `src/data/interpretation-rules.js` — 类别表达、关注点动作和体用结论规则。
- Modify: `src/app/cast-controller.js` — 传入问题、背景、卦 ID 与动爻位置，保存 v2 解析快照。
- Modify: `src/ui/views/result.js` — 突出 verdict，显示问题解析依据，兼容 v1 记录。
- Modify: `src/styles/result.css` — verdict 与行动卡片的层级样式。
- Create: `test/domain/question-context.test.js`
- Create: `test/data/hexagram-guidance.test.js`
- Modify: `test/domain/interpretation.test.js`
- Modify: `test/app/cast-controller.test.js`
- Modify: `test/app/result-model.test.js`

### Task 1: 本地问题上下文解析器

**Files:**
- Create: `test/domain/question-context.test.js`
- Create: `src/domain/question-context.js`

- [ ] **Step 1: Write the failing parser tests**

创建 `test/domain/question-context.test.js`：

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeQuestion } from '../../src/domain/question-context.js';

test('selected category stays authoritative while intent and focuses come from the question', () => {
  const context = analyzeQuestion({
    question: '如何安排项目下周的推进顺序，并协调团队资源？',
    background: '需要先确认外部接口',
    category: 'career'
  });

  assert.equal(context.category, 'career');
  assert.equal(context.intent, 'action_planning');
  assert.deepEqual(context.focuses, ['timing', 'collaboration', 'resources']);
  assert.deepEqual(context.subjects, ['项目', '团队']);
  assert.deepEqual(context.timeSignals, ['下周']);
  assert.equal(context.confidence, 'matched');
  assert.deepEqual(context.reasonKeys, [
    'category:career',
    'intent:action_planning',
    'focus:timing',
    'focus:collaboration',
    'focus:resources'
  ]);
});

test('comparison outranks decision and keeps stable subject order', () => {
  const context = analyzeQuestion({
    question: '这两个工作机会哪个更适合我，还是继续当前项目？',
    category: 'career'
  });

  assert.equal(context.intent, 'comparison');
  assert.deepEqual(context.subjects, ['工作', '项目']);
});

test('relationship and timing language are recognized without changing category', () => {
  const context = analyzeQuestion({
    question: '近期是否适合与对方沟通复合？',
    category: 'relationship'
  });

  assert.equal(context.category, 'relationship');
  assert.equal(context.intent, 'timing');
  assert.deepEqual(context.focuses, ['timing', 'communication']);
  assert.deepEqual(context.subjects, ['对方']);
  assert.deepEqual(context.timeSignals, ['近期']);
});

test('unknown input falls back without inventing subjects or dates', () => {
  const context = analyzeQuestion({ question: '这件事怎么看？', category: 'unknown' });

  assert.equal(context.category, 'general');
  assert.equal(context.intent, 'general');
  assert.deepEqual(context.focuses, []);
  assert.deepEqual(context.subjects, []);
  assert.deepEqual(context.timeSignals, []);
  assert.equal(context.confidence, 'category-only');
  assert.deepEqual(context.reasonKeys, ['category:general', 'intent:general']);
});

test('parser outputs are deeply frozen', () => {
  const context = analyzeQuestion({ question: '要不要推进申请？', category: 'study' });
  assert.ok(Object.isFrozen(context));
  assert.ok(Object.isFrozen(context.focuses));
  assert.ok(Object.isFrozen(context.subjects));
  assert.ok(Object.isFrozen(context.timeSignals));
  assert.ok(Object.isFrozen(context.reasonKeys));
});
```

- [ ] **Step 2: Run the parser test and verify RED**

Run: `node --test test/domain/question-context.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/domain/question-context.js`.

- [ ] **Step 3: Implement the deterministic parser**

创建 `src/domain/question-context.js`：

```js
const CATEGORIES = new Set(['career', 'relationship', 'study', 'travel', 'general']);

const INTENT_RULES = Object.freeze([
  ['comparison', ['哪个', '哪一个', '二选一', '比较', '还是']],
  ['action_planning', ['怎么', '如何', '怎样', '先做什么', '推进顺序', '安排']],
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
  return rules.filter(([, terms]) => includesAny(text, terms)).map(([id]) => id);
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
```

- [ ] **Step 4: Run the parser test and verify GREEN**

Run: `node --test test/domain/question-context.test.js`

Expected: 5 tests pass, 0 fail.

- [ ] **Step 5: Commit the parser**

```powershell
git add -- src/domain/question-context.js test/domain/question-context.test.js
git commit -m "feat: analyze divination questions locally"
```

### Task 2: 完整的 64 卦现代主题数据

**Files:**
- Create: `test/data/hexagram-guidance.test.js`
- Create: `src/data/hexagram-guidance.js`

- [ ] **Step 1: Write the failing completeness tests**

创建 `test/data/hexagram-guidance.test.js`：

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getHexagramGuidance, HEXAGRAM_GUIDANCE } from '../../src/data/hexagram-guidance.js';

test('modern guidance covers the same 64 unique hexagrams as the classics vendor', async () => {
  const classics = JSON.parse(await readFile('src/vendor/64gua.json', 'utf8'));
  const classicIds = classics.map((record) => record.id).sort();
  const guidanceIds = Object.keys(HEXAGRAM_GUIDANCE).sort();

  assert.equal(guidanceIds.length, 64);
  assert.deepEqual(guidanceIds, classicIds);
});

test('every guidance entry contains complete modern interpretation fields', () => {
  for (const [id, guidance] of Object.entries(HEXAGRAM_GUIDANCE)) {
    assert.equal(guidance.id, id);
    assert.ok(guidance.name.length > 0);
    assert.ok(guidance.situation.length > 0);
    assert.ok(guidance.process.length > 0);
    assert.ok(guidance.tendency.length > 0);
    assert.ok(guidance.favorable.length > 0);
    assert.ok(guidance.cautions.length > 0);
    assert.ok(guidance.actions.length > 0);
    assert.deepEqual(guidance.sourceKeys, [`modern_guidance:${id}`]);
    assert.ok(Object.isFrozen(guidance));
  }
});

test('unknown ids return an explicit frozen fallback', () => {
  const fallback = getHexagramGuidance('missing');
  assert.equal(fallback.id, 'missing');
  assert.match(fallback.situation, /资料未覆盖/);
  assert.deepEqual(fallback.sourceKeys, ['modern_guidance:fallback']);
  assert.ok(Object.isFrozen(fallback));
});
```

- [ ] **Step 2: Run the guidance test and verify RED**

Run: `node --test test/data/hexagram-guidance.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/data/hexagram-guidance.js`.

- [ ] **Step 3: Create the guidance helper and rows 1–32**

创建 `src/data/hexagram-guidance.js`，先写入：

```js
function guidance(id, name, situation, process, tendency, favorable, caution, action) {
  return Object.freeze({
    id,
    name,
    situation,
    process,
    tendency,
    favorable: Object.freeze([favorable]),
    cautions: Object.freeze([caution]),
    actions: Object.freeze([action]),
    sourceKeys: Object.freeze([`modern_guidance:${id}`])
  });
}

const GUIDANCE_ROWS = [
  ['111111', '乾', '主动条件较强，事情需要明确目标并承担责任。', '推进时要保持原则、节奏和持续执行，避免只凭一时冲劲。', '若能自律并根据反馈调整，事情有继续扩展的空间。', '主动性、执行力和清晰目标。', '过度强势、急于求成或忽略他人条件。', '确定核心目标，再按阶段承担责任。'],
  ['000000', '坤', '当前更需要承接现实条件、配合资源并稳住基础。', '过程中宜先理解环境和他人需求，再决定自己的行动位置。', '以稳定、包容和持续支持推进，结果更容易落地。', '耐心、协作和稳定承载。', '没有边界地顺从或缺少自己的判断。', '先确认可承接范围，再稳步落实。'],
  ['100010', '屯', '事情处在起步困难、条件尚未齐备的阶段。', '中间需要拆小任务、寻找支持并允许反复调整。', '基础逐步建立后才适合扩大，不宜跳过早期验证。', '新机会、初始动力和可培养的支持。', '一开始就追求完整结果或同时铺开过多事项。', '先解决最关键的启动障碍。'],
  ['010001', '蒙', '当前信息、经验或判断基础仍不充分。', '宜通过学习、请教和明确规则减少试错。', '建立理解框架后，事情会从模糊走向可操作。', '学习能力、指导和澄清问题的机会。', '不懂装懂、重复询问却不落实。', '列出未知项并逐一获得可靠答案。'],
  ['111010', '需', '条件尚在形成，当前重点是准备而不是强行催促结果。', '等待期间应补齐资源、方案和风险预案。', '必要条件成熟后再行动，成功率比仓促推进更高。', '准备时间、可积累资源和外部机会。', '把等待当停滞，或在条件不足时冒进。', '明确启动条件并持续准备。'],
  ['010111', '讼', '分歧、责任或利益边界可能成为主要问题。', '宜核对事实、保留证据并降低对抗强度。', '通过规则和第三方机制处理，比争一时输赢更可控。', '清晰事实、书面记录和正式程序。', '情绪化对抗、扩大争执或忽视成本。', '先整理争议点和可验证证据。'],
  ['010000', '师', '事情需要组织、纪律和明确分工，不能只靠个人临场发挥。', '过程中要统一目标、指挥方式和责任边界。', '团队形成稳定秩序后才适合承担更复杂任务。', '组织能力、共同目标和明确职责。', '权责不清、各自行动或过度控制。', '建立负责人、任务表和反馈机制。'],
  ['000010', '比', '合作与信任是当前能否推进的关键。', '宜选择价值和行动一致的伙伴，并持续确认承诺。', '关系稳定后可以形成互助，但不适合勉强绑定。', '可信伙伴、共同利益和持续互动。', '只求表面和谐或忽略合作条件。', '确认双方能提供什么并形成明确约定。'],
  ['111011', '小畜', '已有积累但仍不足以支持大规模突破。', '宜通过小步改进、资源储备和细节控制增加承载力。', '持续积累会形成推进条件，短期不宜追求一次完成。', '已有基础、小成果和可持续积累。', '因进展缓慢而冒进或过早扩大。', '先完成一个可验证的小目标。'],
  ['110111', '履', '当前可以前行，但规则、位置和风险边界必须清楚。', '每一步都应确认责任、礼序和可能后果。', '谨慎遵循边界可以通过敏感阶段。', '清晰规范、谨慎态度和风险意识。', '越界、侥幸或因自信忽略程序。', '逐项核对规则后再行动。'],
  ['111000', '泰', '内外条件较容易沟通，事情具备顺畅推进的窗口。', '宜利用当前通达状态协调资源并完成关键连接。', '若保持开放和均衡，合作与进展可以持续。', '沟通顺畅、资源流动和上下协同。', '因形势顺利而放松检查或分配失衡。', '趁条件通畅完成关键协作。'],
  ['000111', '否', '内外条件存在隔阂，当前推进容易遇到信息或资源阻塞。', '宜先识别无法沟通的环节，缩小范围并保护核心事项。', '打通关键阻塞后才会出现新的推进空间。', '保留核心能力、减少无效消耗。', '在沟通不通时继续加码或勉强求成。', '先处理最关键的一处阻塞。'],
  ['101111', '同人', '共同目标可以聚合不同的人，但需要公开和清晰。', '过程中应把立场、规则和利益放到可讨论的层面。', '建立真实共识后，协作范围可以扩大。', '共同目标、公开沟通和多方协作。', '小圈子利益、信息不透明或口头共识。', '把共同目标和分工写清楚。'],
  ['111101', '大有', '资源或机会相对充足，重点转为如何正确使用和分配。', '宜建立优先级、责任和风险控制，避免资源反而造成混乱。', '妥善管理已有优势，可以形成稳定成果。', '资源、影响力和较好的执行窗口。', '过度扩张、炫耀成果或忽略承载能力。', '先确定最值得投入的核心事项。'],
  ['001000', '谦', '当前宜降低姿态、准确评估自己和环境。', '通过倾听、复盘和让成果说话，可以减少阻力。', '保持谦逊但不失原则，有利于长期积累信任。', '学习空间、他人反馈和稳健基础。', '自我贬低、缺少主张或隐藏真实问题。', '主动收集反馈并修正一项偏差。'],
  ['000100', '豫', '气氛与动员条件较好，适合为行动建立信心和准备。', '热情需要落实为计划、资源和责任，否则容易散失。', '准备充分后可以形成顺势行动。', '积极氛围、参与意愿和启动动力。', '只有情绪动员而缺少执行安排。', '把愿望转成时间表和负责人。'],
  ['100110', '随', '事情要求顺应真实变化，而不是固守原计划。', '应观察有效趋势，调整方法但保留核心原则。', '跟随可靠条件并持续校准，可以减少无效对抗。', '环境反馈、可借势方向和适应能力。', '盲从他人或频繁改变核心目标。', '区分必须坚持与可以调整的部分。'],
  ['011001', '蛊', '旧问题、积累偏差或失效机制需要被处理。', '宜追溯原因、修复基础并建立防止复发的规则。', '完成整顿后，事情才适合重新发展。', '问题已经显现，具备修复入口。', '只处理表面症状或把责任推给他人。', '找出一个根因并完成闭环修复。'],
  ['110000', '临', '机会或责任正在靠近，需要提前进入状态。', '宜主动了解现场、建立联系并准备承接。', '及时到位且保持审慎，可以扩大影响。', '接近机会、观察窗口和主动沟通。', '只凭位置优势施压或准备不足。', '提前确认需求并做好承接清单。'],
  ['000011', '观', '当前更适合观察全局、模式和真实反馈。', '宜暂缓定论，从不同角度收集信息。', '看清结构后再行动，可以减少方向性错误。', '观察距离、多方信息和复盘机会。', '只看表象、带着结论找证据。', '建立观察指标并记录事实。'],
  ['100101', '噬嗑', '事情中存在必须处理的明确障碍或规则问题。', '宜界定问题、执行约定并保持处理尺度一致。', '障碍被依法依规清除后，流程才能恢复。', '明确规则、处理工具和可识别障碍。', '回避关键问题或处罚尺度失衡。', '明确问题、责任和处理期限。'],
  ['101001', '贲', '外在呈现和内部实质都需要整理。', '宜用清晰形式表达真实内容，不能以包装代替基础。', '形式与内容匹配后，更容易获得理解和认可。', '表达、设计和结构化呈现能力。', '过度包装、重形式轻实质。', '先完善核心内容，再优化呈现。'],
  ['000001', '剥', '现有结构正在削弱，当前重点是止损和保留核心。', '宜删除非必要负担，避免继续依赖不稳基础。', '保存关键资源后，才有重新建立的可能。', '识别冗余、收缩范围和保护核心。', '逆势扩张或否认基础已经松动。', '停止一项持续消耗但价值低的事项。'],
  ['100000', '复', '事情出现回到正轨或重新开始的机会。', '宜总结偏离原因，从最基本的一步恢复。', '稳定重复正确动作后，发展会逐渐恢复。', '重新开始、纠偏和已有经验。', '急于补回全部损失或重复旧错误。', '恢复一个最基本且可持续的动作。'],
  ['100111', '无妄', '当前宜依据事实和正当目标行动，不宜操控结果。', '过程中保持真实、简洁并接受不可控因素。', '减少人为扭曲后，事情更可能按真实条件发展。', '真实动机、直接行动和事实依据。', '投机、过度设计或把偶然当保证。', '核对动机与事实后采取直接步骤。'],
  ['111001', '大畜', '已有能力需要继续积累和约束，尚不必急于全部释放。', '宜储备资源、训练能力并等待更合适的使用窗口。', '积累达到承载要求后，可以承担更大任务。', '储备、训练和长期投入。', '能力未稳就急于证明或一次用尽资源。', '建立能力与资源储备清单。'],
  ['100001', '颐', '输入、支持和日常供给决定当前状态。', '宜检查信息来源、资源摄入和持续维护方式。', '改善基础供给后，行动质量会同步提升。', '稳定习惯、可靠输入和支持系统。', '接受低质量信息或只消耗不补充。', '替换一项低质量输入并建立补给。'],
  ['011110', '大过', '当前负荷或责任超过常态，需要非常措施但不能失控。', '宜识别承重极限、调整结构并准备替代方案。', '及时减压和加固可以渡过高负荷阶段。', '集中资源、快速响应和承担能力。', '继续叠加任务或忽略结构性风险。', '立即减掉一项非核心负荷。'],
  ['010010', '坎', '风险或困难可能反复出现，不能依赖一次侥幸通过。', '宜建立流程、边界和重复检查机制。', '通过持续谨慎和经验积累，可以逐步穿越风险。', '风险意识、经验和可重复方法。', '冒险、隐瞒问题或把一次成功当常态。', '建立风险清单和退出条件。'],
  ['101101', '离', '清晰认知和正确依附关系是当前关键。', '宜明确事实、表达和所依赖的资源是否可靠。', '保持清晰并选择可靠支持，可以稳定发展。', '可见度、理解力和表达能力。', '被表象吸引或依附不可靠条件。', '核对关键信息和依赖来源。'],
  ['001110', '咸', '双方或多方正在相互影响，回应方式很重要。', '宜观察真实反馈，保持尊重并避免单方面推动。', '形成自然回应后，关系或合作可以深入。', '相互感受、回应和沟通机会。', '操控对方、过度试探或忽略边界。', '进行一次低压力、可回应的沟通。'],
  ['011100', '恒', '事情需要稳定持续，而不是频繁更换方向。', '宜建立长期节奏并定期检查是否偏离原则。', '持续正确行动可以形成可靠成果。', '习惯、承诺和长期积累。', '三分钟热度或僵化坚持无效方法。', '确定一个可以持续执行的固定节奏。'],
  ['001111', '遯', '当前环境不利于正面对抗，主动退让可以保护实力。', '宜缩小暴露、远离消耗并等待条件改变。', '保留核心资源后，未来仍有重新行动的空间。', '退出选择、边界意识和保留余地。', '把退让当失败，或在不利位置硬撑。', '停止一项无效对抗并保存资源。'],
  ['111100', '大壮', '力量和推动条件较强，但使用方式决定结果。', '宜把力量放在正确目标和规则范围内。', '克制冲动并集中行动，可以形成实质进展。', '行动力、影响力和推进能力。', '逞强、越界或用力量代替判断。', '选择一个关键目标集中推进。'],
  ['000101', '晋', '事情具备向前发展和获得认可的机会。', '宜公开成果、接受反馈并保持稳健节奏。', '持续展示真实价值，可以逐步扩大空间。', '可见成果、支持者和上升通道。', '急于表现、忽略基础或争夺功劳。', '完成并展示一个可验证成果。'],
  ['101000', '明夷', '当前环境可能压制表达或不利于公开推进。', '宜保护核心判断，减少不必要暴露并观察变化。', '保存实力和原则后，等待更安全的表达窗口。', '内在判断、低调行动和保护能力。', '在不安全环境中强行证明自己。', '保护关键信息并降低公开承诺。'],
  ['101011', '家人', '内部角色、责任和日常秩序影响整体结果。', '宜先处理内部沟通和分工，再向外推进。', '角色稳定、规则一致后，事情更容易长期运作。', '明确职责、稳定关系和内部支持。', '边界混乱、责任转嫁或只要求他人。', '确认每个人的责任和沟通方式。'],
  ['110101', '睽', '观点、目标或行动方式存在差异。', '宜承认差异、寻找可合作的最小共同点。', '保留不同立场同时建立局部合作，能减少冲突。', '独立观点、多元方案和局部共识。', '强求完全一致或把差异视为敌意。', '先确认一项双方都能接受的目标。'],
  ['001010', '蹇', '当前存在实质困难，直接前进成本较高。', '宜绕开障碍、寻求帮助并重新评估路径。', '调整路线和获得支持后，事情才适合继续。', '外部帮助、替代路线和问题识别。', '固执原路线或独自承担全部困难。', '找出最大障碍并准备替代方案。'],
  ['010100', '解', '紧张或阻碍已有缓解机会，适合处理积压问题。', '宜先解除最紧迫的限制，再恢复正常节奏。', '及时清理和恢复秩序后，可以重新推进。', '缓解窗口、释放资源和解决方案。', '问题缓解后立刻过度扩张。', '先关闭一项已明确的问题。'],
  ['110001', '损', '当前需要减少投入、范围或不必要负担。', '宜主动取舍，把资源留给更重要的部分。', '有原则地减少可以恢复平衡和长期能力。', '取舍空间、成本控制和聚焦。', '无差别削减或牺牲核心质量。', '明确一项可以停止的低价值投入。'],
  ['100011', '益', '当前存在增加资源、能力或合作收益的机会。', '宜把新增条件投入到真正产生长期价值的地方。', '持续增益并惠及相关方，可以形成良性循环。', '新增资源、学习机会和协作支持。', '只追求数量增加或分配失衡。', '把新增资源投入最关键的短板。'],
  ['111110', '夬', '事情来到需要明确决断和公开处理的阶段。', '宜基于事实说明立场，并准备承担决定后果。', '及时处理关键问题可以避免继续积累。', '清晰立场、决策窗口和公开沟通。', '情绪化决裂、过度强硬或准备不足。', '写明决定依据和后续安排。'],
  ['011111', '姤', '突然出现的人、机会或变量具有较强影响。', '宜保持观察和边界，不要因新鲜感立即全面投入。', '经过验证后，才能判断这项相遇是否值得延续。', '新信息、新连接和意外机会。', '被短期吸引牵着走或忽略潜在风险。', '先进行一次低成本验证。'],
  ['000110', '萃', '资源、人员或注意力正在聚集。', '宜明确聚集目的、组织方式和共同规则。', '形成有效组织后，集合力量可以产生结果。', '人员、资源和共同关注。', '只追求人多势众而缺少结构。', '明确共同目标和协调负责人。'],
  ['011000', '升', '事情适合通过持续努力逐步上升。', '宜从可承担的台阶开始，依靠积累和支持前进。', '稳步提升比跳跃式扩张更可靠。', '成长路径、支持者和持续投入。', '急于跨级或忽略基本功。', '确定下一个可达到的阶段目标。'],
  ['010110', '困', '资源、空间或选择受到限制，主观努力难以立即改变全部条件。', '宜先维持核心运作、减少消耗并寻找出口。', '保存信用和能力后，限制缓解时才有机会脱困。', '核心能力、可信承诺和有限资源。', '因焦虑而过度承诺或耗尽余量。', '保障最重要的一项基本需求。'],
  ['011010', '井', '长期基础、共享资源或稳定系统是当前关键。', '宜维护底层能力，让资源能够被持续使用和共享。', '基础设施稳定后，可以长期支持多人和多项事务。', '已有系统、共同资源和持续供给。', '只取用不维护或忽略底层问题。', '修复一个影响长期使用的基础环节。'],
  ['101110', '革', '旧方式已经难以适应，需要有依据地改变。', '宜确认变革必要性、时机和过渡安排。', '准备充分并获得基本认同后，新方式可以建立。', '改变共识、替代方案和更新动力。', '为改变而改变或缺少过渡计划。', '列出旧方式失效证据和替代步骤。'],
  ['011101', '鼎', '事情正在从改变走向建立新秩序和新能力。', '宜明确新结构、角色和长期维护方式。', '新体系稳定后，可以形成新的价值与影响。', '新结构、人才组合和整合能力。', '只换形式不换机制或责任不清。', '确定新结构的负责人和运行规则。'],
  ['100100', '震', '突然变化、消息或压力正在推动事情移动。', '宜先稳定情绪和现场，再判断真正需要处理什么。', '正确应对最初冲击后，可以恢复秩序并行动。', '快速反应、警觉和调整机会。', '惊慌决策、连续反应或放大影响。', '先确认事实和最紧急事项。'],
  ['001001', '艮', '当前需要停止、设边界或完成阶段性收束。', '宜区分应该停下的部分和仍需维持的责任。', '适时停止可以防止进一步消耗，并为下一阶段留空间。', '边界、暂停和自我控制。', '该停不停或把暂停变成逃避。', '明确一项立即停止和一项继续保持的事项。'],
  ['001011', '渐', '事情适合循序渐进，关系和能力都需要时间建立。', '宜按顺序完成基础步骤，不跳过验证。', '稳定积累会带来较可靠的长期发展。', '阶段路径、耐心和持续反馈。', '催促结果、跨越必要步骤或频繁变更。', '定义下一阶段的完成标准。'],
  ['110100', '归妹', '当前关系或安排可能存在位置、时机或承诺不对称。', '宜先确认双方真实意愿和长期责任。', '若不能修正不对等条件，后续稳定性有限。', '看见关系现实、重新协商条件。', '因短期吸引仓促承诺或忽略位置差异。', '核对双方投入、责任和退出选择。'],
  ['101100', '丰', '信息、资源或成果达到较高水平，当前需要有效管理。', '宜抓住窗口完成关键事项，同时准备高峰后的维护。', '正确分配注意力后，成果可以被保留和转化。', '充足资源、可见成果和行动窗口。', '同时铺开过多事项或忽略后续维护。', '集中完成最重要的一项成果。'],
  ['001101', '旅', '当前处于临时、移动或缺少稳定支持的位置。', '宜轻装、守规则并保留灵活调整能力。', '完成阶段目标后，应寻找更稳定的落点。', '灵活性、新视角和短期机会。', '在临时环境中过度投入或忽视当地规则。', '明确短期目标和退出时间点。'],
  ['011011', '巽', '事情适合通过持续沟通、细致进入和渐进影响推进。', '宜重复确认、调整表达并从小处渗透。', '长期一致的影响比一次强推更有效。', '沟通渠道、细节能力和持续影响。', '反复犹豫、缺少立场或只做表面沟通。', '选择一个关键对象持续确认。'],
  ['110110', '兑', '沟通、协商和积极互动可以成为主要推动力。', '宜保持真诚、清晰和可兑现，避免只追求气氛。', '真实交流形成信任后，合作更容易继续。', '表达能力、回应和协商空间。', '口头承诺过多、讨好或回避实质问题。', '进行一次围绕事实和条件的沟通。'],
  ['010011', '涣', '原有阻塞或紧张需要被疏散，资源可能较分散。', '宜先恢复共同方向，再重新组织人和事项。', '解除隔阂后，事情可以重新形成连接。', '释放压力、重新连接和调整结构。', '继续分散注意力或只解除不重建。', '先统一一个共同目标。'],
  ['110010', '节', '限制、规则和资源上限需要被明确。', '宜建立可执行的边界，既不能放任也不能过度苛刻。', '合理节制可以让事情保持长期稳定。', '预算、规则、时间盒和边界工具。', '限制过松导致失控，或过严导致无法行动。', '设定一个明确且可检查的上限。'],
  ['110011', '中孚', '信任和真实一致是当前判断的核心。', '宜让承诺、行动和信息相互印证。', '可靠事实持续累积后，可以建立更深合作。', '真诚沟通、可信记录和一致行动。', '只凭感觉信任或言行不一致。', '用一个可验证行动确认承诺。'],
  ['001100', '小过', '当前适合处理小范围偏差，不宜承担过大的跨越。', '宜关注细节、降低目标并及时修正。', '小步纠偏可以避免问题扩大。', '细节发现、快速修正和低成本动作。', '目标过大、忽略小错或把小事复杂化。', '先修正一个明确的小偏差。'],
  ['101010', '既济', '主要结构已经完成，但稳定性仍需维护。', '宜检查收尾、交接和容易反复的薄弱点。', '持续维护可以守住成果，否则完成后仍可能失序。', '已有成果、成熟流程和经验。', '因完成而松懈或过早转移注意力。', '完成一次收尾和复查清单。'],
  ['010101', '未济', '事情尚未完成，关键环节仍在过渡。', '宜明确剩余步骤、顺序和最后风险。', '按正确次序完成收尾后，才会进入稳定状态。', '已积累的进展、剩余任务清晰化。', '临近完成时急躁、跳步或误判已结束。', '列出剩余步骤并先完成最关键一项。']
];

export const HEXAGRAM_GUIDANCE = Object.freeze(Object.fromEntries(
  GUIDANCE_ROWS.map((row) => {
    const entry = guidance(...row);
    return [entry.id, entry];
  })
));

const FALLBACK = Object.freeze({
  id: '',
  name: '未知卦象',
  situation: '现代主题资料未覆盖，当前只能依据体用、旺衰和现实条件保守判断。',
  process: '宜补充事实并采用可调整的小步骤。',
  tendency: '后续倾向需要依据现实反馈继续核验。',
  favorable: Object.freeze(['已有的明确事实和可验证条件。']),
  cautions: Object.freeze(['不要把资料缺失解释为确定结果。']),
  actions: Object.freeze(['先完成一个可撤回的小步骤。']),
  sourceKeys: Object.freeze(['modern_guidance:fallback'])
});

export function getHexagramGuidance(id) {
  const existing = HEXAGRAM_GUIDANCE[id];
  if (existing) return existing;
  return Object.freeze({ ...FALLBACK, id: String(id ?? '') });
}
```

- [ ] **Step 4: Run the guidance test and verify GREEN**

Run: `node --test test/data/hexagram-guidance.test.js`

Expected: 3 tests pass, 0 fail; the vendor and modern guidance ID sets are identical.

- [ ] **Step 5: Commit the guidance data**

```powershell
git add -- src/data/hexagram-guidance.js test/data/hexagram-guidance.test.js
git commit -m "feat: add modern guidance for 64 hexagrams"
```

### Task 3: 宜/不宜、类别和行动规则

**Files:**
- Modify: `test/domain/interpretation.test.js`
- Modify: `src/data/interpretation-rules.js`

- [ ] **Step 1: Write failing tests for the new rule maps**

在 `test/domain/interpretation.test.js` 的规则 imports 中加入 `CATEGORY_GUIDANCE`、`FOCUS_ACTIONS`、`STRENGTH_ADJUSTMENTS` 和 `VERDICT_RULES`，并加入：

```js
test('v2 verdict rules explicitly cover all five body-use relations', () => {
  assert.deepEqual(Object.keys(VERDICT_RULES).sort(), [
    'body_generates_use',
    'body_overcomes_use',
    'same_element',
    'use_generates_body',
    'use_overcomes_body'
  ]);
  assert.equal(VERDICT_RULES.body_overcomes_use.label, '宜主动推进');
  assert.equal(VERDICT_RULES.use_generates_body.label, '宜借力推进');
  assert.equal(VERDICT_RULES.same_element.label, '宜稳步推进');
  assert.equal(VERDICT_RULES.body_generates_use.label, '宜控制投入后推进');
  assert.equal(VERDICT_RULES.use_overcomes_body.label, '暂不宜强行推进');
});

test('v2 category and focus rules cover every selectable category', () => {
  assert.deepEqual(Object.keys(CATEGORY_GUIDANCE).sort(), ['career', 'general', 'relationship', 'study', 'travel']);
  assert.ok(Object.values(CATEGORY_GUIDANCE).every((rule) => rule.subject && rule.verification));
  assert.ok(FOCUS_ACTIONS.timing.includes('启动条件'));
  assert.ok(FOCUS_ACTIONS.collaboration.includes('责任'));
  assert.ok(STRENGTH_ADJUSTMENTS.weakened.includes('暂不宜扩大'));
});
```

- [ ] **Step 2: Run the interpretation test and verify RED**

Run: `node --test test/domain/interpretation.test.js`

Expected: FAIL because the four v2 rule exports do not exist.

- [ ] **Step 3: Add the v2 rules without deleting v1 safety boundaries**

在 `src/data/interpretation-rules.js` 中保留现有 `RELATION_TEXT`、`STRENGTH_TEXT` 和 `RISK_BOUNDARIES`，追加：

```js
export const VERDICT_RULES = Object.freeze({
  body_overcomes_use: Object.freeze({
    label: '宜主动推进',
    advice: '你仍有一定主动空间，宜先处理自己能控制的部分，再推动外部条件。'
  }),
  use_generates_body: Object.freeze({
    label: '宜借力推进',
    advice: '外部条件可以提供帮助，但应先确认资源、承诺和支持是否真实可用。'
  }),
  same_element: Object.freeze({
    label: '宜稳步推进',
    advice: '内外条件较容易配合，宜维持节奏并及时确认共识。'
  }),
  body_generates_use: Object.freeze({
    label: '宜控制投入后推进',
    advice: '你可能需要付出较多，宜先设定时间、成本和承诺上限。'
  }),
  use_overcomes_body: Object.freeze({
    label: '暂不宜强行推进',
    advice: '外部压力或条件较强，宜先补条件、降风险或等待局面变化。'
  })
});

export const STRENGTH_ADJUSTMENTS = Object.freeze({
  prosperous: '体势当令，可以推进关键步骤，但仍需核对事实和承受范围。',
  supported: '体势得助，宜借助已经确认的人员、资源或基础。',
  resting: '体势平缓，宜先准备、观察或进行小范围试行。',
  weakened: '体势偏弱，暂不宜扩大投入，应先保留时间、资金和精力。'
});

export const CATEGORY_GUIDANCE = Object.freeze({
  career: Object.freeze({
    subject: '事业事项',
    firstStep: '列出负责人、资源、依赖事项和完成标准',
    verification: '负责人明确、关键资源到位，并且下一阶段完成标准可以检查'
  }),
  relationship: Object.freeze({
    subject: '关系事项',
    firstStep: '确认双方真实意愿、沟通边界和可以承担的责任',
    verification: '对方有持续回应，双方意愿一致，并且边界得到尊重'
  }),
  study: Object.freeze({
    subject: '学业事项',
    firstStep: '核对知识基础、材料要求、时间安排和反馈渠道',
    verification: '基础薄弱项得到补足，并完成一次可评估的练习或申请检查'
  }),
  travel: Object.freeze({
    subject: '行程计划',
    firstStep: '核对时间、路线、证件、预算和替代方案',
    verification: '关键预订可确认、必要材料齐全，并有可执行的备用方案'
  }),
  general: Object.freeze({
    subject: '所问之事',
    firstStep: '列出目标、现有条件、主要阻碍和可以撤回的小步骤',
    verification: '关键前提得到事实确认，并完成一次损失可控的现实验证'
  })
});

export const FOCUS_ACTIONS = Object.freeze({
  timing: '先明确真正的启动条件、截止边界和最晚复核时间',
  collaboration: '先确认参与者、责任分工、交付接口和沟通机制',
  resources: '先核对可用资源、预算上限、缺口和补充渠道',
  communication: '先进行一次低压力、围绕事实和边界的沟通',
  risk: '先列出最大可承受损失、停止条件和替代方案',
  results: '先定义可检查的阶段成果，而不是只写最终愿望',
  obstacles: '先找到影响最大的一个阻碍，并准备可执行的替代路径'
});
```

- [ ] **Step 4: Run the interpretation test and verify GREEN**

Run: `node --test test/domain/interpretation.test.js`

Expected: Existing interpretation tests and the two new rule-map tests pass.

- [ ] **Step 5: Commit the rule layer**

```powershell
git add -- src/data/interpretation-rules.js test/domain/interpretation.test.js
git commit -m "feat: define contextual interpretation rules"
```

### Task 4: v2 九段式解释引擎

**Files:**
- Modify: `test/domain/interpretation.test.js`
- Modify: `src/domain/interpretation.js`

- [ ] **Step 1: Replace the v1 output tests with v2 behavioral tests**

把测试 helper 扩展为：

```js
function interpretationInput(overrides = {}) {
  return {
    question: '如何安排项目下一阶段的推进顺序？',
    background: '需要协调团队资源并确认外部接口',
    category: 'career',
    relation: 'body_overcomes_use',
    bodyStrength: 'prosperous',
    useStrength: 'resting',
    originalId: '000111',
    mutualId: '001011',
    changedId: '100111',
    originalName: '否',
    mutualName: '渐',
    changedName: '无妄',
    movingLine: 1,
    movingLineText: '初六：拔茅茹，以其汇，贞吉亨。',
    risk: { level: 'normal', categories: [] },
    ...overrides
  };
}
```

用以下测试替换旧的五段式精确文案测试，并保留风险分类、规则数据和经典数据测试：

```js
test('v2 interpretation directly answers the question with nine auditable sections', () => {
  const output = interpret(interpretationInput());
  const sections = Object.fromEntries(output.sections.map((section) => [section.id, section]));

  assert.equal(output.profileId, 'local-deterministic-v2');
  assert.equal(output.questionContext.intent, 'action_planning');
  assert.deepEqual(output.sections.map((section) => section.id), [
    'verdict',
    'direct_answer',
    'current_situation',
    'development_process',
    'future_tendency',
    'favorable',
    'obstacles',
    'action_order',
    'avoid_and_verify'
  ]);
  assert.match(sections.verdict.text, /^宜主动推进/);
  assert.match(sections.direct_answer.text, /如何安排项目下一阶段的推进顺序/);
  assert.match(sections.current_situation.text, /项目|阻塞/);
  assert.match(sections.development_process.text, /早期阶段|循序渐进/);
  assert.match(sections.future_tendency.text, /无妄|事实/);
  assert.match(sections.action_order.text, /第一步：.*第二步：.*第三步：/);
  assert.match(sections.avoid_and_verify.text, /暂不宜：.*验证标准：/);
  assert.ok(output.sections.every((section) => section.reasonKeys.length > 0));
});

test('all body-use relations produce the approved explicit verdict labels', () => {
  const cases = {
    body_overcomes_use: '宜主动推进',
    use_generates_body: '宜借力推进',
    same_element: '宜稳步推进',
    body_generates_use: '宜控制投入后推进',
    use_overcomes_body: '暂不宜强行推进'
  };

  for (const [relation, label] of Object.entries(cases)) {
    const output = interpret(interpretationInput({ relation }));
    assert.match(output.sections[0].text, new RegExp(`^${label}`));
  }
});

test('moving line positions map to early middle and late stages without dates', () => {
  const cases = [[1, 'early'], [2, 'early'], [3, 'middle'], [4, 'middle'], [5, 'late'], [6, 'late']];

  for (const [movingLine, stage] of cases) {
    const output = interpret(interpretationInput({ movingLine }));
    const process = output.sections.find((section) => section.id === 'development_process');
    assert.ok(process.reasonKeys.includes(`moving_stage:${stage}`));
    assert.doesNotMatch(process.text, /\d{4}年|\d+月\d+日|保证在/);
  }
});

test('high-risk advice replaces ordinary decision and action guidance', () => {
  const output = interpret(interpretationInput({
    question: '这个药能不能治好我的病？',
    risk: { level: 'high', categories: ['medical'] }
  }));
  const sections = Object.fromEntries(output.sections.map((section) => [section.id, section]));

  assert.equal(sections.verdict.text, '此事不宜仅凭卦象决定。');
  assert.equal(sections.direct_answer.text, RISK_BOUNDARIES.medical);
  assert.equal(sections.action_order.text, RISK_BOUNDARIES.medical);
  assert.doesNotMatch(JSON.stringify(output), /宜主动推进|宜借力推进/);
});

test('urgent self-harm interpretation stops divination framing and prioritizes help', () => {
  const output = interpret(interpretationInput({
    question: '我现在想自杀',
    risk: { level: 'urgent', categories: ['self_harm'] }
  }));

  assert.equal(output.sections[0].text, '当前不宜继续进行宿命式判断。');
  assert.ok(output.sections.every((section) => section.reasonKeys.includes('risk:urgent')));
  assert.match(output.sections[1].text, /立即联系当地急救服务/);
});

test('v2 output avoids forbidden certainty and fabricated promises', () => {
  const output = interpret(interpretationInput());
  assert.doesNotMatch(JSON.stringify(output), /必然|注定|一定成功|一定失败|稳赚|包治|治愈|必有灾祸/);
});
```

- [ ] **Step 2: Run the interpretation test and verify RED**

Run: `node --test test/domain/interpretation.test.js`

Expected: FAIL because `interpret()` still returns `local-deterministic-v1` and five sections.

- [ ] **Step 3: Implement the v2 interpreter**

用以下实现替换 `src/domain/interpretation.js`：

```js
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
```

- [ ] **Step 4: Run the interpretation test and verify GREEN**

Run: `node --test test/domain/interpretation.test.js`

Expected: All v2 rule, section, risk and certainty tests pass.

- [ ] **Step 5: Commit the v2 interpreter**

```powershell
git add -- src/domain/interpretation.js test/domain/interpretation.test.js
git commit -m "feat: generate contextual nine-part readings"
```

### Task 5: 控制器集成与新记录版本

**Files:**
- Modify: `test/app/cast-controller.test.js`
- Modify: `src/app/cast-controller.js`

- [ ] **Step 1: Extend the immutable record test for v2**

在 `controller creates one immutable auditable number record` 测试的输入中加入：

```js
background: '需要协调团队资源并确认外部接口',
```

并追加断言：

```js
assert.equal(record.schemaVersion, 2);
assert.equal(record.interpretation.profileId, 'local-deterministic-v2');
assert.equal(record.interpretation.questionContext.category, 'career');
assert.equal(record.interpretation.questionContext.intent, 'decision');
assert.ok(record.interpretation.sections.length === 9);
assert.equal(record.snapshot.background, '需要协调团队资源并确认外部接口');
assert.ok(Object.isFrozen(record.interpretation.questionContext));
```

注意“未来三个月”只作为时间背景，“是否适合”按 Task 1 的固定规则识别为 `decision`。

- [ ] **Step 2: Run the controller test and verify RED**

Run: `node --test test/app/cast-controller.test.js`

Expected: FAIL because the controller still creates schema version 1 and does not pass question context inputs or hexagram IDs to `interpret()`.

- [ ] **Step 3: Pass the complete v2 interpretation input**

在 `src/app/cast-controller.js` 中，将解释调用改为：

```js
const interpretation = interpret({
  question,
  background: String(input.background ?? '').trim(),
  category: input.category ?? 'general',
  relation,
  bodyStrength,
  useStrength,
  originalId: original.id,
  mutualId: mutual.id,
  changedId: changed.id,
  originalName: original.name,
  mutualName: mutual.name,
  changedName: changed.name,
  movingLine: hexagram.movingLine,
  movingLineText,
  risk
});
```

将新记录的版本改为：

```js
schemaVersion: 2
```

不得修改算法档案版本、成卦结果、计算日志或重复占问返回逻辑。

- [ ] **Step 4: Run controller and domain tests**

Run:

```powershell
node --test test/app/cast-controller.test.js test/domain/interpretation.test.js test/domain/question-context.test.js test/data/hexagram-guidance.test.js
```

Expected: All selected tests pass, 0 fail.

- [ ] **Step 5: Commit controller integration**

```powershell
git add -- src/app/cast-controller.js test/app/cast-controller.test.js
git commit -m "feat: persist contextual interpretation v2"
```

### Task 6: 结果页结论层级与问题解析依据

**Files:**
- Modify: `test/app/result-model.test.js`
- Modify: `src/ui/views/result.js`
- Modify: `src/styles/result.css`

- [ ] **Step 1: Add v2 result and v1 compatibility tests**

在 `test/app/result-model.test.js` 中保留现有 v1 `record`，再加入：

```js
const v2Record = {
  ...record,
  schemaVersion: 2,
  interpretation: {
    profileId: 'local-deterministic-v2',
    questionContext: {
      category: 'career',
      intent: 'action_planning',
      focuses: ['timing', 'collaboration'],
      subjects: ['项目', '团队'],
      timeSignals: ['下周'],
      confidence: 'matched',
      reasonKeys: ['category:career', 'intent:action_planning', 'focus:timing', 'focus:collaboration']
    },
    sections: [
      { id: 'verdict', title: '宜 / 不宜结论', text: '宜先准备后推进。', reasonKeys: ['relation:use_generates_body'] },
      { id: 'direct_answer', title: '直接回答', text: '针对项目安排，宜先确认依赖。', reasonKeys: ['intent:action_planning'] },
      { id: 'current_situation', title: '当前局势', text: '当前存在阻塞。', reasonKeys: ['modern_guidance:000111'] },
      { id: 'development_process', title: '发展过程', text: '宜循序渐进。', reasonKeys: ['modern_guidance:001011'] },
      { id: 'future_tendency', title: '后续倾向', text: '依据事实调整。', reasonKeys: ['modern_guidance:100111'] },
      { id: 'favorable', title: '有利条件', text: '外部资源可借助。', reasonKeys: ['relation:use_generates_body'] },
      { id: 'obstacles', title: '主要阻碍', text: '接口尚未确认。', reasonKeys: ['focus:collaboration'] },
      { id: 'action_order', title: '行动次序', text: '第一步确认接口；第二步小范围验证；第三步确定时间表。', reasonKeys: ['reversible_action'] },
      { id: 'avoid_and_verify', title: '暂不宜做与验证标准', text: '暂不宜一次承诺全部进度。', reasonKeys: ['human_judgment'] }
    ]
  }
};

test('v2 result model exposes nine sections and question analysis evidence', () => {
  const model = createResultModel(v2Record);
  assert.equal(model.tabs.summary.sections.length, 9);
  assert.equal(model.tabs.evidence.questionContext.intent, 'action_planning');
  assert.equal(model.tabs.evidence.interpretationProfile, 'local-deterministic-v2');
});

test('v2 result markup highlights the verdict and renders question analysis', () => {
  const html = renderResult(v2Record);
  assert.match(html, /interpretation-card--verdict/);
  assert.match(html, /问题解析/);
  assert.match(html, /action_planning/);
  assert.equal((html.match(/class="interpretation-card/g) || []).length, 9);
});

test('v1 records still render without question context', () => {
  const html = renderResult(record);
  assert.match(html, /宜先整顿基础/);
  assert.doesNotMatch(html, /问题解析/);
});
```

- [ ] **Step 2: Run the result test and verify RED**

Run: `node --test test/app/result-model.test.js`

Expected: FAIL because `questionContext` is not in the model and verdict cards have no special class.

- [ ] **Step 3: Update the result model and render helpers**

在 `createResultModel()` 的 `evidence` 中加入：

```js
questionContext: record.interpretation?.questionContext ?? null,
interpretationProfile: record.interpretation?.profileId ?? 'local-deterministic-v1',
```

将 `renderSummary()` 替换为：

```js
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
```

在 `renderEvidence()` 的“算法档案”定义列表中加入：

```js
<div><dt>解读档案</dt><dd>${escapeHtml(tab.interpretationProfile)}</dd></div>
```

然后在算法档案之后、原始输入之前加入：

```js
${tab.questionContext ? `<article><h2>问题解析</h2><pre>${escapeHtml(JSON.stringify(tab.questionContext, null, 2))}</pre></article>` : ''}
```

- [ ] **Step 4: Add verdict styling without changing the four-tab layout**

在 `src/styles/result.css` 末尾追加：

```css
.interpretation-card--verdict {
  border-color: rgb(225 195 116 / 62%);
  background: linear-gradient(135deg, rgb(79 62 25 / 88%), rgb(15 39 32 / 92%));
}

.interpretation-card--verdict h2 {
  color: var(--color-ivory);
  font-size: clamp(1.4rem, 4vw, 2rem);
}

.interpretation-card--verdict p {
  font-size: 1.05rem;
  line-height: 1.85;
}
```

- [ ] **Step 5: Run result and accessibility contract tests**

Run:

```powershell
node --test test/app/result-model.test.js test/tooling/accessibility-contract.test.js
```

Expected: v2 and v1 result tests pass; the accessible four-tab contract remains unchanged.

- [ ] **Step 6: Commit the result presentation**

```powershell
git add -- src/ui/views/result.js src/styles/result.css test/app/result-model.test.js
git commit -m "feat: present detailed contextual readings"
```

### Task 7: 文档、完整验证与浏览器验收

**Files:**
- Modify: `README.md`
- Verify: all changed source and test files

- [ ] **Step 1: Update the interpretation documentation**

在 `README.md` 的功能说明中加入以下内容：

```markdown
- 新生成的卦例使用 `local-deterministic-v2` 本地解释档案：应用在本机从问题和可选背景中识别意图、关注点、主体和时间信号，再结合本卦、互卦、变卦、体用、旺衰与动爻阶段生成九段式详细解读。
- v2 会明确给出“宜、暂不宜、宜先……再……”等非绝对结论，并保存问题解析依据；它不调用 AI、不联网，也不会改变排盘结果。
- 已保存的 v1 卦例继续显示原始解读，不会自动重算或覆盖。
```

在项目结构说明中加入：

```text
src/domain/question-context.js  本地问题意图、关注点、主体与时间信号解析
src/data/hexagram-guidance.js   64 卦现代规则解读资料
```

- [ ] **Step 2: Commit the documentation**

```powershell
git add -- README.md
git commit -m "docs: explain contextual interpretation v2"
```

- [ ] **Step 3: Scan for forbidden certainty and missing v2 coverage**

Run:

```powershell
rg -n "必然|注定|一定成功|一定失败|稳赚|包治|治愈|必有灾祸" src/data/hexagram-guidance.js src/data/interpretation-rules.js src/domain/interpretation.js
rg -n "local-deterministic-v2|questionContext|avoid_and_verify|action_order" src test README.md
```

Expected: The first command produces no matches; the second shows controller, interpreter, result and test coverage.

- [ ] **Step 4: Run focused v2 tests**

Run:

```powershell
node --test test/domain/question-context.test.js test/data/hexagram-guidance.test.js test/domain/interpretation.test.js test/app/cast-controller.test.js test/app/result-model.test.js
```

Expected: All focused tests pass, 0 fail.

- [ ] **Step 5: Run the complete automated suite**

Run: `node --test`

Expected: All project tests pass, 0 fail.

- [ ] **Step 6: Build the production output**

Run: `node tools/build.mjs`

Expected: Exit code `0`; `dist/` contains the app shell, `_headers`, `robots.txt`, icons and versioned Service Worker.

- [ ] **Step 7: Check patch hygiene and branch state**

Run:

```powershell
git diff --check main...HEAD
git status -sb
git log --oneline --decorate main..HEAD
```

Expected: No whitespace errors, clean worktree, and one intentional commit per completed task.

- [ ] **Step 8: Start the production build locally**

Run:

```powershell
node tools/dev-server.mjs --root dist --port 4175
```

Expected: Server reports `http://localhost:4175` and serves the built Service Worker without a 404 warning.

- [ ] **Step 9: Verify an ordinary contextual reading in the in-app Browser**

At `http://localhost:4175/#/ask` submit:

```text
问题：如何安排项目下一阶段的推进顺序？
类别：事业选择
背景：需要协调团队资源并确认外部接口
数字：9、16
```

Verify:

- Result uses nine sections in the approved order.
- The first card displays an explicit宜/不宜 conclusion.
- Direct answer references the project question.
- Current, process and tendency cards use different original/mutual/changed guidance.
- Action order contains first, second and third steps.
- Avoidance card contains both “暂不宜” and “验证标准”.
- Evidence tab displays `questionContext` and `local-deterministic-v2` remains in the stored result.
- Classics and calculation evidence remain separate and unchanged.

- [ ] **Step 10: Verify safety and responsive behavior**

In the same Browser session:

1. At 1280×800 confirm no clipping, overlap or horizontal overflow.
2. At 390×844 confirm nine cards remain readable and `scrollWidth === clientWidth`.
3. Submit “这个药能不能治好我的病？” and verify professional medical guidance replaces ordinary verdict/action text.
4. Confirm console errors are empty.
5. Reload after the Service Worker activates and confirm the result/history routes remain available.

- [ ] **Step 11: Stop the local server and prepare handoff**

Run:

```powershell
git status -sb
git log --oneline --decorate main..HEAD
```

Expected: Clean branch ready for local merge or push; do not push, merge or deploy without explicit user authorization.
