function lineClass(value) {
  return value === 1 ? 'yang' : 'yin';
}

export function renderRitual(record) {
  const lines = record.hexagram.originalLines.map((value, index) => `
    <div class="ritual-line ${lineClass(value)}${record.hexagram.movingLine === index + 1 ? ' is-moving' : ''}" style="--reveal-index:${index}" aria-label="第 ${index + 1} 爻${value === 1 ? '阳' : '阴'}爻">
      <i></i><i></i><span>${index + 1}</span>
    </div>`).join('');
  return `<section class="ritual-view" aria-live="polite"><p>取数既定 · 六爻成象</p><h1>正在成卦</h1><div class="ritual-hexagram">${lines}</div><span>推演仅在本机完成</span></section>`;
}
