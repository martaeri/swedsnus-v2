(() => {
  const KEY = 'swedsnus-v2-cart';
  const read = () => { try { const value=JSON.parse(localStorage.getItem(KEY)||'[]'); return Array.isArray(value)?value:[]; } catch { return []; } };
  const write = items => { localStorage.setItem(KEY,JSON.stringify(items)); render(); document.dispatchEvent(new CustomEvent('swedsnus-v2:cart-changed')); };

  function selection(button) {
    const scope=button.closest('.product-card,.product-summary');
    const picker=scope?.querySelector('[data-pack-picker]');
    return { packQty:Number(picker?.dataset.packQty||1), total:Number(picker?.dataset.total||0), perDose:Number(picker?.dataset.perDose||0), ...(window.SwedsnusSubscriptions?.selection(scope)||{purchaseMode:'once',intervalWeeks:null}) };
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
    body.innerHTML=items.length?items.map(item=>`<div class="cart-item"><div><strong>${api?.escapeHtml(item.name)||item.name}</strong><br><span>${item.packQty||1}-pack · ${item.qty||1} st</span>${item.purchaseMode==='subscription'?`<br><span class="subscription-tag">Prenumeration · ${window.SwedsnusSubscriptions.intervalLabel(item.intervalWeeks)}</span>`:''}${item.perDose?`<br><small>${Number(item.perDose).toLocaleString('sv-SE',{minimumFractionDigits:2,maximumFractionDigits:2})} kr/dosa</small>`:''}</div><div>${api?.money?api.money(item.totalPrice*(item.qty||1)):`${item.totalPrice*(item.qty||1)} kr`}<br><button type="button" data-cart-remove="${item.cartKey}">Ta bort</button></div></div>`).join(''):'<p>Varukorgen är tom.</p>';
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
    const cartKey=`${id}::${packQty}::${selected.purchaseMode}::${selected.intervalWeeks||0}`;
    const items=read();
    const existing=items.find(item=>item.cartKey===cartKey);
    if(existing) existing.qty=(existing.qty||1)+1;
    else items.push({cartKey,id,name:api.name(row),packQty,totalPrice,perDose,qty:1,purchaseMode:selected.purchaseMode,intervalWeeks:selected.intervalWeeks});
    write(items);
    document.querySelector('[data-cart-drawer]')?.classList.add('open');
  }

  function choosePack(option) {
    const picker=option.closest('[data-pack-picker]');
    if(!picker) return;
    picker.dataset.packQty=option.dataset.packQty;
    picker.dataset.total=option.dataset.total;
    picker.dataset.perDose=option.dataset.perDose;
    picker.querySelectorAll('[data-pack-option]').forEach(item=>item.classList.toggle('selected',item===option));
    const api=window.SwedsnusV2;
    const row=api?.find(picker.dataset.productId);
    const suffix=row?.amount_dosor?'dosa':'st';
    const total=Number(option.dataset.total||0);
    const perDose=Number(option.dataset.perDose||0);
    picker.querySelector('[data-pack-label]').textContent=`${option.dataset.packQty}-pack`;
    picker.querySelector('[data-pack-summary]').textContent=`${api?.money?api.money(total):`${total} kr`} · ${perDose.toLocaleString('sv-SE',{minimumFractionDigits:2,maximumFractionDigits:2})} kr/${suffix}`;
    const scope=picker.closest('.product-card,.product-summary');
    if(scope?.querySelector('[data-selected-total]')) scope.querySelector('[data-selected-total]').textContent=api?.money?api.money(total):`${total} kr`;
    if(scope?.querySelector('[data-selected-per-dose]')) scope.querySelector('[data-selected-per-dose]').textContent=`${perDose.toLocaleString('sv-SE',{minimumFractionDigits:2,maximumFractionDigits:2})} kr/${suffix}`;
    const menu=picker.querySelector('[data-pack-menu]');
    const trigger=picker.querySelector('[data-pack-toggle]');
    if(menu) menu.hidden=true;
    if(trigger) trigger.setAttribute('aria-expanded','false');
  }

  window.SwedsnusCart = {
    read,
    write,
    addItems: incoming => {
      const items=read();
      incoming.forEach(next=>{
        const existing=items.find(item=>item.cartKey===next.cartKey);
        if(existing) existing.qty=(existing.qty||1)+(next.qty||1);
        else items.push({...next,qty:next.qty||1});
      });
      write(items);
    },
    remove: cartKey => write(read().filter(item=>item.cartKey!==cartKey)),
    setQuantity: (cartKey,qty) => {
      const items=read();
      const item=items.find(entry=>entry.cartKey===cartKey);
      if(!item) return;
      item.qty=Math.max(1,Number(qty)||1);
      write(items);
    }
  };

  document.addEventListener('click',event=>{
    const packToggle=event.target.closest('[data-pack-toggle]');
    if(packToggle){
      const picker=packToggle.closest('[data-pack-picker]');
      const menu=picker?.querySelector('[data-pack-menu]');
      if(menu){ const opening=menu.hidden; document.querySelectorAll('[data-pack-menu]').forEach(other=>other.hidden=true); menu.hidden=!opening; packToggle.setAttribute('aria-expanded',String(opening)); }
      return;
    }
    const packOption=event.target.closest('[data-pack-option]');
    if(packOption){ choosePack(packOption); return; }
    if(!event.target.closest('[data-pack-picker]')) document.querySelectorAll('[data-pack-menu]').forEach(menu=>menu.hidden=true);
    const addButton=event.target.closest('[data-add-cart]');
    if(addButton){ event.preventDefault(); add(addButton); }
    if(event.target.closest('[data-cart-toggle]')) document.querySelector('[data-cart-drawer]')?.classList.toggle('open');
    if(event.target.closest('[data-cart-close]')) document.querySelector('[data-cart-drawer]')?.classList.remove('open');
    const removeButton=event.target.closest('[data-cart-remove]');
    if(removeButton) window.SwedsnusCart.remove(removeButton.dataset.cartRemove);
  });
  render();
})();
