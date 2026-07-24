export function renderTimeFields() {
  return `
    <div class="method-panel" data-method-panel="time" hidden>
      <div class="field-grid field-grid--date">
        <label>公历年<input name="year" type="number" min="1900" max="2100" value="2026"></label>
        <label>月<input name="month" type="number" min="1" max="12" value="7"></label>
        <label>日<input name="day" type="number" min="1" max="31" value="24"></label>
        <label>时<input name="hour" type="number" min="0" max="23" value="10"></label>
        <label>分<input name="minute" type="number" min="0" max="59" value="0"></label>
      </div>
      <div class="field-grid">
        <label>子时换日<select name="dayBoundary"><option value="midnight">午夜换日</option><option value="early-zi">早子时换日</option></select></label>
        <label>年界口径<select name="yearBoundary"><option value="lunar-new-year">农历新年</option><option value="start-of-spring">立春</option></select></label>
        <label>时区<input name="timezone" value="Asia/Shanghai" readonly></label>
      </div>
      <label class="switch-row"><input type="checkbox" name="trueSolar"><span>启用真太阳时校正</span></label>
      <div class="solar-fields" data-solar-fields hidden>
        <label>手动经度<input name="longitude" type="number" step="0.0001" min="-180" max="180" placeholder="例如 121.4737"></label>
        <label>城市标签<input name="cityLabel" placeholder="仅保存本次标签"></label>
        <input name="utcOffsetHours" type="hidden" value="8">
        <button class="secondary-action" type="button" data-location>使用当前位置</button>
        <p>定位仅在点击后触发，只取本次计算所需经度，不持续追踪。</p>
      </div>
    </div>`;
}
