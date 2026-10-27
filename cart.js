(() => {
  const KEY = 'swedsnus-v2-cart';
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const TRASH_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6"/></svg>';
  const read = () => { try { const value=JSON.parse(localStorage.getItem(KEY)||'[]'); return Array.isArray(value)?value.filter(subscriptionAllowed):[]; } catch { return []; } };
  const subscriptionAllowed = item => item.purchaseMode !== 'subscription' || !window.SwedsnusV2?.state.ready || Boolean(window.SwedsnusV2?.subscriptionEligible(window.SwedsnusV2.find(item.id)));
  const write = items => { localStorage.setItem(KEY,JSON.stringify(items.filter(subscriptionAllowed))); render(); document.dispatchEvent(new CustomEvent('swedsnus-v2:cart-changed')); };

  function selection(button) {
    const scope=button.closest('.product-card,.product-summary');
    const picker=scope?.querySelector('[data-pack-picker]');
    return { packQty:Number(picker?.dataset.packQty||1), total:Number(picker?.dataset.total||0), unitPrice:Number(picker?.dataset.unitPrice||0), ...(window.SwedsnusSubscriptions?.selection(scope)||{purchaseMode:'once',intervalWeeks:null}) };
  }

  function unitLabel(item) {
    const api=window.SwedsnusV2;
    const value=Number(item.totalPrice||0)/Math.max(1,Number(item.packQty)||1);
    return api?.unitPriceLabel?api.unitPriceLabel(value):`${value.toLocaleString('sv-SE',{maximumFractionDigits:2})} kr/st`;
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
    const itemHtml=item=>{
      const row=api?.find(item.id);
      const name=escapeHtml(item.name);
      const image=row?`<a class="cart-item-media" href="${api.url(row)}" aria-label="Visa ${name}">${api.media(row,'cart-item-image')}</a>`:'<div class="cart-item-media"><div class="cart-item-image"><span class="product-image-placeholder">Produktbild</span></div></div>';
      return `<article class="cart-item">${image}<div class="cart-item-content"><strong>${name}</strong><span>${item.packQty||1}-pack · ${item.qty||1} st</span>${item.purchaseMode==='subscription'?`<span class="subscription-tag">${window.SwedsnusSubscriptions.intervalLabel(item.intervalWeeks)}</span>`:''}${item.totalPrice?`<small>${unitLabel(item)}</small>`:''}</div><div class="cart-item-actions"><strong class="cart-item-total">${api?.money?api.money(item.totalPrice*(item.qty||1)):`${item.totalPrice*(item.qty||1)} kr`}</strong><button class="cart-item-remove" type="button" data-cart-remove="${escapeHtml(item.cartKey)}" aria-label="Ta bort ${name}" title="Ta bort produkt">${TRASH_ICON}</button></div></article>`;
    };
    const once=items.filter(item=>item.purchaseMode!=='subscription');
    const recurring=items.filter(item=>item.purchaseMode==='subscription');
    body.innerHTML=items.length?`${once.length?`<section class="cart-group"><h3>Engångsköp</h3>${once.map(itemHtml).join('')}</section>`:''}${recurring.length?`<section class="cart-group subscription-cart-group"><div class="cart-group-heading"><h3>Prenumerationer</h3><span>Återkommande</span></div>${recurring.map(itemHtml).join('')}</section>`:''}`:'<p>Varukorgen är tom.</p>';
    const sum=items.reduce((value,item)=>value+(item.totalPrice||0)*(item.qty||1),0);
    if(total) total.textContent=api?.money?api.money(sum):`${sum} kr`;
  }

  function add(button) {
    const api=window.SwedsnusV2;
    const row=api?.find(button.dataset.addCart);
    if(!row) return;
    const selected=selection(button);
    if(selected.purchaseMode==='subscription'&&!api.subscriptionEligible(row)) return;
    const fallback=api.packs(row).find(option=>option.packQty===selected.packQty)||api.packs(row)[0];
    const packQty=selected.packQty||fallback.packQty;
    const totalPrice=selected.total||fallback.total;
    const unitPrice=totalPrice/packQty;
    const id=api.key(row);
    const cartKey=`${id}::${packQty}::${selected.purchaseMode}::${selected.intervalWeeks||0}`;
    const items=read();
    const existing=items.find(item=>item.cartKey===cartKey);
    if(existing) existing.qty=(existing.qty||1)+1;
    else items.push({cartKey,id,name:api.name(row),packQty,totalPrice,unitPrice,qty:1,purchaseMode:selected.purchaseMode,intervalWeeks:selected.intervalWeeks});
    write(items);
    document.querySelector('[data-cart-drawer]')?.classList.add('open');
  }

  let activePackMenu = null;
  let packMenuId = 0;

  function closePackMenu(restoreFocus = false) {
    if(!activePackMenu) return;
    const {picker,menu,trigger}=activePackMenu;
    activePackMenu=null;
    if(typeof menu.hidePopover==='function' && menu.matches(':popover-open')) menu.hidePopover();
    menu.hidden=true;
    menu.removeAttribute('popover');
    menu.removeAttribute('style');
    picker.append(menu);
    picker.classList.remove('is-open');
    trigger.setAttribute('aria-expanded','false');
    if(restoreFocus && trigger.isConnected) trigger.focus({preventScroll:true});
  }

  function positionPackMenu() {
    if(!activePackMenu) return;
    const {picker,menu,trigger}=activePackMenu;
    if(!picker.isConnected || !trigger.getClientRects().length){ closePackMenu(); return; }
    const rect=trigger.getBoundingClientRect();
    const viewport=window.visualViewport;
    const left=viewport?.offsetLeft||0, top=viewport?.offsetTop||0;
    const width=viewport?.width||window.innerWidth;
    const height=viewport?.height||window.innerHeight;
    if(rect.bottom<=top || rect.top>=top+height || rect.right<=left || rect.left>=left+width){ closePackMenu(); return; }
    // The menu lives outside the card, so it cannot inherit the rail's clipping.
    // Align the selected row with the closed control, then keep it on screen.
    const menuWidth=Math.min(Math.max(rect.width,220),width-16);
    menu.style.width=`${menuWidth}px`;
    menu.style.maxHeight=`${Math.max(44,height-16)}px`;
    menu.style.left=`${Math.max(left+8,Math.min(rect.left,left+width-menuWidth-8))}px`;
    const selected=menu.querySelector('[aria-selected="true"]');
    const selectedOffset=selected?selected.getBoundingClientRect().top-menu.getBoundingClientRect().top:0;
    const menuHeight=menu.getBoundingClientRect().height;
    menu.style.top=`${Math.max(top+8,Math.min(rect.top-selectedOffset,top+height-menuHeight-8))}px`;
  }

  function openPackMenu(trigger) {
    if(activePackMenu?.trigger===trigger){ closePackMenu(true); return; }
    closePackMenu();
    const picker=trigger.closest('[data-pack-picker]');
    const menu=picker?.querySelector('[data-pack-menu]');
    if(!menu) return;
    if(!menu.id) menu.id=`pack-menu-${++packMenuId}`;
    trigger.setAttribute('aria-controls',menu.id);
    trigger.setAttribute('aria-expanded','true');
    activePackMenu={picker,menu,trigger};
    document.body.append(menu);
    menu.hidden=false;
    // Use the browser's top layer where available; the body portal also works
    // in browsers without Popover API support.
    if(typeof menu.showPopover==='function'){
      menu.setAttribute('popover','manual');
      menu.showPopover();
    }
    picker.classList.add('is-open');
    positionPackMenu();
    menu.querySelector('[aria-selected="true"]')?.focus({preventScroll:true});
  }

  function choosePack(option) {
    const menu=option.closest('[data-pack-menu]');
    const picker=option.closest('[data-pack-picker]')||(activePackMenu?.menu===menu?activePackMenu.picker:null);
    if(!picker) return;
    picker.dataset.packQty=option.dataset.packQty;
    picker.dataset.total=option.dataset.total;
    picker.dataset.unitPrice=option.dataset.unitPrice;
    picker.dataset.units=option.dataset.units;
    (menu||picker).querySelectorAll('[data-pack-option]').forEach(item=>{
      item.classList.toggle('selected',item===option);
      item.setAttribute('aria-selected',String(item===option));
    });
    picker.querySelectorAll('[data-pack-radio]').forEach(input=>{
      input.checked=input===option;
      input.closest('.pack-list-option').classList.toggle('selected',input.checked);
    });
    const api=window.SwedsnusV2;
    const total=Number(option.dataset.total||0);
    const unitPrice=Number(option.dataset.unitPrice||0);
    const label=picker.querySelector('[data-pack-label]');
    if(label) label.textContent=`${option.dataset.packQty}-pack`;
    const totalEl=picker.querySelector('[data-pack-total]');
    if(totalEl) totalEl.textContent=api?.money?api.money(total):`${total} kr`;
    const summary=picker.querySelector('[data-pack-summary]');
    if(summary) summary.textContent=api.unitPriceLabel(unitPrice);
    if(menu) closePackMenu(true);
  }

  window.SwedsnusCart = {
    read,
    write,
    addItems: incoming => {
      const items=read();
      incoming.filter(next=>next.purchaseMode!=='subscription'||Boolean(window.SwedsnusV2?.subscriptionEligible(window.SwedsnusV2.find(next.id)))).forEach(next=>{
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

  document.addEventListener('change',event=>{
    const radio=event.target.closest('[data-pack-radio]');
    if(radio) choosePack(radio);
  });
  document.addEventListener('keydown',event=>{
    const trigger=event.target.closest('[data-pack-toggle]');
    if(!activePackMenu){
      if(trigger && ['ArrowDown','ArrowUp'].includes(event.key)){ event.preventDefault(); openPackMenu(trigger); }
      return;
    }
    if(event.key==='Escape'){ event.preventDefault(); closePackMenu(true); return; }
    if(event.key==='Tab'){ closePackMenu(true); return; }
    if(!activePackMenu.menu.contains(event.target)) return;
    const options=[...activePackMenu.menu.querySelectorAll('[data-pack-option]')];
    const index=options.indexOf(event.target.closest('[data-pack-option]'));
    let next;
    if(event.key==='ArrowDown') next=(index+1)%options.length;
    if(event.key==='ArrowUp') next=(index-1+options.length)%options.length;
    if(event.key==='Home') next=0;
    if(event.key==='End') next=options.length-1;
    if(next!==undefined){ event.preventDefault(); options[next].focus({preventScroll:true}); }
  });
  document.addEventListener('focusin',event=>{
    if(activePackMenu && event.target!==activePackMenu.trigger && !activePackMenu.menu.contains(event.target)) closePackMenu();
  });
  // Page/rail scrolling dismisses the popup; scrolling its own options does not.
  document.addEventListener('scroll',event=>{
    if(activePackMenu && !activePackMenu.menu.contains(event.target)) closePackMenu();
  },true);
  window.addEventListener('resize',positionPackMenu);
  window.visualViewport?.addEventListener('resize',positionPackMenu);
  window.visualViewport?.addEventListener('scroll',positionPackMenu);
  document.addEventListener('swedsnus-v2:filters-applied',()=>closePackMenu());
  document.addEventListener('click',event=>{
    const packToggle=event.target.closest('[data-pack-toggle]');
    if(packToggle){
      openPackMenu(packToggle);
      return;
    }
    const packOption=event.target.closest('[data-pack-option]');
    if(packOption){ choosePack(packOption); return; }
    closePackMenu();
    const addButton=event.target.closest('[data-add-cart]');
    if(addButton){ event.preventDefault(); add(addButton); }
    if(event.target.closest('[data-cart-toggle]')) document.querySelector('[data-cart-drawer]')?.classList.toggle('open');
    if(event.target.closest('[data-cart-close]')) document.querySelector('[data-cart-drawer]')?.classList.remove('open');
    const removeButton=event.target.closest('[data-cart-remove]');
    if(removeButton) window.SwedsnusCart.remove(removeButton.dataset.cartRemove);
  });
  document.addEventListener('swedsnus-v2:products-ready',()=>write(read()));
  if(window.SwedsnusV2?.state.ready) write(read());
  else render();
})();
