import { escapeHtml } from '../dom.js';

export function renderReasonList(reasonKeys = []) {
  return `<details class="reason-list"><summary>查看推演依据</summary><ul>${reasonKeys.map((key) => `<li><code>${escapeHtml(key)}</code></li>`).join('')}</ul></details>`;
}
