export function renderHexagramLines(lines = [], movingLine = null) {
  return `<div class="hexagram-lines">${lines.map((line, index) => `
    <div class="hexagram-line ${line === 1 ? 'is-yang' : 'is-yin'}${movingLine === index + 1 ? ' is-moving' : ''}" aria-label="第 ${index + 1} 爻${line === 1 ? '阳' : '阴'}爻">
      <i></i><i></i><span>${index + 1}</span>
    </div>`).join('')}</div>`;
}
