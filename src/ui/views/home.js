export function renderHome() {
  return `
    <section class="home-view" aria-labelledby="home-title">
      <div class="home-orbit" aria-hidden="true"><span>☰</span><span>☷</span><b>易</b></div>
      <p class="home-kicker">梅花易数 · 本地确定性推演</p>
      <h1 id="home-title">一念既起<br><em>万象有应</em></h1>
      <p class="home-lead">依传统起卦次序，呈现本卦、互卦、变卦、体用与五行旺衰。经典原文、规则推演和现代释义分层展示。</p>
      <a class="primary-action" href="#/ask"><span>诚心问易</span><small>开始一次完整起卦</small></a>
      <div class="home-features" aria-label="产品特点">
        <span>离线可用</span><span>仅存本机</span><span>过程可复核</span>
      </div>
      <aside class="culture-note"><strong>文化体验声明</strong><p>本应用用于传统文化学习与自我反思，不替代医疗、法律、投资等专业意见，也不承诺具体结果。</p></aside>
    </section>`;
}
