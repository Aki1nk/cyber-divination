export const RELATION_TEXT = Object.freeze({
  same_element: '体用比和（内外条件较容易配合）：保持现有节奏，先推进已经达成共识的事项，再核对细节。',
  body_generates_use: '体生用（你正在投入较多精力支持外部事项）：设好时间、成本和承诺上限，避免一味消耗。',
  use_generates_body: '用生体（外部条件能为你提供帮助）：主动承接明确资源，但仍要核实关键前提。',
  body_overcomes_use: '体克用（你目前仍有主动权）：先把自己能决定的事做扎实，再处理外部变化。',
  use_overcomes_body: '用克体（外部压力或条件更强）：放慢节奏，补齐信息，并为协商或调整预留空间。'
});

export const STRENGTH_TEXT = Object.freeze({
  prosperous: '体势当令（当前可用资源和执行力相对充足）：可以推进关键步骤，但仍要核对事实与承受范围。',
  supported: '体势得助（当前有人、资源或既有基础可以借力）：优先使用已经确认的支持条件。',
  resting: '体势平缓（当前更适合观察和整理）：先小步验证，再根据现实反馈决定是否扩大行动。',
  weakened: '体势偏弱（当前余量可能不足）：先保留时间、资金和精力，避免一次承担过多。'
});

export const RISK_BOUNDARIES = Object.freeze({
  medical: '卦象不能替代医生诊断、检验和治疗，请把健康决定交给合格医疗人员。',
  pregnancy: '卦象不能判断是否怀孕或胎儿状况，请使用正规检测并咨询医疗人员。',
  life_death: '卦象不用于判断寿命、生死时间或不可逆结局。',
  legal: '卦象不能替代律师意见或司法程序，请保留证据并咨询专业人士。',
  crime: '请勿依据卦象实施、掩盖或规避违法犯罪行为。',
  investment: '卦象不构成投资建议，请勿据此交易、借贷或投入无法承受损失的资金。',
  major_finance: '涉及大额资金时，请先核对合同、现金流和独立专业意见。',
  self_harm: '如果你可能伤害自己，请立即联系当地急救服务、危机热线，或请可信任的人陪在身边。'
});

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
