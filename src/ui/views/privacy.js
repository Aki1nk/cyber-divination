import { APP_BUILD, APP_VERSION } from '../../app/version.js';

export function renderPrivacy() {
  return `<section class="secondary-view privacy-view" aria-labelledby="privacy-title">
    <header class="view-heading"><p>本地优先 · 明示边界</p><h1 id="privacy-title">隐私与安全边界</h1><span>在起卦之前，先说明数据与责任边界</span></header>
    <article class="policy-card"><h2>本机数据</h2><p>所有占问与卦录仅保存在当前设备的浏览器存储中，不会上传到服务器。</p><ul><li>没有账号、后端、云同步、广告或分析 SDK。</li><li>问题指纹仅在本机使用 SHA-256 生成，用于 24 小时内避免重复占问。</li><li>清除浏览器站点数据会同时删除卦录、设置与离线缓存。</li></ul></article>
    <article class="policy-card"><h2>定位权限</h2><p>只有在时间起卦时主动点击“使用当前位置”，应用才会请求定位权限。</p><ul><li>只读取本次真太阳时计算所需的经度，不持续追踪位置。</li><li>拒绝授权后仍可使用民用时间，或手动填写经度。</li></ul></article>
    <article class="policy-card policy-card--boundary"><h2>现实决策边界</h2><p>本应用用于传统文化学习、结构化反思与娱乐体验，不替代医疗、法律或投资专业意见。</p><ul><li>不预测死亡时间，不判断疾病能否治愈。</li><li>不保证关系、事业、诉讼或财务结果。</li><li>不提供具体买卖、加杠杆、借贷或违法规避指令。</li><li>遇到紧急健康、自伤或人身安全风险，请立即联系当地急救服务和可信任的人。</li></ul></article>
    <article class="policy-card"><h2>如何控制数据</h2><p>可在设置页查看本机卦录数量并清除全部记录；首版不提供导出，避免误以为数据已备份。</p><a class="text-link" href="#/settings">返回设置</a></article>
    <p class="app-version" aria-label="应用版本信息">版本 ${APP_VERSION} · 构建 ${APP_BUILD}</p>
  </section>`;
}
