export function longitudeCorrectionMinutes({ longitude, standardMeridian }) {
  if (!Number.isFinite(longitude) || !Number.isFinite(standardMeridian)) throw new TypeError('经度必须是有限数值');
  return 4 * (longitude - standardMeridian);
}

export function equationOfTimeMinutes(date) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start) / 86_400_000);
  const gamma = (2 * Math.PI / 365) * (dayOfYear - 1 + (date.getUTCHours() - 12) / 24);
  return 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
}

export function trueSolarCorrectionMinutes({ date, longitude, utcOffsetHours }) {
  return equationOfTimeMinutes(date) + longitudeCorrectionMinutes({ longitude, standardMeridian: utcOffsetHours * 15 });
}
