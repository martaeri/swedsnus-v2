(() => {
  const KEY = 'swedsnus-v2-cart';
  const read = () => { try { const value=JSON.parse(localStorage.getItem(KEY)||'[]'); return Array.isArray(value)?value:[]; } catch { return []; } };
  const write = items => { localStorage.setItem(KEY,JSON.stringify(items)); render(); };

  function selection(button) {
    const scope=button.closest('.product-card,.product-summary');
    const select=scope?.querySelector('[data-pack-select]');
    const option=select?.selectedOptions?.[0];
    return { packQty:Number(select?.value||1), total:Number(option?.dataset.total||0), perDose:Number(option?.dataset.perDose||0) };
  }

  function render() {
    const items=read();
    const count=items.reduce((sum,item)=>sum+((item.qty||1)*(item.packQty||1)),0);
    document.querySelectorAll('[data-cart-count]').forEach(el=>el.textContent=count);
    const drawer=document.querySelector('[data-cart-drawer]');
    if(!drawer) return;
    const api=window.SwedsnusV2;
    const body=drawer.querySelector('[data-cart-items]');
    const total=drawer.querySelector('[data-cart-total]');
    body.innerHTML=items.length?items.map(item=>`<div class="cart-item"><div><strong>${api?.escapeHtml(item.name)||item.name}</strong><br><span>${item.packQty||1}-pack · ${item.qty||1} st</span>${item.perDose?`<br><small>${Number(item.perDose).toLocaleString('sv-SE',{minimumFractionDigits:2,maximumFractionDigits:2})} kr/dosa</small>`:''}</div><div>${api?.money?api.money(item.totalPrice*(item.qty||1)):`${item.totalPrice*(item.qty||1)} kr`}<br><button type="button" data-cart-remove="${item.cartKey}">Ta bort</button></div></div>`).join(''):'<p>Varukorgen är tom.</p>';
    const sum=items.reduce((value,item)=>value+(item.totalPrice||0)*(item.qty||1),0);
    if(total) total.textContent=api?.money?api.money(sum):`${sum} kr`;
  }

  function add(button) {
    const api=window.SwedsnusV2;
    const row=api?.find(button.dataset.addCart);
    if(!row) return;
    const selected=selection(button);
    const fallback=api.packs(row).find(option=>option.packQty===selected.packQty)||api.packs(row)[0];
    const packQty=selected.packQty||fallback.packQty;
    const totalPrice=selected.total||fallback.total;
    const perDose=selected.perDose||fallback.perDose;
    const id=api.key(row);
    const cartKey=`${id}::${packQty}`;
    const items=read();
    const existing=items.find(item=>item.cartKey===cartKey);
    if(existing) existing.qty=(existing.qty||1)+1;
    else items.push({cartKey,id,name:api.name(row),packQty,totalPrice,perDose,qty:1});
    write(items);
    document.querySelector('[data-cart-drawer]')?.classList.add('open');
  }

  function syncSelect(select) {
    const scope=select.closest('.product-card,.product-summary');
    const option=select.selectedOptions?.[0];
    if(!scope||!option) return;
    const api=window.SwedsnusV2;
    const row=api?.find(select.dataset.productId);
    const suffix=row?.amount_dosor?'dosa':'st';
    const total=Number(option.dataset.total||0);
    const perDose=Number(option.dataset.perDose||0);
    const totalEl=scope.querySelector('[data-selected-total]');
    const perDoseEl=scope.querySelector('[data-selected-per-dose]');
    if(totalEl) totalEl.textContent=api?.money?api.money(total):`${total} kr`;
    if(perDoseEl) perDoseEl.textContent=`${perDose.toLocaleString('sv-SE',{minimumFractionDigits:2,maximumFractionDigits:2})} kr/${suffix}`;
  }

  document.addEventListener('change',event=>{ const select=event.target.closest('[data-pack-select]'); if(select) syncSelect(select); });
  document.addEventListener('click',event=>{
    const addButton=event.target.closest('[data-add-cart]');
    if(addButton){ event.preventDefault(); add(addButton); }
    if(event.target.closest('[data-cart-toggle]')) document.querySelector('[data-cart-drawer]')?.classList.toggle('open');
    if(event.target.closest('[data-cart-close]')) document.querySelector('[data-cart-drawer]')?.classList.remove('open');
    const removeButton=event.target.closest('[data-cart-remove]');
    if(removeButton) write(read().filter(item=>item.cartKey!==removeButton.dataset.cartRemove));
  });
  document.addEventListener('swedsnus-v2:cards-rendered',()=>document.querySelectorAll('[data-pack-select]').forEach(syncSelect));
  render();
})();
