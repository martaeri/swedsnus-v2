(() => {
  const state = { rows: [], ready: false };
  const visible = row => row.product_id && String(row.visible_on_site || 'Yes').toLowerCase() !== 'no';
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const slugify = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') || 'produkt';
  const name = row => row.generated_name || [row.taste_name,row.product_line,row.strength !== 'Normal' ? row.strength : '',row.format,row.amount_dosor ? `${row.amount_dosor} dosor` : ''].filter(Boolean).join(' ');
  const key = row => `${row.product_id}__${row.variant_id || row.article_number || slugify(name(row))}`;
  const url = row => `product.html?id=${encodeURIComponent(key(row))}`;
  const money = value => `${Number(value || 0).toLocaleString('sv-SE')} kr`;
  const price = row => row.price_sek ? money(row.price_sek) : 'Pris saknas';
  const category = row => row.tobacco_type === 'Tobaksfri' || row.site_section === 'Vitt snus' ? 'vitt-snus' : row.product_family === 'Lössnus' || row.aroma_type === 'Expressarom' ? 'los' : row.site_section === 'Gör eget' || row.aroma_type === 'Super Dry Arom' ? 'gor-eget' : row.product_family === 'Tillbehör' ? 'tillbehor' : 'portion';
  const BOOKMARK_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 4.75A1.75 1.75 0 0 1 8.25 3h7.5a1.75 1.75 0 0 1 1.75 1.75V21L12 17.35 6.5 21V4.75Z"/></svg>';

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

  function packOptions(row) {
    const suffix = row.amount_dosor ? 'dosa' : 'st';
    return packs(row).map(option => `<option value="${option.packQty}" data-total="${option.total}" data-per-dose="${option.perDose.toFixed(2)}">${option.label} — ${money(option.total)} · ${option.perDose.toLocaleString('sv-SE',{minimumFractionDigits:2,maximumFractionDigits:2})} kr/${suffix}</option>`).join('');
  }

  function card(row) {
    const id = escapeHtml(key(row));
    const firstPack = packs(row)[0];
    return `<article class="product-card" data-product-id="${id}" data-category="${category(row)}" data-name="${escapeHtml(name(row).toLowerCase())}" data-taste="${escapeHtml(String(row.taste_variables || row.taste_display || '').toLowerCase())}" data-format="${escapeHtml(String(row.format || row.grind || '').toLowerCase())}" data-strength="${escapeHtml(String(row.strength || '').toLowerCase())}"><button class="bookmark" type="button" data-bookmark="${id}" aria-label="Spara produkt" aria-pressed="false">${BOOKMARK_ICON}</button><a class="product-card-main" href="${url(row)}"><div class="product-image">Produktbild</div><span class="product-tag">${escapeHtml(row.product_line || row.aroma_type || row.accessory_type || row.product_family)}</span><h3 class="product-name">${escapeHtml(name(row))}</h3>${row.taste_display ? `<p class="product-meta">Smak: ${escapeHtml(row.taste_display)}</p>` : ''}${row.format ? `<p class="product-meta">Format: ${escapeHtml(row.format)}</p>` : ''}${row.strength ? `<p class="product-meta">Styrka: ${escapeHtml(row.strength)}</p>` : ''}</a><div class="pack-control"><label for="pack-${id}">Flerpack</label><select id="pack-${id}" data-pack-select data-product-id="${id}">${packOptions(row)}</select></div><div class="product-card-bottom"><div class="product-price"><span data-selected-total>${money(firstPack.total)}</span><small data-selected-per-dose>${firstPack.perDose.toLocaleString('sv-SE',{minimumFractionDigits:2,maximumFractionDigits:2})} kr/${row.amount_dosor ? 'dosa' : 'st'}</small></div><button class="add-cart" type="button" data-add-cart="${id}" aria-label="Lägg i varukorg">+</button></div></article>`;
  }

  async function fetchJson(url) { const r = await fetch(url,{cache:'no-cache'}); if(!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); }
  async function load() {
    const manifest = await fetchJson('data/products.json');
    const parts = Array.isArray(manifest.parts) ? await Promise.all(manifest.parts.map(fetchJson)) : [manifest];
    state.rows = parts.flat().filter(visible);
    state.ready = true;
    window.SwedsnusV2 = { state, visible, escapeHtml, slugify, name, key, url, money, price, category, packs, packOptions, card, find: id => state.rows.find(row => key(row) === id || row.product_id === id || row.variant_id === id) };
    document.dispatchEvent(new CustomEvent('swedsnus-v2:products-ready'));
  }
  load().catch(error => console.error('[Swedsnus V2 product data]', error));
})();
