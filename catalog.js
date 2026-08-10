(() => {
  const routes = {
    portion: row => row.product_family === 'Portionssnus' && row.site_section === 'Portionssnus' && row.tobacco_type !== 'Tobaksfri',
    los: row => row.product_family === 'Lössnus' || row.aroma_type === 'Expressarom',
    'gor-eget': row => row.site_section === 'Gör eget' || row.aroma_type === 'Super Dry Arom',
    'vitt-snus': row => row.tobacco_type === 'Tobaksfri' || row.site_section === 'Vitt snus',
    tillbehor: row => row.product_family === 'Tillbehör'
  };
  const split = value => String(value || '').split(',').map(x => x.trim()).filter(Boolean);
  const unique = values => [...new Set(values.filter(v=>v!==null&&v!==undefined&&String(v).trim()!=='').map(String))].sort((a,b)=>a.localeCompare(b,'sv'));
  function currentPage() { return document.body.dataset.page || ''; }
  function renderFilters(rows) {
    const sidebar = document.querySelector('[data-filter-sidebar]');
    if (!sidebar) return;
    const groups = currentPage() === 'tillbehor'
      ? [['Typ','type',unique(rows.map(r=>r.accessory_type))],['Färg','color',unique(rows.map(r=>r.design_color || r.filter_color))]]
      : [['Smak','taste',unique(rows.flatMap(r=>split(r.taste_variables)))],['Typ','type',unique(rows.map(r=>r.product_line || r.aroma_type))],['Format','format',unique(rows.map(r=>r.format || r.grind))],['Styrka','strength',unique(rows.map(r=>r.strength))]];
    sidebar.innerHTML = `<div class="filter-title"><span>Filtrera</span><button type="button" data-mobile-filter-close aria-label="Stäng filter">×</button></div>${groups.filter(([, ,v])=>v.length).map(([title,key,values])=>`<div class="filter-group" data-filter-group="${key}"><h4>${title}</h4>${values.map(value=>`<label class="filter-option"><input type="checkbox" value="${window.SwedsnusV2.escapeHtml(value)}">${window.SwedsnusV2.escapeHtml(value)}</label>`).join('')}</div>`).join('')}`;
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
    const sidebar = document.querySelector('[data-filter-sidebar]');
    if (sidebar && !document.querySelector('[data-mobile-filter-toggle]')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mobile-filter-toggle';
      button.dataset.mobileFilterToggle = '';
      button.innerHTML = `<span>Filter</span><b data-mobile-filter-count>0</b>`;
      sidebar.before(button);
    }
    const updateFilterCount = () => {
      const count = document.querySelectorAll('[data-filter-group] input:checked').length;
      const el = document.querySelector('[data-mobile-filter-count]');
      if (el) el.textContent = count;
    };
    document.querySelectorAll('[data-filter-group] input').forEach(i=>i.addEventListener('change',()=>{ applyFilters(); updateFilterCount(); }));
    document.querySelector('[data-product-search]')?.addEventListener('input', applyFilters);
    document.querySelector('[data-mobile-filter-toggle]')?.addEventListener('click',()=>{ sidebar?.classList.add('mobile-open'); document.body.classList.add('mobile-filter-open'); });
    sidebar?.querySelector('[data-mobile-filter-close]')?.addEventListener('click',()=>{ sidebar.classList.remove('mobile-open'); document.body.classList.remove('mobile-filter-open'); });
    applyFilters();
    updateFilterCount();
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

  const variantDimensions = [
    ['strength','Styrka'],
    ['product_line','Typ'],
    ['format','Format'],
    ['grind','Malningsgrad'],
    ['amount_dosor','Mängd'],
    ['package_quantity','Antal']
  ];
  const strengthLabels = { Normal: 'Normal', Strong: 'Stark', 'Extra Strong': 'Extra stark' };
  const variantValue = (row,field) => {
    const value=row[field];
    if(value===null||value===undefined||String(value).trim()==='') return '';
    if(field==='strength') return strengthLabels[String(value)] || String(value);
    if(field==='amount_dosor') return `${value} dosor`;
    if(field==='package_quantity') return `${value} st`;
    return String(value);
  };
  const rawVariantValue = (row,field) => row[field]===null||row[field]===undefined?'':String(row[field]);
  const strengthLevel = value => value === 'Extra Strong' ? 4 : value === 'Strong' ? 3 : value ? 2 : 0;
  const strengthMeter = value => `<span class="variant-strength-meter" aria-hidden="true">${[1,2,3,4].map(index=>`<i${index<=strengthLevel(value)?' class="filled"':''}></i>`).join('')}</span>`;

  function renderVariantSelectors(row) {
    const api=window.SwedsnusV2;
    const group=api.group(row);
    if(group.length<2) return '';
    const dimensions=variantDimensions.map(([field,label])=>({field,label,values:unique(group.map(item=>rawVariantValue(item,field)))})).filter(item=>item.values.length>1);
    if(!dimensions.length) return '';
    return `<div class="variant-panel"><div class="variant-panel-head"><span>Välj variant</span><small>${group.length} alternativ i samma produktserie</small></div><div class="variant-selectors">${dimensions.map(({field,label,values})=>`<label class="variant-field${field==='strength'?' strength-variant-field':''}"><span>${label}${field==='strength'?strengthMeter(row.strength):''}</span><select data-variant-select data-variant-field="${field}" aria-label="Välj ${label.toLowerCase()}">${values.map(value=>{const source=group.find(item=>rawVariantValue(item,field)===value);const display=source?variantValue(source,field):value;return `<option value="${api.escapeHtml(value)}"${rawVariantValue(row,field)===value?' selected':''}>${api.escapeHtml(display)}</option>`;}).join('')}</select></label>`).join('')}</div></div>`;
  }

  function chooseVariant(select) {
    const api=window.SwedsnusV2;
    const currentId=new URLSearchParams(location.search).get('id');
    const current=api.find(currentId);
    if(!current) return;
    const group=api.group(current);
    const changedField=select.dataset.variantField;
    const changedValue=select.value;
    const selectors=[...document.querySelectorAll('[data-variant-select]')];
    const desired=Object.fromEntries(selectors.map(item=>[item.dataset.variantField,item===select?changedValue:item.value]));
    let candidates=group.filter(item=>rawVariantValue(item,changedField)===changedValue);
    if(!candidates.length) return;
    candidates=candidates.map(item=>({item,score:Object.entries(desired).reduce((sum,[field,value])=>sum+(rawVariantValue(item,field)===value?1:0),0)})).sort((a,b)=>b.score-a.score);
    const target=candidates[0]?.item;
    if(target && api.key(target)!==api.key(current)) location.href=api.url(target);
  }

  function renderProduct() {
    if (currentPage() !== 'product') return;
    const api = window.SwedsnusV2;
    const id = new URLSearchParams(location.search).get('id');
    const row = api.find(id);
    const root = document.querySelector('[data-product-detail]');
    if (!row || !root) { if(root) root.innerHTML='<div class="product-summary"><h1>Produkt hittades inte</h1><p>Produktlänken kunde inte matchas mot produktdatan.</p></div>'; return; }
    document.title = `${api.name(row)} — Swedsnus`;
    const specs = [['Produktfamilj',row.product_family],['Produktlinje',row.product_line || row.aroma_type],['Smak',row.taste_display],['Format',row.format],['Malningsgrad',row.grind],['Styrka',variantValue(row,'strength')],['Förpackning',row.amount_dosor ? `${row.amount_dosor} dosor` : row.package_quantity],['Tillverkning',row.manufacturing_location]].filter(([,v])=>v);
    const firstPack=api.packs(row)[0];
    const suffix=row.amount_dosor?'dosa':'st';
    root.innerHTML = `<div class="product-gallery">Produktbild</div><section class="product-summary"><p class="kicker">${api.escapeHtml(row.product_line || row.product_family)}</p><h1>${api.escapeHtml(api.name(row))}</h1><p>${api.escapeHtml(row.short_description || 'Kort produktbeskrivning hämtas från den centrala produktdatan när den finns tillgänglig.')}</p>${renderVariantSelectors(row)}<div class="product-pack-picker"><label>Flerpack</label>${api.packMenu(row)}</div><div class="price"><span data-selected-total>${api.money(firstPack.total)}</span><small data-selected-per-dose>${firstPack.perDose.toLocaleString('sv-SE',{minimumFractionDigits:2,maximumFractionDigits:2})} kr/${suffix}</small></div><button class="btn primary" data-add-cart="${api.escapeHtml(api.key(row))}">Lägg i varukorg</button><button class="btn product-bookmark" type="button" data-bookmark="${api.escapeHtml(api.key(row))}">Spara produkt</button><dl class="spec-list">${specs.map(([k,v])=>`<div class="spec-row"><dt>${api.escapeHtml(k)}</dt><dd>${api.escapeHtml(v)}</dd></div>`).join('')}</dl></section>`;
    document.querySelectorAll('[data-variant-select]').forEach(select=>select.addEventListener('change',()=>chooseVariant(select)));
    const content = document.querySelector('[data-product-content]');
    if(content) content.innerHTML = `<article><p class="kicker">Produktinformation</p><h2>Om produkten</h2><p>Här kan en kortare faktabaserad text om produktens egenskaper, format och användningsområde ligga. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante venenatis dapibus.</p></article><article><p class="kicker">Hantering</p><h2>Förvaring och beredning</h2><p>Här kan relevant information om förvaring eller beredning ligga beroende på produkttyp. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec ullamcorper nulla non metus auctor fringilla.</p></article><article class="ingredients"><p class="kicker">Deklaration</p><h2>Innehållsförteckning</h2><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p></article>`;
    if(row.tobacco_type === 'Tobaksfri') document.querySelector('[data-product-warning]')?.removeAttribute('hidden');
    document.dispatchEvent(new CustomEvent('swedsnus-v2:cards-rendered'));
  }
  document.addEventListener('swedsnus-v2:products-ready', () => { renderCatalog(); renderHome(); renderProduct(); });
})();