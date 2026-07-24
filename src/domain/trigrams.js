const definitions = [
  { number: 1, key: 'qian', name: '乾', lines: [1, 1, 1], element: 'metal', direction: 'northwest' },
  { number: 2, key: 'dui', name: '兑', lines: [1, 1, 0], element: 'metal', direction: 'west' },
  { number: 3, key: 'li', name: '离', lines: [1, 0, 1], element: 'fire', direction: 'south' },
  { number: 4, key: 'zhen', name: '震', lines: [1, 0, 0], element: 'wood', direction: 'east' },
  { number: 5, key: 'xun', name: '巽', lines: [0, 1, 1], element: 'wood', direction: 'southeast' },
  { number: 6, key: 'kan', name: '坎', lines: [0, 1, 0], element: 'water', direction: 'north' },
  { number: 7, key: 'gen', name: '艮', lines: [0, 0, 1], element: 'earth', direction: 'northeast' },
  { number: 8, key: 'kun', name: '坤', lines: [0, 0, 0], element: 'earth', direction: 'southwest' }
].map((item) => Object.freeze({ ...item, lines: Object.freeze(item.lines) }));

export const TRIGRAMS = Object.freeze(definitions);

export function getTrigram(number) {
  const trigram = TRIGRAMS[number - 1];
  if (!trigram) throw new RangeError('卦数必须在 1 至 8 之间');
  return trigram;
}

export function getTrigramByLines(lines) {
  const key = lines.join('');
  const trigram = TRIGRAMS.find((candidate) => candidate.lines.join('') === key);
  if (!trigram) throw new RangeError('无法识别三爻结构');
  return trigram;
}
