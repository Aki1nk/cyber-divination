import { moduloIndex, normalizeReportedInteger } from '../modulo.js';

export function castNumberPair(first, second) {
  const firstValue = normalizeReportedInteger(first);
  const secondValue = normalizeReportedInteger(second);
  return Object.freeze({
    profileId: 'number-pair-v1',
    upperNumber: moduloIndex(firstValue, 8n),
    lowerNumber: moduloIndex(secondValue, 8n),
    movingLine: moduloIndex(firstValue + secondValue, 6n),
    raw: Object.freeze([String(first).trim(), String(second).trim()])
  });
}

export function castNumberTriple(first, second, third) {
  const firstValue = normalizeReportedInteger(first);
  const secondValue = normalizeReportedInteger(second);
  const thirdValue = normalizeReportedInteger(third);
  return Object.freeze({
    profileId: 'number-triple-v1',
    upperNumber: moduloIndex(firstValue, 8n),
    lowerNumber: moduloIndex(secondValue, 8n),
    movingLine: moduloIndex(thirdValue, 6n),
    raw: Object.freeze([String(first).trim(), String(second).trim(), String(third).trim()])
  });
}
