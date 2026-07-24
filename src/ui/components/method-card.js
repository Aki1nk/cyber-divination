export function renderMethodCard({ value, title, description, meta = '', checked = false }) {
  return `
    <label class="method-card" data-method="${value}">
      <input type="radio" name="method" value="${value}" ${checked ? 'checked' : ''}>
      <span class="method-card__mark" aria-hidden="true"></span>
      <span class="method-card__copy"><strong>${title}</strong><small>${description}</small></span>
      ${meta ? `<span class="method-card__meta">${meta}</span>` : ''}
    </label>`;
}
