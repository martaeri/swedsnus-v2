(() => {
  const state = { rows: [], images: {}, ready: false };
  const visible = row => row.product_id && String(row.visible_on_site || 'Yes').toLowerCase() !== 'no';
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const slugify = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') || 'produkt';
  const name = row => row.generated_name || [row.taste_name,row.product_line,row.strength !== 'Normal' ? row.strength : '',row.format,row.amount_dosor ? `${row.amount_dosor} dosor` : ''].filter(Boolean).join(' ');
  const key = row => `${row.product_id}__${row.variant_id || row.article_number || slugify(name(row))}`;
  const url = row => `product.html?id=${encodeURIComponent(key(row))}`;
  const money = value => `${Number(value || 0).toLocaleString('sv-SE')} kr`;
  const price = row => row.price_sek ? money(row.price_sek) : 'Pris saknas';
  const category = row => row.tobacco_type === 'Tobaksfri' || row.site_section === 'Vitt snus' ? 'vitt-snus' : row.product_family === 'Lössnus' || row.aroma_type === 'Expressarom' ? 'los' : row.site_section === 'Gör eget' || row.aroma_type === 'Super Dry Arom' ? 'gor-eget' : row.product_family === 'Tillbehör' ? 'tillbehor' : 'portion';
  const image = row => state.images[key(row)] || '';
  const BOOKMARK_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 4.75A1.75 1.75 0 0 1 8.25 3h7.5a1.75 1.75 0 0 1 1.75 1.75V21L12 17.35 6.5 21V4.75Z"/></svg>';
  const IMAGE_MAP_URLS = [
    'data/product-images.json',
    'data/product-images-instant.json',
    'data/product-images-express.json',
    'data/product-images-accessories.json'
  ];

  function media(row, className, eager = false) {
    const src = image(row);
    const label = escapeHtml(name(row));
    if (!src) return `<div class="${className}"><span class="product-image-placeholder">Produktbild</span></div>`;
    return `<div class="${className} has-product-image"><img src="${escapeHtml(src)}" alt="${label}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} data-product-image><span class="product-image-placeholder" hidden>Produktbild</span></div>`;
  }

  function packs(row) {
    const base = Number(row.price_sek || 0);
    const doseCount = Number(row.amount_dosor || row.package_quantity || 1);
    return [1,2,3].map(packQty => {
      const unitPrice = Math.max(1, base - ((packQty - 1) * 10));
      const total = unitPrice * packQty;
      const units = Math.max(1, doseCount * packQty);
      return { packQty, unitPrice, total, perDose: total / units, doseCount, label: `${packQty}-pack` };
    });
  }

  function packMenu(row) {
    const id = escapeHtml(key(row));
    const suffix = row.amount_dosor ? 'dosa' : 'st';
    const options = packs(row);
    const first = options[0];
    return `<div class="pack-dropdown" data-pack-picker data-product-id="${id}" data-pack-qty="${first.packQty}" data-total="${first.total}" data-per-dose="${first.perDose.toFixed(2)}"><button class="pack-dropdown-trigger" type="button" data-pack-toggle aria-expanded="false"><span><strong data-pack-label>${first.label}</strong><small data-pack-summary>${money(first.total)} · ${first.perDose.toLocaleString('sv-SE',{minimumFractionDigits:2,maximumFractionDigits:2})} kr/${suffix}</small></span><span aria-hidden="true">⌄</span></button><div class="pack-dropdown-menu" data-pack-menu hidden>${options.map(option => `<button type="button" class="pack-dropdown-option${option.packQty===1?' selected':''}" data-pack-option data-pack-qty="${option.packQty}" data-total="${option.total}" data-per-dose="${option.perDose.toFixed(2)}"><strong>${option.label}</strong><span>${money(option.total)}</span><small>${option.perDose.toLocaleString('sv-SE',{minimumFractionDigits:2,maximumFractionDigits:2})} kr/${suffix}</small></button>`).join('')}</div></div>`;
  }

  function group(row) { return state.rows.filter(candidate => candidate.product_id === row.product_id); }

  function card(row) {
    const id = escapeHtml(key(row));
    const firstPack = packs(row)[0];
    return `<article class="product-card" data-product-id="${id}" data-category="${category(row)}" data-name="${escapeHtml(name(row).toLowerCase())}" data-taste="${escapeHtml(String(row.taste_variables || row.taste_display || '').toLowerCase())}" data-format="${escapeHtml(String(row.format || row.grind || '').toLowerCase())}" data-strength="${escapeHtml(String(row.strength || '').toLowerCase())}"><button class="bookmark" type="button" data-bookmark="${id}" aria-label="Spara produkt" aria-pressed="false">${BOOKMARK_ICON}</button><a class="product-card-main" href="${url(row)}">${media(row,'product-image')}<span class="product-tag">${escapeHtml(row.product_line || row.aroma_type || row.accessory_type || row.product_family)}</span><h3 class="product-name">${escapeHtml(name(row))}</h3>${row.taste_display ? `<p class="product-meta">Smak: ${escapeHtml(row.taste_display)}</p>` : ''}${row.format ? `<p class="product-meta">Format: ${escapeHtml(row.format)}</p>` : ''}${row.strength ? `<p class="product-meta">Styrka: ${escapeHtml(row.strength)}</p>` : ''}</a><div class="pack-control"><label>Flerpack</label>${packMenu(row)}</div><div class="product-card-bottom"><div class="product-price"><span data-selected-total>${money(firstPack.total)}</span><small data-selected-per-dose>${firstPack.perDose.toLocaleString('sv-SE',{minimumFractionDigits:2,maximumFractionDigits:2})} kr/${row.amount_dosor ? 'dosa' : 'st'}</small></div><button class="add-cart" type="button" data-add-cart="${id}" aria-label="Lägg i varukorg">+</button></div></article>`;
  }

  function handleImageError(event) {
    const img = event.target.closest?.('[data-product-image]');
    if (!img) return;
    const wrapper = img.parentElement;
    img.remove();
    wrapper?.classList.remove('has-product-image');
    const placeholder = wrapper?.querySelector('.product-image-placeholder');
    if (placeholder) placeholder.hidden = false;
  }

  async function fetchJson(url) { const r = await fetch(url,{cache:'no-cache'}); if(!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); }
  async function load() {
    const [manifest, imageMaps] = await Promise.all([
      fetchJson('data/products.json'),
      Promise.all(IMAGE_MAP_URLS.map(source => fetchJson(source).catch(() => ({}))))
    ]);
    const parts = Array.isArray(manifest.parts) ? await Promise.all(manifest.parts.map(fetchJson)) : [manifest];
    state.rows = parts.flat().filter(visible);
    state.images = Object.assign({}, ...imageMaps.filter(map => map && typeof map === 'object' && !Array.isArray(map)));
    state.ready = true;
    window.SwedsnusV2 = { state, visible, escapeHtml, slugify, name, key, url, money, price, category, image, media, packs, packMenu, group, card, find: id => state.rows.find(row => key(row) === id || row.product_id === id || row.variant_id === id) };
    document.dispatchEvent(new CustomEvent('swedsnus-v2:products-ready'));
  }
  document.addEventListener('error', handleImageError, true);
  load().catch(error => console.error('[Swedsnus V2 product data]', error));
})();
