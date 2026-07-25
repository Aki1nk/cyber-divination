import { renderMethodCard } from '../components/method-card.js';
import { renderTimeFields } from '../components/time-fields.js';
import { renderExternalFields } from '../components/external-fields.js';

export function renderAsk() {
  return `
    <section class="ask-view" aria-labelledby="ask-title">
      <header class="view-heading"><p>一事一占 · 一念一问</p><h1 id="ask-title">诚心问易</h1><span>请先定问，再择法取象</span></header>
      <form class="casting-form" data-casting-form>
        <fieldset class="form-section"><legend><span>壹</span> 定问</legend>
          <label>所问之事<textarea name="question" rows="3" maxlength="160" required placeholder="请聚焦一件具体、可行动的事情"></textarea></label>
          <div class="field-grid">
            <label>问题类别<select name="category"><option value="career">事业选择</option><option value="relationship">人际感情</option><option value="study">学业成长</option><option value="travel">行程计划</option><option value="general">其他事项</option></select></label>
            <label>背景补充<input name="background" maxlength="200" placeholder="选填，将随新占问上传用于具体解读"></label>
          </div>
        </fieldset>
        <fieldset class="form-section"><legend><span>贰</span> 择法</legend>
          <div class="method-grid">
            ${renderMethodCard({ value: 'number-pair', title: '数字起卦', description: '报两个整数：上卦、下卦与合数定动爻', meta: '双数', checked: true })}
            ${renderMethodCard({ value: 'number-triple', title: '数字起卦', description: '报三个整数：第三数单独定动爻', meta: '三数' })}
            ${renderMethodCard({ value: 'time', title: '时间起卦', description: '按农历年月日时支取数，可选真太阳时', meta: '传统' })}
            ${renderMethodCard({ value: 'digital-symbol', title: '数字取象', description: '使用本机安全随机源生成三项取数', meta: '现代数字取象法' })}
            ${renderMethodCard({ value: 'external', title: '外应取象', description: '依据物象、方位、数量和时支取数', meta: '需确认' })}
          </div>
        </fieldset>
        <fieldset class="form-section"><legend><span>叁</span> 取数</legend>
          <div class="method-panel" data-method-panel="number-pair">
            <div class="field-grid"><label>第一个整数<input name="first" inputmode="numeric" value="9"></label><label>第二个整数<input name="second" inputmode="numeric" value="16"></label></div>
          </div>
          <div class="method-panel" data-method-panel="number-triple" hidden>
            <div class="field-grid field-grid--three"><label>上卦数<input name="tripleFirst" inputmode="numeric" value="9"></label><label>下卦数<input name="tripleSecond" inputmode="numeric" value="16"></label><label>动爻数<input name="third" inputmode="numeric" value="7"></label></div>
          </div>
          <div class="method-panel" data-method-panel="digital-symbol" hidden><p class="method-notice"><strong>现代数字取象法</strong>此法并非古籍原法。随机取数只在本机完成；起卦完成后，新占问与排盘快照仍会按统一规则上传。</p></div>
          ${renderTimeFields()}
          ${renderExternalFields()}
        </fieldset>
        <section class="confirmation-card"><strong>肆 · 确认</strong><p>提交后将生成不可变计算快照。同一问题 24 小时内再次占问，将返回原卦以避免反复占问。</p><p class="cloud-upload-disclosure"><strong>云端上传提示：</strong>所有新占问都会上传问题、背景、排盘事实与本地解读，并使用匿名设备编号经第三方 AI 中转服务提交给 GPT-5.4 mini 生成 AI 深解；本站云端记录保留 30 天。中转服务及其上游供应商的数据处理和保留规则以各自政策为准。离线时先保存在本机队列，联网后自动上传。</p><button class="primary-action primary-action--button" type="submit"><span>确认起卦</span><small>本地排盘 · 云端 AI 深解</small></button><p class="form-status" role="status" data-form-status></p></section>
      </form>
    </section>`;
}
