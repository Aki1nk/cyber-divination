import { APP_BUILD, APP_VERSION } from '../../app/version.js';

export function renderPrivacy() {
  return `<section class="secondary-view privacy-view" aria-labelledby="privacy-title">
    <header class="view-heading"><p>本地排盘 · 云端深解 · 明示边界</p><h1 id="privacy-title">隐私与安全边界</h1><span>在起卦之前，先说明数据、保留期限与责任边界</span></header>
    <article class="policy-card"><h2>本机与云端数据</h2><p>本地卦录保存在当前设备，确定性排盘与本地解读不依赖云端即可完成。所有新占问会上传问题、背景、起卦输入、排盘事实、本地解读和风险分类，用于生成 AI 深解。</p><ul><li>浏览器生成匿名设备编号，用于聚合同一浏览器的记录；不要求账号，不主动保存姓名、邮箱、手机号或真实身份。</li><li>云端会经第三方 AI 中转服务提交给 GPT-5.5 生成结构化解读，并在请求中设置 <code>store: false</code>；本站云端记录保留 30 天后自动删除。中转服务及其上游供应商的数据处理和保留规则以各自政策为准。</li><li>问题指纹仍只在本机使用 SHA-256 生成，用于 24 小时内避免重复占问。</li><li>离线起卦会先完成本地结果，并把 AI 请求放入本机队列，联网后自动上传。</li></ul></article>
    <article class="policy-card"><h2>定位权限</h2><p>只有在时间起卦时主动点击“使用当前位置”，应用才会请求定位权限。</p><ul><li>只读取本次真太阳时计算所需的经度，不持续追踪位置。</li><li>拒绝授权后仍可使用民用时间，或手动填写经度。</li></ul></article>
    <article class="policy-card policy-card--boundary"><h2>现实决策边界</h2><p>本应用用于传统文化学习、结构化反思与娱乐体验，不替代医疗、法律或投资专业意见。</p><ul><li>不预测死亡时间，不判断疾病能否治愈。</li><li>不保证关系、事业、诉讼或财务结果。</li><li>不提供具体买卖、加杠杆、借贷或违法规避指令。</li><li>遇到紧急健康、自伤或人身安全风险，请立即联系当地急救服务和可信任的人。</li></ul></article>
    <article class="policy-card"><h2>如何控制数据</h2><p>可在设置页查看并清除本机卦录。清除浏览器数据不会提前删除已经上传的云端记录；云端记录由管理员按需删除，或在创建 30 天后自动删除。</p><a class="text-link" href="#/settings">返回设置</a></article>
    <p class="app-version" aria-label="应用版本信息">版本 ${APP_VERSION} · 构建 ${APP_BUILD}</p>
  </section>`;
}
