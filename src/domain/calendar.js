const BRANCHES = Object.freeze(['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']);

function shiftDate(input, days) {
  const date = new Date(Date.UTC(input.year, input.month - 1, input.day + days, input.hour, input.minute || 0, input.second || 0));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate(), hour: input.hour, minute: input.minute || 0, second: input.second || 0 };
}

export function hourBranchNumber(hour) {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) throw new RangeError('小时必须在 0 至 23 之间');
  return hour === 23 ? 1 : Math.floor((hour + 1) / 2) + 1;
}

export function createCalendarAdapter(api) {
  if (!api?.Solar?.fromYmdHms) throw new TypeError('历法 API 不完整');
  return Object.freeze({
    convert(input, { dayBoundary = 'midnight', yearBoundary = 'lunar-new-year' } = {}) {
      const adjusted = dayBoundary === 'early-zi' && input.hour === 23 ? shiftDate(input, 1) : { ...input };
      const lunar = api.Solar.fromYmdHms(adjusted.year, adjusted.month, adjusted.day, adjusted.hour, adjusted.minute || 0, adjusted.second || 0).getLunar();
      const monthValue = lunar.getMonth();
      const yearBranch = yearBoundary === 'start-of-spring' ? lunar.getYearZhiByLiChun() : lunar.getYearZhi();
      return Object.freeze({
        yearBranch,
        yearBranchNumber: BRANCHES.indexOf(yearBranch) + 1,
        month: Math.abs(monthValue),
        day: lunar.getDay(),
        isLeapMonth: monthValue < 0,
        adjustedDate: Object.freeze(adjusted)
      });
    }
  });
}
