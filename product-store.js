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
  const category = row => row.tobacco_type === 'Tobaksfri' || row.site_section === 'Vitt snus' ? 'vitt-snus' : row.product_family === 'Lössnus' || row.aroma_type === 'Expressarom' ? 'los' : row.site_section === 'Gör eget' || row.aroma_type === 'Super Dry Arom' || String(row.product_line||'').toLowerCase()==='super dry' ? 'gor-eget' : row.product_family === 'Tillbehör' ? 'tillbehor' : 'portion';
  const image = row => state.images[key(row)] || '';
  const strengthLevel = value => value === 'Extra Strong' ? 4 : value === 'Strong' ? 3 : value ? 2 : 0;
  const strengthMeter = value => `<span class="variant-strength-meter" aria-hidden="true">${[1,2,3,4].map(index=>`<i${index<=strengthLevel(value)?' class="filled"':''}></i>`).join('')}</span>`;
  const BOOKMARK_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 4.75A1.75 1.75 0 0 1 8.25 3h7.5a1.75 1.75 0 0 1 1.75 1.75V21L12 17.35 6.5 21V4.75Z"/></svg>';

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
      return { packQty, unitPrice, total, perDose: total / units, doseCount, units, label: `${packQty}-pack` };
    });
  }

  function packMenu(row) {
    const id = escapeHtml(key(row));
    const suffix = row.amount_dosor ? 'dosa' : 'st';
    const options = packs(row);
    const first = options[0];
    return `<div class="pack-dropdown" data-pack-picker data-product-id="${id}" data-pack-qty="${first.packQty}" data-total="${first.total}" data-per-dose="${first.perDose.toFixed(2)}" data-units="${first.units}"><button class="pack-dropdown-trigger" type="button" data-pack-toggle aria-expanded="false"><span><strong data-pack-label>${first.label}</strong><small data-pack-summary>${row.amount_dosor?`${first.units} dosor · `:''}${money(first.total)} · ${first.perDose.toLocaleString('sv-SE',{minimumFractionDigits:2,maximumFractionDigits:2})} kr/${suffix}</small></span><span aria-hidden="true">⌄</span></button><div class="pack-dropdown-menu" data-pack-menu hidden>${options.map(option => `<button type="button" class="pack-dropdown-option${option.packQty===1?' selected':''}" data-pack-option data-pack-qty="${option.packQty}" data-total="${option.total}" data-per-dose="${option.perDose.toFixed(2)}" data-units="${option.units}"><strong>${option.label}</strong>${row.amount_dosor?`<span class="pack-dose-count">${option.units} dosor</span>`:'<span></span>'}<span class="pack-option-price"><b>${money(option.total)}</b><small>${option.perDose.toLocaleString('sv-SE',{minimumFractionDigits:2,maximumFractionDigits:2})} kr/${suffix}</small></span></button>`).join('')}</div></div>`;
  }

  function group(row) { return state.rows.filter(candidate => candidate.product_id === row.product_id); }
  function subscriptionEligible(row) { const explicit=String(row.subscription_eligible||'').toLowerCase();const excluded=row.product_id==='swedsnuspasen-konsistenspase'||row.accessory_type==='Metalldosa';if(excluded)return false;return explicit!=='no'; }

  function purchaseChoice(options={}) {
    const groupName = `purchase-${Math.random().toString(36).slice(2)}`;
    const subscribed=Boolean(options.subscription);
    return `${options.compact?`<button class="subscription-reveal" type="button" data-subscription-reveal aria-expanded="${subscribed}">Prenumerera på produkten</button>`:''}<fieldset class="purchase-choice${subscribed?' subscribed':''}" data-purchase-choice${options.compact&&!subscribed?' hidden':''}><legend>Köpsätt</legend><div class="purchase-choice-options"><label><input type="radio" name="${groupName}" value="once"${subscribed?'':' checked'}><span><strong>Engångsköp</strong><small>Köp en gång</small></span></label><label><input type="radio" name="${groupName}" value="subscription"${subscribed?' checked':''}><span><strong>Prenumerera</strong><small>Återkommande leverans</small></span></label></div><label class="subscription-interval" data-subscription-interval${subscribed?'':' hidden'}><span>Leveransintervall</span><select><option value="1">Varje vecka</option><option value="2">Varannan vecka</option><option value="4" selected>Var 4:e vecka</option><option value="8">Var 8:e vecka</option></select></label><p data-subscription-copy${subscribed?'':' hidden'}>Första köpet slutförs hos Avarda där du godkänner återkommande betalning. Hantera eller avsluta på Mina sidor.</p></fieldset>`;
  }

  function card(row,options={}) {
    const id = escapeHtml(key(row));
    const firstPack = packs(row)[0];
    const subscriptionOnly = Boolean(options.subscription);
    return `<article class="product-card" data-product-id="${id}" data-category="${category(row)}" data-name="${escapeHtml(name(row).toLowerCase())}" data-taste="${escapeHtml(String(row.taste_variables || row.taste_display || '').toLowerCase())}" data-format="${escapeHtml(String(row.format || row.grind || '').toLowerCase())}" data-strength="${escapeHtml(String(row.strength || '').toLowerCase())}"><button class="bookmark" type="button" data-bookmark="${id}" aria-label="Spara produkt" aria-pressed="false">${BOOKMARK_ICON}</button><a class="product-card-main" href="${url(row)}">${media(row,'product-image')}<span class="product-tag">${escapeHtml(row.product_line || row.aroma_type || row.accessory_type || row.product_family)}</span><h3 class="product-name">${escapeHtml(name(row))}</h3>${row.taste_display ? `<p class="product-meta">Smak: ${escapeHtml(row.taste_display)}</p>` : ''}${row.format ? `<p class="product-meta">Format: ${escapeHtml(row.format)}</p>` : ''}${row.strength?`<div class="product-card-strength" aria-label="Styrka: ${escapeHtml(row.strength)}">${strengthMeter(row.strength)}</div>`:''}</a>${subscriptionOnly ? '' : `<div class="pack-control"><label>Flerpack</label>${packMenu(row)}</div>`}${!subscriptionOnly&&subscriptionEligible(row)?`<button class="subscription-reveal" type="button" data-subscription-open="${id}">Prenumerera på produkten</button>`:''}<div class="product-card-bottom${subscriptionOnly?' subscription-product-bottom':''}"><div class="product-price"><span data-selected-total>${money(firstPack.total)}</span><small data-selected-per-dose>${firstPack.perDose.toLocaleString('sv-SE',{minimumFractionDigits:2,maximumFractionDigits:2})} kr/${row.amount_dosor ? 'dosa' : 'st'}</small></div><button class="${subscriptionOnly?'subscribe-card-add':'add-cart'}" type="button" ${subscriptionOnly?`data-subscription-open="${id}"`:`data-add-cart="${id}" aria-label="Lägg i varukorg"`}>${subscriptionOnly?'Prenumerera':'+'}</button></div></article>`;
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
    const [manifest, imageMap] = await Promise.all([
      fetchJson('data/products.json'),
      fetchJson('data/product-images.json').catch(() => ({}))
    ]);
    const parts = Array.isArray(manifest.parts) ? await Promise.all(manifest.parts.map(fetchJson)) : [manifest];
    state.rows = parts.flat().filter(visible);
    state.images = imageMap && typeof imageMap === 'object' && !Array.isArray(imageMap) ? imageMap : {};
    state.ready = true;
    window.SwedsnusV2 = { state, visible, escapeHtml, slugify, name, key, url, money, price, category, image, media, packs, packMenu, purchaseChoice, subscriptionEligible, strengthLevel, strengthMeter, group, card, find: id => state.rows.find(row => key(row) === id || row.product_id === id || row.variant_id === id) };
    document.dispatchEvent(new CustomEvent('swedsnus-v2:products-ready'));
  }
  document.addEventListener('error', handleImageError, true);
  load().catch(error => console.error('[Swedsnus V2 product data]', error));
})();
