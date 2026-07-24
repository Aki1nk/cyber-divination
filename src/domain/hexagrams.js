import { getTrigram, getTrigramByLines } from './trigrams.js';

function validateMovingLine(movingLine) {
  if (!Number.isInteger(movingLine) || movingLine < 1 || movingLine > 6) {
    throw new RangeError('动爻必须在 1 至 6 之间');
  }
}

function toId(lines) {
  return lines.join('');
}

export function deriveHexagram({ upperNumber, lowerNumber, movingLine }) {
  validateMovingLine(movingLine);
  const upper = getTrigram(upperNumber);
  const lower = getTrigram(lowerNumber);
  const originalLines = [...lower.lines, ...upper.lines];
  const changedLines = [...originalLines];
  changedLines[movingLine - 1] = changedLines[movingLine - 1] === 1 ? 0 : 1;
  const mutualLines = [originalLines[1], originalLines[2], originalLines[3], originalLines[2], originalLines[3], originalLines[4]];
  const changedLower = getTrigramByLines(changedLines.slice(0, 3));
  const changedUpper = getTrigramByLines(changedLines.slice(3, 6));
  const mutualLower = getTrigramByLines(mutualLines.slice(0, 3));
  const mutualUpper = getTrigramByLines(mutualLines.slice(3, 6));
  const movingInLower = movingLine <= 3;

  return Object.freeze({
    upper,
    lower,
    movingLine,
    originalLines: Object.freeze(originalLines),
    changedLines: Object.freeze(changedLines),
    mutualLines: Object.freeze(mutualLines),
    originalId: toId(originalLines),
    changedId: toId(changedLines),
    mutualId: toId(mutualLines),
    changedUpper,
    changedLower,
    mutualUpper,
    mutualLower,
    body: movingInLower ? upper : lower,
    use: movingInLower ? lower : upper
  });
}
