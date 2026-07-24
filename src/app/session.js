function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function next(session, patch) {
  return Object.freeze({ ...session, ...patch });
}

export function createSession() {
  return Object.freeze({
    stage: 'question',
    question: '',
    category: '',
    background: '',
    method: '',
    inputs: Object.freeze({}),
    snapshot: null,
    recordId: null
  });
}

export function transition(session, action) {
  switch (action.type) {
    case 'RESET':
      return createSession();
    case 'SET_QUESTION':
      if (!String(action.question ?? '').trim()) throw new TypeError('请先明确所问之事');
      return next(session, {
        stage: 'method',
        question: String(action.question).trim(),
        category: action.category ?? 'general',
        background: String(action.background ?? '').trim(),
        snapshot: null
      });
    case 'SET_METHOD':
      if (!session.question) throw new Error('尚未确认所问之事');
      if (!action.method) throw new TypeError('请选择起卦方法');
      return next(session, { stage: 'input', method: action.method, inputs: Object.freeze({}), snapshot: null });
    case 'SET_INPUT':
      if (!session.method) throw new Error('尚未确认起卦方法');
      return next(session, { stage: 'input', inputs: deepFreeze({ ...(action.inputs ?? {}) }), snapshot: null });
    case 'CONFIRM': {
      if (!session.question || !session.method || Object.keys(session.inputs).length === 0) {
        throw new Error('尚未确认完整占问信息');
      }
      const snapshot = deepFreeze({
        question: session.question,
        category: session.category,
        background: session.background,
        method: session.method,
        inputs: { ...session.inputs }
      });
      return next(session, { stage: 'confirmed', snapshot });
    }
    case 'CAST':
      if (session.stage !== 'confirmed' || !session.snapshot) throw new Error('尚未确认，不能起卦');
      return next(session, { stage: 'casting' });
    case 'COMPLETE':
      if (session.stage !== 'casting') throw new Error('尚未进入成卦阶段');
      return next(session, { stage: 'completed', recordId: action.recordId });
    default:
      throw new RangeError(`未知状态事件：${action.type}`);
  }
}
