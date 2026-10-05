(() => {
  if (document.body.dataset.page !== 'portion') return;

  const formatOrder = ['premium', 'premium large', 'rebell', 'compact', 'rx slim', 'mini'];
  const normalize = value => String(value || '').trim().toLowerCase();
  function formatsFromProducts() {
    const rows = window.SwedsnusV2?.state.rows.filter(row => row.site_section === 'Portionssnus') || [];
    const formats = new Map();
    rows.forEach(row => {
      const value = normalize(row.format);
      if (value && !formats.has(value)) formats.set(value, [value, String(row.format).trim(), row.format_dimensions || '']);
    });
    return [...formats.values()].sort((a,b) => {
      const ai = formatOrder.indexOf(a[0]), bi = formatOrder.indexOf(b[0]);
      return (ai < 0 ? formatOrder.length : ai) - (bi < 0 ? formatOrder.length : bi) || a[1].localeCompare(b[1], 'sv');
    });
  }

  let activeFormat = '';
  let replacing = false;

  function applyFormatFilter() {
    const cards = [...document.querySelectorAll('.catalog-main .product-card')];
    if (!cards.length) return;

    cards.forEach(card => {
      const baseHidden = card.dataset.baseFilterHidden === 'true';
      const formatMatches = !activeFormat || card.dataset.portionFormat === activeFormat;
      card.hidden = baseHidden || !formatMatches;
    });

    const visibleCount = cards.filter(card => !card.hidden).length;
    const count = document.querySelector('[data-result-count]');
    if (count) count.textContent = `${visibleCount} produkter`;
  }

  function rememberBaseFilterState() {
    document.querySelectorAll('.catalog-main .product-card').forEach(card => {
      card.dataset.baseFilterHidden = card.hidden ? 'true' : 'false';
    });
    applyFormatFilter();
  }

  function refreshFilters() {
    document.dispatchEvent(new CustomEvent('swedsnus-v2:filters-refresh'));
  }

  function renderFormatPills() {
    if (replacing) return;
    const existing = document.querySelector('[data-series-filters]');
    const tools = document.querySelector('.catalog-main .catalog-tools');
    if (!existing && !tools) return;

    replacing = true;
    existing?.remove();

    const formats = formatsFromProducts();
    if (!formats.some(([value]) => value === activeFormat)) activeFormat = '';

    const root = document.createElement('section');
    root.className = 'series-filter-pills';
    root.dataset.seriesFilters = '';
    root.dataset.portionFormatFilters = '';
    root.setAttribute('aria-label', 'Filtrera på portionsformat');
    root.innerHTML = formats
      .map(([value, title, dimensions]) => `<button type="button" class="series-filter-pill${value === activeFormat ? ' active' : ''}" data-portion-format="${window.SwedsnusV2.escapeHtml(value)}" aria-pressed="${value === activeFormat}"><span class="series-filter-pill-copy"><strong>${window.SwedsnusV2.escapeHtml(title)}</strong><span>${window.SwedsnusV2.escapeHtml(dimensions)}</span></span><span class="series-filter-pill-remove" aria-hidden="true">×</span></button>`)
      .join('');

    (tools || existing)?.before(root);

    root.querySelectorAll('[data-portion-format]').forEach(button => {
      button.addEventListener('click', () => {
        const value = button.dataset.portionFormat;
        activeFormat = activeFormat === value ? '' : value;
        root.querySelectorAll('[data-portion-format]').forEach(item => {
          const selected = item.dataset.portionFormat === activeFormat;
          item.classList.toggle('active', selected);
          item.setAttribute('aria-pressed', String(selected));
        });
        refreshFilters();
      });
    });

    rememberBaseFilterState();
    replacing = false;
  }

  document.addEventListener('swedsnus-v2:cards-rendered', renderFormatPills);

  document.addEventListener('swedsnus-v2:filters-applied', rememberBaseFilterState);

  if (window.SwedsnusV2?.state.ready) queueMicrotask(renderFormatPills);
})();
