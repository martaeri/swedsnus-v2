(() => {
  const state = { rows: [], ready: false };
  const visible = row => row.product_id && String(row.visible_on_site || 'Yes').toLowerCase() !== 'no';
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const slugify = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') || 'produkt';
  const name = row => row.generated_name || [row.taste_name,row.product_line,row.strength !== 'Normal' ? row.strength : '',row.format,row.amount_dosor ? `${row.amount_dosor} dosor` : ''].filter(Boolean).join(' ');
  const key = row => `${row.product_id}__${row.variant_id || row.article_number || slugify(name(row))}`;
  const url = row => `product.html?id=${encodeURIComponent(key(row))}`;
  const price = row => row.price_sek ? `${Number(row.price_sek).toLocaleString('sv-SE')} kr` : 'Pris saknas';
  const category = row => row.tobacco_type === 'Tobaksfri' || row.site_section === 'Vitt snus' ? 'vitt-snus' : row.product_family === 'Lössnus' || row.aroma_type === 'Expressarom' ? 'los' : row.site_section === 'Gör eget' || row.aroma_type === 'Super Dry Arom' ? 'gor-eget' : row.product_family === 'Tillbehör' ? 'tillbehor' : 'portion';
  const card = row => `<article class="product-card" data-product-id="${escapeHtml(key(row))}" data-category="${category(row)}" data-name="${escapeHtml(name(row).toLowerCase())}" data-taste="${escapeHtml(String(row.taste_variables || row.taste_display || '').toLowerCase())}" data-format="${escapeHtml(String(row.format || row.grind || '').toLowerCase())}" data-strength="${escapeHtml(String(row.strength || '').toLowerCase())}"><button class="bookmark" type="button" data-bookmark="${escapeHtml(key(row))}" aria-label="Spara produkt">+</button><a class="product-card-main" href="${url(row)}"><div class="product-image">Produktbild</div><span class="product-tag">${escapeHtml(row.product_line || row.aroma_type || row.accessory_type || row.product_family)}</span><h3 class="product-name">${escapeHtml(name(row))}</h3>${row.taste_display ? `<p class="product-meta">Smak: ${escapeHtml(row.taste_display)}</p>` : ''}${row.format ? `<p class="product-meta">Format: ${escapeHtml(row.format)}</p>` : ''}${row.strength ? `<p class="product-meta">Styrka: ${escapeHtml(row.strength)}</p>` : ''}</a><div class="product-card-bottom"><div class="product-price">${price(row)}</div><button class="add-cart" type="button" data-add-cart="${escapeHtml(key(row))}" aria-label="Lägg i varukorg">+</button></div></article>`;

  async function fetchJson(url) { const r = await fetch(url,{cache:'no-cache'}); if(!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); }
  async function load() {
    const manifest = await fetchJson('data/products.json');
    const parts = Array.isArray(manifest.parts) ? await Promise.all(manifest.parts.map(fetchJson)) : [manifest];
    state.rows = parts.flat().filter(visible);
    state.ready = true;
    window.SwedsnusV2 = { state, visible, escapeHtml, slugify, name, key, url, price, category, card, find: id => state.rows.find(row => key(row) === id || row.product_id === id || row.variant_id === id) };
    document.dispatchEvent(new CustomEvent('swedsnus-v2:products-ready'));
  }
  load().catch(error => console.error('[Swedsnus V2 product data]', error));
})();
