(() => {
  if (window.__swedsnusV2Loaded) return;
  window.__swedsnusV2Loaded = true;
  if (!document.querySelector('link[href="ui-components.css"]')) {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'ui-components.css';
    document.head.appendChild(css);
  }
  function load(src) { return new Promise((resolve,reject)=>{ const s=document.createElement('script'); s.src=src; s.onload=resolve; s.onerror=reject; document.body.appendChild(s); }); }
  async function start() {
    await load('theme.js');
    await load('layout.js');
    const drawer = document.createElement('aside');
    drawer.className = 'cart-drawer';
    drawer.dataset.cartDrawer = '';
    drawer.innerHTML = `<div class="cart-head"><strong>Varukorg</strong><button type="button" data-cart-close>Stäng</button></div><div class="cart-items" data-cart-items></div><div class="cart-foot"><div class="catalog-tools"><span>Totalt</span><strong data-cart-total>0 kr</strong></div><button class="btn primary" type="button" style="width:100%">Till kassan</button></div>`;
    document.body.append(drawer);
    await load('product-store.js');
    await load('catalog.js');
    await load('cart.js');
    await load('account.js');
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
})();
