import { moduloIndex } from '../modulo.js';
import { hourBranchNumber } from '../calendar.js';

export function castTime(input, { calendar, dayBoundary, yearBoundary = 'lunar-new-year' }) {
  if (!calendar?.convert) throw new TypeError('缺少历法适配器');
  if (input.hour === 23 && !dayBoundary) throw new Error('23:00 至 23:59 必须明确选择子时换日规则');
  const lunar = calendar.convert(input, { dayBoundary: dayBoundary || 'midnight', yearBoundary });
  const hourNumber = hourBranchNumber(input.hour);
  const upperTotal = BigInt(lunar.yearBranchNumber + lunar.month + lunar.day);
  const lowerTotal = upperTotal + BigInt(hourNumber);
  return Object.freeze({
    profileId: 'meihua-time-classic-v1',
    lunar,
    yearBranchNumber: lunar.yearBranchNumber,
    hourBranchNumber: hourNumber,
    upperTotal: upperTotal.toString(),
    lowerTotal: lowerTotal.toString(),
    upperNumber: moduloIndex(upperTotal, 8n),
    lowerNumber: moduloIndex(lowerTotal, 8n),
    movingLine: moduloIndex(lowerTotal, 6n)
  });
}
