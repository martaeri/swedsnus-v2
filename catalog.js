(() => {
  const routes = {
    portion: row => row.product_family === 'Portionssnus' && row.site_section === 'Portionssnus' && row.tobacco_type !== 'Tobaksfri',
    los: row => row.product_family === 'Lössnus' || row.aroma_type === 'Expressarom',
    'gor-eget': row => row.site_section === 'Gör eget' || row.aroma_type === 'Super Dry Arom',
    'vitt-snus': row => row.tobacco_type === 'Tobaksfri' || row.site_section === 'Vitt snus',
    tillbehor: row => row.product_family === 'Tillbehör'
  };
  const split = value => String(value || '').split(',').map(x => x.trim()).filter(Boolean);
  const unique = values => [...new Set(values.filter(Boolean).map(String))].sort((a,b)=>a.localeCompare(b,'sv'));

  function currentPage() { return document.body.dataset.page || ''; }
  function renderFilters(rows) {
    const sidebar = document.querySelector('[data-filter-sidebar]');
    if (!sidebar) return;
    const groups = currentPage() === 'tillbehor'
      ? [['Typ','type',unique(rows.map(r=>r.accessory_type))],['Färg','color',unique(rows.map(r=>r.design_color || r.filter_color))]]
      : [['Smak','taste',unique(rows.flatMap(r=>split(r.taste_variables)))],['Typ','type',unique(rows.map(r=>r.product_line || r.aroma_type))],['Format','format',unique(rows.map(r=>r.format || r.grind))],['Styrka','strength',unique(rows.map(r=>r.strength))]];
    sidebar.innerHTML = `<div class="filter-title">Filtrera</div>${groups.filter(([, ,v])=>v.length).map(([title,key,values])=>`<div class="filter-group" data-filter-group="${key}"><h4>${title}</h4>${values.map(value=>`<label class="filter-option"><input type="checkbox" value="${window.SwedsnusV2.escapeHtml(value)}">${window.SwedsnusV2.escapeHtml(value)}</label>`).join('')}</div>`).join('')}`;
  }

  function applyFilters() {
    const cards = [...document.querySelectorAll('.catalog-main .product-card')];
    const query = (document.querySelector('[data-product-search]')?.value || '').trim().toLowerCase();
    const groups = [...document.querySelectorAll('[data-filter-group]')];
    let count = 0;
    cards.forEach(card => {
      const hay = `${card.dataset.name} ${card.dataset.taste} ${card.dataset.format} ${card.dataset.strength}`;
      const matchesSearch = !query || hay.includes(query);
      const matchesGroups = groups.every(group => {
        const checked = [...group.querySelectorAll('input:checked')].map(i=>i.value.toLowerCase());
        if (!checked.length) return true;
        const key = group.dataset.filterGroup;
        const value = key === 'taste' ? card.dataset.taste : key === 'format' ? card.dataset.format : key === 'strength' ? card.dataset.strength : hay;
        return checked.some(item => value.includes(item));
      });
      const show = matchesSearch && matchesGroups;
      card.hidden = !show;
      if(show) count++;
    });
    const countEl = document.querySelector('[data-result-count]');
    if(countEl) countEl.textContent = `${count} produkter`;
  }

  function renderCatalog() {
    const api = window.SwedsnusV2;
    const key = currentPage();
    const grid = document.querySelector('[data-catalog-grid]');
    if (!grid || !routes[key]) return;
    const rows = api.state.rows.filter(routes[key]);
    grid.innerHTML = rows.map(api.card).join('');
    renderFilters(rows);
    document.querySelectorAll('[data-filter-group] input').forEach(i=>i.addEventListener('change', applyFilters));
    document.querySelector('[data-product-search]')?.addEventListener('input', applyFilters);
    applyFilters();
    document.dispatchEvent(new CustomEvent('swedsnus-v2:cards-rendered'));
  }

  function renderHome() {
    if (currentPage() !== 'home') return;
    const api = window.SwedsnusV2;
    const rail = (selector, filter) => { const el=document.querySelector(selector); if(el) el.innerHTML=api.state.rows.filter(filter).slice(0,5).map(api.card).join(''); };
    rail('[data-home-portion]', routes.portion);
    rail('[data-home-los]', routes.los);
    rail('[data-home-white]', routes['vitt-snus']);
    document.dispatchEvent(new CustomEvent('swedsnus-v2:cards-rendered'));
  }

  function renderProduct() {
    if (currentPage() !== 'product') return;
    const api = window.SwedsnusV2;
    const id = new URLSearchParams(location.search).get('id');
    const row = api.find(id);
    const root = document.querySelector('[data-product-detail]');
    if (!row || !root) { if(root) root.innerHTML='<div class="product-summary"><h1>Produkt hittades inte</h1><p>Produktlänken kunde inte matchas mot produktdatan.</p></div>'; return; }
    document.title = `${api.name(row)} — Swedsnus`;
    const specs = [['Produktfamilj',row.product_family],['Produktlinje',row.product_line || row.aroma_type],['Smak',row.taste_display],['Format',row.format],['Malningsgrad',row.grind],['Styrka',row.strength],['Förpackning',row.amount_dosor ? `${row.amount_dosor} dosor` : row.package_quantity],['Tillverkning',row.manufacturing_location]].filter(([,v])=>v);
    root.innerHTML = `<div class="product-gallery">Produktbild</div><section class="product-summary"><p class="kicker">${api.escapeHtml(row.product_line || row.product_family)}</p><h1>${api.escapeHtml(api.name(row))}</h1><p>${api.escapeHtml(row.short_description || 'Kort produktbeskrivning hämtas från den centrala produktdatan när den finns tillgänglig.')}</p><div class="price">${api.price(row)}</div><button class="btn primary" data-add-cart="${api.escapeHtml(api.key(row))}">Lägg i varukorg</button><dl class="spec-list">${specs.map(([k,v])=>`<div class="spec-row"><dt>${api.escapeHtml(k)}</dt><dd>${api.escapeHtml(v)}</dd></div>`).join('')}</dl></section>`;
    const content = document.querySelector('[data-product-content]');
    if(content) content.innerHTML = `<article><p class="kicker">Produktinformation</p><h2>Om produkten</h2><p>Här kan en kortare faktabaserad text om produktens egenskaper, format och användningsområde ligga. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante venenatis dapibus.</p></article><article><p class="kicker">Hantering</p><h2>Förvaring och beredning</h2><p>Här kan relevant information om förvaring eller beredning ligga beroende på produkttyp. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec ullamcorper nulla non metus auctor fringilla.</p></article><article class="ingredients"><p class="kicker">Deklaration</p><h2>Innehållsförteckning</h2><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p></article>`;
    if(row.tobacco_type === 'Tobaksfri') document.querySelector('[data-product-warning]')?.removeAttribute('hidden');
  }

  document.addEventListener('swedsnus-v2:products-ready', () => { renderCatalog(); renderHome(); renderProduct(); });
})();
