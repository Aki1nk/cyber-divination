import { castNumberPair, castNumberTriple } from '../domain/casting/number.js';
import { castDigitalSymbol } from '../domain/casting/random.js';
import { castTime } from '../domain/casting/time.js';
import { castExternal } from '../domain/casting/external.js';
import { deriveHexagram } from '../domain/hexagrams.js';
import { relationFromBody, seasonalStrength, STRENGTH_PROFILE_ID } from '../domain/five-elements.js';
import { trueSolarCorrectionMinutes } from '../domain/solar-time.js';
import { classifyRisk } from '../domain/risk.js';
import { interpret } from '../domain/interpretation.js';
import { fingerprintQuestion } from '../storage/fingerprint.js';

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function castByMethod(method, inputs, dependencies) {
  if (method === 'number-pair') return castNumberPair(inputs.first, inputs.second);
  if (method === 'number-triple') return castNumberTriple(inputs.first, inputs.second, inputs.third);
  if (method === 'digital-symbol') return castDigitalSymbol(dependencies.randomIndex);
  if (method === 'external') {
    return castExternal({
      objectTrigram: Number(inputs.objectTrigram),
      directionTrigram: Number(inputs.directionTrigram),
      count: inputs.count,
      hourBranchNumber: Number(inputs.hourBranchNumber),
      confirmed: inputs.confirmed === true || inputs.confirmed === 'on'
    });
  }
  if (method === 'time') {
    if (!dependencies.calendar) throw new Error('时间起卦缺少历法适配器');
    const dateInput = {
      year: Number(inputs.year),
      month: Number(inputs.month),
      day: Number(inputs.day),
      hour: Number(inputs.hour),
      minute: Number(inputs.minute ?? 0),
      second: 0
    };
    let correctionMinutes = 0;
    if (inputs.trueSolar === true || inputs.trueSolar === 'on') {
      correctionMinutes = trueSolarCorrectionMinutes({
        date: new Date(Date.UTC(dateInput.year, dateInput.month - 1, dateInput.day, dateInput.hour, dateInput.minute)),
        longitude: Number(inputs.longitude),
        utcOffsetHours: Number(inputs.utcOffsetHours ?? 8)
      });
      const corrected = new Date(Date.UTC(dateInput.year, dateInput.month - 1, dateInput.day, dateInput.hour, dateInput.minute + correctionMinutes));
      dateInput.year = corrected.getUTCFullYear();
      dateInput.month = corrected.getUTCMonth() + 1;
      dateInput.day = corrected.getUTCDate();
      dateInput.hour = corrected.getUTCHours();
      dateInput.minute = corrected.getUTCMinutes();
    }
    return Object.freeze({
      ...castTime(dateInput, {
        calendar: dependencies.calendar,
        dayBoundary: inputs.dayBoundary,
        yearBoundary: inputs.yearBoundary ?? 'lunar-new-year'
      }),
      correctionMinutes
    });
  }
  throw new RangeError(`未知起卦方法：${method}`);
}

function classicFor(index, id) {
  const classic = index?.get(id);
  return classic ?? {
    id,
    name: `六爻 ${id}`,
    symbol: '',
    judgment: '经典数据尚未载入。',
    image: '',
    lineTexts: Array.from({ length: 6 }, (_, index) => `第 ${index + 1} 爻`),
    specialLines: []
  };
}

function recordId(date, originalId) {
  return `gua-${date.toISOString().replace(/[-:.]/g, '')}-${originalId}`;
}

export function createCastController({
  repository,
  now = () => new Date(),
  randomIndex,
  calendar = null,
  classicsIndex = null,
  onRecordSaved = null
}) {
  if (!repository) throw new TypeError('缺少本地仓库');

  return Object.freeze({
    async cast(input) {
      const question = String(input.question ?? '').trim();
      if (!question) throw new TypeError('请先明确所问之事');
      if (!input.method) throw new TypeError('请选择起卦方法');

      const questionFingerprint = await fingerprintQuestion(question);
      const created = now();
      const duplicate = await repository.findRecentDuplicate(questionFingerprint, created);
      if (duplicate) return deepFreeze(duplicate);

      const casting = castByMethod(input.method, input.inputs ?? {}, { randomIndex, calendar });
      const hexagram = deriveHexagram(casting);
      const lunarMonth = casting.lunar?.month ?? created.getMonth() + 1;
      const relation = relationFromBody(hexagram.body.element, hexagram.use.element);
      const bodyStrength = seasonalStrength(hexagram.body.element, lunarMonth);
      const useStrength = seasonalStrength(hexagram.use.element, lunarMonth);
      const original = classicFor(classicsIndex, hexagram.originalId);
      const mutual = classicFor(classicsIndex, hexagram.mutualId);
      const changed = classicFor(classicsIndex, hexagram.changedId);
      const movingLineText = original.lineTexts[hexagram.movingLine - 1];
      const risk = classifyRisk(question);
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
      const snapshot = deepFreeze({
        question,
        category: input.category ?? 'general',
        background: String(input.background ?? '').trim(),
        method: input.method,
        inputs: { ...(input.inputs ?? {}) }
      });
      const calculationLog = [
        { label: '上卦数', value: String(casting.upperNumber) },
        { label: '下卦数', value: String(casting.lowerNumber) },
        { label: '动爻数', value: String(casting.movingLine) },
        { label: '本卦六爻', value: hexagram.originalId },
        { label: '体用关系', value: relation }
      ];
      if (casting.upperTotal) calculationLog.unshift({ label: '上卦总数', value: casting.upperTotal });
      if (casting.lowerTotal) calculationLog.splice(1, 0, { label: '下卦总数', value: casting.lowerTotal });

      const record = deepFreeze({
        id: recordId(created, hexagram.originalId),
        createdAt: created.toISOString(),
        question,
        category: input.category ?? 'general',
        background: String(input.background ?? '').trim(),
        questionFingerprint,
        method: input.method,
        algorithm: { id: casting.profileId, version: 1 },
        timeBasis: input.method === 'time' ? {
          timezone: input.inputs?.timezone ?? 'Asia/Shanghai',
          dayBoundary: input.inputs?.dayBoundary,
          yearBoundary: input.inputs?.yearBoundary,
          trueSolar: input.inputs?.trueSolar === true || input.inputs?.trueSolar === 'on',
          longitude: input.inputs?.longitude ? Number(input.inputs.longitude) : null,
          cityLabel: input.inputs?.cityLabel ?? '',
          correctionMinutes: casting.correctionMinutes ?? 0
        } : null,
        rawInputs: { ...(input.inputs ?? {}) },
        snapshot,
        hexagram: {
          originalId: hexagram.originalId,
          mutualId: hexagram.mutualId,
          changedId: hexagram.changedId,
          movingLine: hexagram.movingLine,
          originalLines: [...hexagram.originalLines],
          mutualLines: [...hexagram.mutualLines],
          changedLines: [...hexagram.changedLines],
          body: hexagram.body,
          use: hexagram.use
        },
        fiveElements: {
          relation,
          bodyElement: hexagram.body.element,
          useElement: hexagram.use.element,
          bodyStrength,
          useStrength,
          lunarMonth,
          profileId: STRENGTH_PROFILE_ID
        },
        classics: {
          original: { id: original.id, name: original.name, symbol: original.symbol, guaCi: original.judgment, image: original.image },
          mutual: { id: mutual.id, name: mutual.name, symbol: mutual.symbol, guaCi: mutual.judgment, image: mutual.image },
          changed: { id: changed.id, name: changed.name, symbol: changed.symbol, guaCi: changed.judgment, image: changed.image },
          movingLine: movingLineText
        },
        interpretation,
        risk,
        calculationLog,
        ai: { status: 'pending', readingId: null, reading: null, errorCode: null, updatedAt: created.toISOString() },
        schemaVersion: 2
      });

      await repository.saveRecord(record);
      try {
        const pending = onRecordSaved?.(record);
        pending?.catch?.(() => {});
      } catch {}
      return record;
    }
  });
}
