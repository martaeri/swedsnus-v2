(() => {
  if (document.body.dataset.page !== 'portion') return;

  const formats = [
    ['premium', 'Premium', '18 × 33 mm'],
    ['rebell', 'Rebell', '17 × 30 mm'],
    ['compact', 'Compact', '16 × 30 mm'],
    ['rx slim', 'RX Slim', '14 × 33 mm'],
    ['mini', 'Mini', '12 × 29 mm']
  ];

  let activeFormat = '';
  let replacing = false;

  function applyFormatFilter() {
    const cards = [...document.querySelectorAll('.catalog-main .product-card')];
    if (!cards.length) return;

    cards.forEach(card => {
      const baseHidden = card.dataset.baseFilterHidden === 'true';
      const formatMatches = !activeFormat || card.dataset.format === activeFormat;
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
    const search = document.querySelector('[data-product-search]');
    if (search) {
      search.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      rememberBaseFilterState();
    }
  }

  function renderFormatPills() {
    if (replacing) return;
    const existing = document.querySelector('[data-series-filters]');
    const tools = document.querySelector('.catalog-main .catalog-tools');
    if (!existing && !tools) return;

    replacing = true;
    existing?.remove();

    const available = new Set(
      [...document.querySelectorAll('.catalog-main .product-card')]
        .map(card => card.dataset.format)
        .filter(Boolean)
    );

    const root = document.createElement('section');
    root.className = 'series-filter-pills';
    root.dataset.seriesFilters = '';
    root.dataset.portionFormatFilters = '';
    root.setAttribute('aria-label', 'Filtrera på portionsformat');
    root.innerHTML = formats
      .filter(([value]) => available.has(value))
      .map(([value, title, dimensions]) => `<button type="button" class="series-filter-pill" data-portion-format="${value}" aria-pressed="false"><span class="series-filter-pill-copy"><strong>${title}</strong><span>${dimensions}</span></span><span class="series-filter-pill-remove" aria-hidden="true">×</span></button>`)
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

  document.addEventListener('input', event => {
    if (event.target.matches?.('[data-product-search]')) {
      queueMicrotask(rememberBaseFilterState);
    }
  });

  document.addEventListener('change', event => {
    if (event.target.matches?.('[data-filter-group] input')) {
      queueMicrotask(rememberBaseFilterState);
    }
  });

  if (window.SwedsnusV2?.state.ready) queueMicrotask(renderFormatPills);
})();
