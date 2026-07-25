import { APP_BUILD, APP_VERSION } from '../../app/version.js';

export function renderPrivacy() {
  return `<section class="secondary-view privacy-view" aria-labelledby="privacy-title">
    <header class="view-heading"><p>本地排盘 · 云端深解 · 明示边界</p><h1 id="privacy-title">隐私与安全边界</h1><span>在起卦之前，先说明数据、保留期限与责任边界</span></header>
    <article class="policy-card"><h2>账户、本机与云端数据</h2><p>注册会保存手机号、可选昵称、邀请码使用记录及密码哈希；管理员可添加仅后台可见的用户备注。本地卦录保存在当前设备。所有新占问会上传问题、背景、排盘事实和本地解读，并关联登录账户，用于生成 AI 深解。</p><ul><li>浏览器仍生成设备编号用于本机幂等和诊断，但云端访问权限以登录账户为准，旧本机历史不会自动绑定新账户。</li><li>云端会经第三方 AI 中转服务提交给 GPT-5.5，并在请求中设置 <code>store: false</code>；本站云端记录保留 30 天后自动删除。中转服务及其上游供应商的数据处理和保留规则以各自政策为准。</li><li>问题指纹只在本机使用 SHA-256 生成，用于 24 小时内避免重复占问。</li><li>离线起卦先完成本地结果；只有登录后新建且属于当前账户的队列任务会自动上传。</li></ul></article>
    <article class="policy-card"><h2>定位权限</h2><p>只有在时间起卦时主动点击“使用当前位置”，应用才会请求定位权限；只读取本次真太阳时计算所需的经度，不持续追踪位置。</p></article>
    <article class="policy-card policy-card--boundary"><h2>现实决策边界</h2><p>本应用用于传统文化学习、结构化反思与娱乐体验，不替代医疗、法律或投资专业意见。</p><ul><li>不预测死亡时间，不判断疾病能否治愈。</li><li>不保证关系、事业、诉讼或财务结果。</li><li>不提供具体买卖、加杠杆、借贷或违法规避指令。</li></ul></article>
    <article class="policy-card"><h2>如何控制数据</h2><p>账户中心可改密、退出或注销账户；设置页可清除本机卦录。云端记录由管理员提前删除或在创建 30 天后自动删除。</p><a class="text-link" href="#/settings">返回设置</a></article>
    <p class="app-version" aria-label="应用版本信息">版本 ${APP_VERSION} · 构建 ${APP_BUILD}</p>
  </section>`;
}
