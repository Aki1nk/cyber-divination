const TRIGRAM_OPTIONS = [
  [1, '乾 · 天/圆形/金属'], [2, '兑 · 泽/口/少女'], [3, '离 · 火/光/文书'], [4, '震 · 雷/动/长男'],
  [5, '巽 · 风/木器/长女'], [6, '坎 · 水/月/沟渠'], [7, '艮 · 山/石/少男'], [8, '坤 · 地/布帛/母']
];

function options() {
  return TRIGRAM_OPTIONS.map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
}

export function renderExternalFields() {
  return `
    <div class="method-panel" data-method-panel="external" hidden>
      <label>所见物象<select name="objectTrigram">${options()}</select></label>
      <label>来向方位<select name="directionTrigram">${options()}</select></label>
      <div class="field-grid">
        <label>所见数量<input name="count" type="number" step="1" value="1"></label>
        <label>当下时支数<input name="hourBranchNumber" type="number" min="1" max="12" value="1"></label>
      </div>
      <label class="confirm-row"><input type="checkbox" name="confirmed"><span>我已核对物象与方位映射，确认后再起卦</span></label>
    </div>`;
}
