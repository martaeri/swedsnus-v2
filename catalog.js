(() => {
  const routes = {
    portion: row => row.product_family === 'Portionssnus' && row.site_section === 'Portionssnus' && row.tobacco_type !== 'Tobaksfri',
    los: row => row.product_family === 'Lössnus' || row.aroma_type === 'Expressarom',
    'gor-eget': row => row.site_section === 'Gör eget' || row.aroma_type === 'Super Dry Arom' || String(row.product_line||'').toLowerCase()==='super dry',
    'vitt-snus': row => row.tobacco_type === 'Tobaksfri' || row.site_section === 'Vitt snus',
    tillbehor: row => row.product_family === 'Tillbehör',
    subscribe: row => window.SwedsnusV2.subscriptionEligible(row)
  };
  const seriesPills = {
    portion: [
      ['instant portion','Instant Portion','Smaksatta snussatser'],
      ['white portion','White Portion','Färdig att snusa'],
      ['super dry','Super Dry','Snussatser']
    ],
    los: [
      ['lössnus instant','Instant Lös','Smaksatta snussatser'],
      ['lössnus express','Express Lös','Snussatser'],
      ['expressarom','Expressaromer','Smaksättning']
    ],
    'gor-eget': [
      ['instant portion','Instant Portion','Smaksatta snussatser'],
      ['super dry','Super Dry','Snussatser'],
      ['super dry arom','Super Dry Arom','Smaksättning']
    ],
    tillbehor: [
      ['portionssnus','Portion','Tillbehör till portionssnus'],
      ['lössnus','Lös','Tillbehör lössnus']
    ]
  };
  const split = value => String(value || '').split(',').map(x => x.trim()).filter(Boolean);
  const unique = values => [...new Set(values.filter(v=>v!==null&&v!==undefined&&String(v).trim()!=='').map(String))].sort((a,b)=>a.localeCompare(b,'sv'));
  function currentPage() { return document.body.dataset.page || ''; }
  function renderFilters(rows) {
    const sidebar = document.querySelector('[data-filter-sidebar]');
    if (!sidebar) return;
    const page = currentPage();
    const groups = page === 'tillbehor'
      ? [['Typ','type',unique(rows.map(r=>r.accessory_type))],['Material','material',unique(rows.map(r=>r.material))],['Färg','color',unique(rows.map(r=>r.filter_color))]]
      : [['Smak','taste',unique(rows.flatMap(r=>split(r.taste_variables)))],...(page === 'subscribe' ? [['Typ','type',unique(rows.map(r=>r.product_line || r.aroma_type || r.accessory_type))]] : []),['Format','format',unique(rows.map(r=>r.format || r.grind))],['Styrka','strength',unique(rows.map(r=>r.strength))]];
    sidebar.innerHTML = `<div class="filter-title"><span>Filtrera</span><button type="button" data-mobile-filter-close aria-label="Stäng filter">×</button></div>${groups.filter(([, ,v])=>v.length).map(([title,key,values])=>`<div class="filter-group" data-filter-group="${key}"><h4>${title}</h4>${values.map(value=>`<label class="filter-option"><input type="checkbox" value="${window.SwedsnusV2.escapeHtml(value)}">${window.SwedsnusV2.escapeHtml(value)}</label>`).join('')}</div>`).join('')}`;
  }
  function renderSeriesPills(rows) {
    document.querySelector('[data-series-filters]')?.remove();
    const pills = seriesPills[currentPage()];
    const tools = document.querySelector('.catalog-main .catalog-tools');
    if (!pills || !tools) return;
    const available = new Set(rows.map(row=>String(row.compatible_with || row.product_line || row.aroma_type || '').toLowerCase()));
    const root = document.createElement('section');
    root.className = 'series-filter-pills';
    root.dataset.seriesFilters = '';
    root.setAttribute('aria-label','Filtrera på produktserie');
    root.innerHTML = pills.filter(([value])=>available.has(value)).map(([value,title,description])=>`<button type="button" class="series-filter-pill" data-series-filter="${value}" aria-pressed="false"><span class="series-filter-pill-copy"><strong>${title}</strong><span>${description}</span></span><span class="series-filter-pill-remove" aria-hidden="true">×</span></button>`).join('');
    tools.before(root);
  }
  function toggleSeriesFilter(button) {
    const activate = button.getAttribute('aria-pressed') !== 'true';
    document.querySelectorAll('[data-series-filter]').forEach(item=>{
      item.setAttribute('aria-pressed','false');
      item.classList.remove('active');
    });
    if (activate) {
      button.setAttribute('aria-pressed','true');
      button.classList.add('active');
    }
    applyFilters();
  }
  function applyFilters() {
    const cards = [...document.querySelectorAll('.catalog-main .product-card')];
    const query = (document.querySelector('[data-product-search]')?.value || '').trim().toLowerCase();
    const groups = [...document.querySelectorAll('[data-filter-group]')];
    const selectedSeries = [...document.querySelectorAll('[data-series-filter][aria-pressed="true"]')].map(button=>button.dataset.seriesFilter);
    let count = 0;
    cards.forEach(card => {
      const hay = `${card.dataset.name} ${card.dataset.taste} ${card.dataset.type} ${card.dataset.material} ${card.dataset.color} ${card.dataset.design} ${card.dataset.format} ${card.dataset.strength}`;
      const matchesSearch = !query || hay.includes(query);
      const matchesSeries = !selectedSeries.length || selectedSeries.includes(card.dataset.series);
      const matchesGroups = groups.every(group => {
        const checked = [...group.querySelectorAll('input:checked')].map(i=>i.value.toLowerCase());
        if (!checked.length) return true;
        const key = group.dataset.filterGroup;
        const values = key === 'taste' ? split(card.dataset[key]).map(value=>value.toLowerCase()) : [card.dataset[key] || ''];
        return checked.some(item => values.includes(item));
      });
      const show = matchesSearch && matchesSeries && matchesGroups;
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
    grid.innerHTML = rows.map(row=>api.card(row,{subscription:key==='subscribe'})).join('');
    renderSeriesPills(rows);
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
    document.querySelectorAll('[data-series-filter]').forEach(button=>button.addEventListener('click',()=>toggleSeriesFilter(button)));
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
    ['format','Format'],
    ['grind','Malningsgrad'],
    ['strength','Styrka'],
    ['product_line','Typ'],
    ['design_color','Motiv'],
    ['amount_dosor','Mängd'],
    ['package_quantity','Antal']
  ];
  const strengthLabels = { Normal: 'Normal', Strong: 'Stark', 'Extra Strong': 'Extra stark' };
  const strengthOrder = ['Normal','Strong','Extra Strong'];
  const formatOrder = ['Premium','Rebell','Compact','RX Slim','Mini'];
  const variantValue = (row,field) => {
    const value=row[field];
    if(value===null||value===undefined||String(value).trim()==='') return '';
    if(field==='strength') return strengthLabels[String(value)] || String(value);
    if(field==='amount_dosor') return `${value} dosor`;
    if(field==='package_quantity') return `${value} st`;
    return String(value);
  };
  const rawVariantValue = (row,field) => row[field]===null||row[field]===undefined?'':String(row[field]);
  const orderedVariantValues = (field,values) => {
    const order = field === 'strength' ? strengthOrder : field === 'format' ? formatOrder : null;
    if(!order) return values;
    return [...values].sort((a,b)=>{
      const ai=order.indexOf(a), bi=order.indexOf(b);
      if(ai===-1 && bi===-1) return a.localeCompare(b,'sv');
      if(ai===-1) return 1;
      if(bi===-1) return -1;
      return ai-bi;
    });
  };
  function variantDimensionsFor(row,group) {
    return variantDimensions
      .filter(([field])=>!(row.product_family==='Portionssnus' && field==='amount_dosor'))
      .map(([field,label])=>({
        field,
        label:field==='design_color'&&row.accessory_type==='Metalldosa'?'Färg':label,
        values:orderedVariantValues(field,unique(group.map(item=>rawVariantValue(item,field))))
      }))
      .filter(item=>item.values.length>1);
  }
  function optionAvailable(group,dimensions,index,row,value) {
    const prior=dimensions.slice(0,index);
    return group.some(item=>prior.every(dimension=>rawVariantValue(item,dimension.field)===rawVariantValue(row,dimension.field)) && rawVariantValue(item,dimensions[index].field)===value);
  }
  function renderVariantSelectors(row) {
    const api=window.SwedsnusV2;
    const group=api.group(row);
    if(group.length<2) return '';
    const dimensions=variantDimensionsFor(row,group);
    if(!dimensions.length) return '';
    return `<div class="variant-panel"><div class="variant-panel-head"><span>Välj variant</span><small>${group.length} alternativ i samma produktserie</small></div><div class="variant-selectors">${dimensions.map(({field,label,values},index)=>`<label class="variant-field" data-variant-level="${index}"><span>${label}${field==='strength'?api.strengthMeter(row.strength):''}</span><select data-variant-select data-variant-field="${field}" data-variant-level="${index}" aria-label="Välj ${label.toLowerCase()}">${values.map(value=>{const source=group.find(item=>rawVariantValue(item,field)===value);const display=source?variantValue(source,field):value;const available=optionAvailable(group,dimensions,index,row,value);return `<option value="${api.escapeHtml(value)}"${rawVariantValue(row,field)===value?' selected':''}${available?'':' disabled'}>${api.escapeHtml(display)}</option>`;}).join('')}</select></label>`).join('')}</div></div>`;
  }

  function chooseVariant(select) {
    const api=window.SwedsnusV2;
    const currentId=new URLSearchParams(location.search).get('id');
    const current=api.find(currentId);
    if(!current) return;
    const group=api.group(current);
    const selectors=[...document.querySelectorAll('[data-variant-select]')];
    const changedIndex=selectors.indexOf(select);
    const changedField=select.dataset.variantField;
    const changedValue=select.value;
    const priorSelections=selectors.slice(0,changedIndex).map(item=>[item.dataset.variantField,item.value]);
    let candidates=group.filter(item=>priorSelections.every(([field,value])=>rawVariantValue(item,field)===value) && rawVariantValue(item,changedField)===changedValue);
    if(!candidates.length) return;
    const desired=Object.fromEntries(selectors.map(item=>[item.dataset.variantField,item===select?changedValue:item.value]));
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
    const designLabel=row.accessory_type==='Metalldosa'?'Färg':'Motiv';
    const specs = [['Produktfamilj',row.product_family],['Produktlinje',row.product_line || row.aroma_type],['Typ',row.accessory_type],['Passar till',row.compatible_with],['Material',row.material],[designLabel,row.design_color],['Smak',row.taste_display],['Format',row.format],['Malningsgrad',row.grind],['Styrka',variantValue(row,'strength')],['Förpackning',row.amount_dosor ? `${row.amount_dosor} dosor` : row.package_quantity],['Tillverkning',row.manufacturing_location]].filter(([,v])=>v);
    const firstPack=api.packs(row)[0];
    const suffix=row.amount_dosor?'dosa':'st';
    root.innerHTML = `<div class="product-gallery">Produktbild</div><section class="product-summary"><p class="kicker">${api.escapeHtml(row.product_line || row.product_family)}</p><h1>${api.escapeHtml(api.name(row))}</h1><p>${api.escapeHtml(row.short_description || 'Kort produktbeskrivning hämtas från den centrala produktdatan när den finns tillgänglig.')}</p>${renderVariantSelectors(row)}<div class="product-pack-picker"><label>Flerpack</label>${api.packMenu(row)}</div>${api.subscriptionEligible(row)?`<button class="btn product-subscription-open" type="button" data-subscription-open="${api.escapeHtml(api.key(row))}">Prenumerera på produkten</button>`:''}<div class="price"><span data-selected-total>${api.money(firstPack.total)}</span><small data-selected-per-dose>${firstPack.perDose.toLocaleString('sv-SE',{minimumFractionDigits:2,maximumFractionDigits:2})} kr/${suffix}</small></div><button class="btn primary" data-add-cart="${api.escapeHtml(api.key(row))}">Lägg i varukorg</button><button class="btn product-bookmark" type="button" data-bookmark="${api.escapeHtml(api.key(row))}">Spara produkt</button><dl class="spec-list">${specs.map(([k,v])=>`<div class="spec-row"><dt>${api.escapeHtml(k)}</dt><dd>${api.escapeHtml(v)}</dd></div>`).join('')}</dl></section>`;
    document.querySelectorAll('[data-variant-select]').forEach(select=>select.addEventListener('change',()=>chooseVariant(select)));
    const content = document.querySelector('[data-product-content]');
    if(content) content.innerHTML = `<article><p class="kicker">Produktinformation</p><h2>Om produkten</h2><p>Här kan en kortare faktabaserad text om produktens egenskaper, format och användningsområde ligga. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante venenatis dapibus.</p></article><article><p class="kicker">Hantering</p><h2>Förvaring och beredning</h2><p>Här kan relevant information om förvaring eller beredning ligga beroende på produkttyp. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec ullamcorper nulla non metus auctor fringilla.</p></article><article class="ingredients"><p class="kicker">Deklaration</p><h2>Innehållsförteckning</h2><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p></article>`;
    if(row.tobacco_type === 'Tobaksfri') document.querySelector('[data-product-warning]')?.removeAttribute('hidden');
    document.dispatchEvent(new CustomEvent('swedsnus-v2:cards-rendered'));
  }
  function renderProductViews() {
    renderCatalog();
    renderHome();
    renderProduct();
  }

  document.addEventListener('swedsnus-v2:products-ready', renderProductViews);
  if (window.SwedsnusV2?.state.ready) renderProductViews();
})();
