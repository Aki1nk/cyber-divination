export const STRENGTH_PROFILE_ID = 'four-seasons-earth-months-v1';

const generation = Object.freeze({ wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' });
const overcoming = Object.freeze({ wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' });

export function relationFromBody(bodyElement, useElement) {
  if (bodyElement === useElement) return 'same_element';
  if (generation[bodyElement] === useElement) return 'body_generates_use';
  if (generation[useElement] === bodyElement) return 'use_generates_body';
  if (overcoming[bodyElement] === useElement) return 'body_overcomes_use';
  if (overcoming[useElement] === bodyElement) return 'use_overcomes_body';
  throw new RangeError('未知五行');
}

function seasonalElement(month) {
  if (month >= 1 && month <= 3) return 'wood';
  if (month >= 4 && month <= 6) return 'fire';
  if (month >= 7 && month <= 9) return 'metal';
  if (month >= 10 && month <= 12) return 'water';
  throw new RangeError('农历月份必须在 1 至 12 之间');
}

export function seasonalStrength(element, lunarMonth) {
  const season = seasonalElement(lunarMonth);
  if (element === 'earth' && [3, 6, 9, 12].includes(lunarMonth)) return 'prosperous';
  if (element === season) return 'prosperous';
  if (generation[season] === element) return 'supported';
  if (generation[element] === season || overcoming[season] === element) return 'resting';
  return 'weakened';
}
