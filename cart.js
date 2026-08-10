(() => {
  const KEY = 'swedsnus-v2-cart';
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
  const write = items => { localStorage.setItem(KEY, JSON.stringify(items)); render(); };
  function render() {
    const items = read();
    document.querySelectorAll('[data-cart-count]').forEach(el => el.textContent = items.reduce((sum,item)=>sum+(item.qty||1),0));
    const drawer = document.querySelector('[data-cart-drawer]');
    if (!drawer) return;
    const api = window.SwedsnusV2;
    const body = drawer.querySelector('[data-cart-items]');
    const total = drawer.querySelector('[data-cart-total]');
    if (!items.length) body.innerHTML = '<p>Varukorgen är tom.</p>';
    else body.innerHTML = items.map(item => `<div class="cart-item"><div><strong>${api?.escapeHtml(item.name) || item.name}</strong><br><span>${item.qty} st</span></div><div>${item.price * item.qty} kr<br><button type="button" data-cart-remove="${item.id}">Ta bort</button></div></div>`).join('');
    if(total) total.textContent = `${items.reduce((sum,item)=>sum+item.price*item.qty,0)} kr`;
  }
  function add(id) {
    const api = window.SwedsnusV2;
    const row = api?.find(id);
    if (!row) return;
    const items = read();
    const existing = items.find(item => item.id === api.key(row));
    if(existing) existing.qty += 1;
    else items.push({ id: api.key(row), name: api.name(row), price: Number(row.price_sek || 0), qty: 1, tobaccoType: row.tobacco_type || '' });
    write(items);
    document.querySelector('[data-cart-drawer]')?.classList.add('open');
  }
  function remove(id) { write(read().filter(item => item.id !== id)); }
  document.addEventListener('click', event => {
    const addButton = event.target.closest('[data-add-cart]');
    if(addButton) { event.preventDefault(); add(addButton.dataset.addCart); }
    if(event.target.closest('[data-cart-toggle]')) document.querySelector('[data-cart-drawer]')?.classList.toggle('open');
    if(event.target.closest('[data-cart-close]')) document.querySelector('[data-cart-drawer]')?.classList.remove('open');
    const removeButton = event.target.closest('[data-cart-remove]');
    if(removeButton) remove(removeButton.dataset.cartRemove);
    const bookmark = event.target.closest('[data-bookmark]');
    if(bookmark) { const key='swedsnus-v2-bookmarks'; const set=new Set(JSON.parse(localStorage.getItem(key)||'[]')); set.has(bookmark.dataset.bookmark)?set.delete(bookmark.dataset.bookmark):set.add(bookmark.dataset.bookmark); localStorage.setItem(key,JSON.stringify([...set])); bookmark.textContent=set.has(bookmark.dataset.bookmark)?'✓':'+'; }
  });
  render();
})();
