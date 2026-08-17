(() => {
  function money(value) { return window.SwedsnusV2?.money ? window.SwedsnusV2.money(value) : `${Number(value||0).toLocaleString('sv-SE')} kr`; }
  function renderCheckout() {
    const root=document.querySelector('[data-checkout-items]');
    const cart=window.SwedsnusCart;
    if(!root || !cart) return;
    const items=cart.read();
    const count=items.reduce((sum,item)=>sum+((item.qty||1)*(item.packQty||1)),0);
    const subtotal=items.reduce((sum,item)=>sum+(item.totalPrice||0)*(item.qty||1),0);
    document.querySelector('[data-checkout-count]').textContent=`${count} produkter`;
    document.querySelector('[data-checkout-subtotal]').textContent=money(subtotal);
    document.querySelector('[data-checkout-total]').textContent=money(subtotal);
    const recurring=document.querySelector('[data-checkout-recurring]');
    if(recurring)recurring.hidden=!items.some(item=>item.purchaseMode==='subscription');
    if(!items.length) {
      root.innerHTML='<div class="checkout-empty"><h3>Varukorgen är tom</h3><p>Lägg till produkter innan du går vidare till kassan.</p><a class="btn" href="portion.html">Till sortimentet</a></div>';
      return;
    }
    root.innerHTML=items.map(item=>`<article class="checkout-item" data-checkout-item="${item.cartKey}"><div class="checkout-item-image">Produktbild</div><div class="checkout-item-main"><h3>${window.SwedsnusV2.escapeHtml(item.name)}</h3><p>${item.packQty||1}-pack${item.perDose?` · ${Number(item.perDose).toLocaleString('sv-SE',{minimumFractionDigits:2,maximumFractionDigits:2})} kr/dosa`:''}</p>${item.purchaseMode==='subscription'?`<span class="subscription-tag">Prenumeration · ${window.SwedsnusSubscriptions.intervalLabel(item.intervalWeeks)}</span>`:''}<div class="checkout-quantity"><button type="button" data-checkout-minus="${item.cartKey}" aria-label="Minska antal">−</button><input type="number" min="1" value="${item.qty||1}" data-checkout-qty="${item.cartKey}" aria-label="Antal"><button type="button" data-checkout-plus="${item.cartKey}" aria-label="Öka antal">+</button></div></div><div class="checkout-item-side"><strong>${money((item.totalPrice||0)*(item.qty||1))}</strong><button type="button" class="checkout-remove" data-checkout-remove="${item.cartKey}">Ta bort</button></div></article>`).join('');
  }

  document.addEventListener('click',event=>{
    const cart=window.SwedsnusCart;
    if(!cart) return;
    const plus=event.target.closest('[data-checkout-plus]');
    if(plus){ const item=cart.read().find(entry=>entry.cartKey===plus.dataset.checkoutPlus); if(item) cart.setQuantity(item.cartKey,(item.qty||1)+1); }
    const minus=event.target.closest('[data-checkout-minus]');
    if(minus){ const item=cart.read().find(entry=>entry.cartKey===minus.dataset.checkoutMinus); if(item) cart.setQuantity(item.cartKey,Math.max(1,(item.qty||1)-1)); }
    const remove=event.target.closest('[data-checkout-remove]');
    if(remove) cart.remove(remove.dataset.checkoutRemove);
  });
  document.addEventListener('change',event=>{
    const input=event.target.closest('[data-checkout-qty]');
    if(input && window.SwedsnusCart) window.SwedsnusCart.setQuantity(input.dataset.checkoutQty,Math.max(1,Number(input.value)||1));
  });
  document.addEventListener('swedsnus-v2:cart-changed',renderCheckout);
  document.addEventListener('swedsnus-v2:products-ready',renderCheckout);
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',renderCheckout):renderCheckout();
})();
