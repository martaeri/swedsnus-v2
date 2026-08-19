(() => {
  if (window.__swedsnusV2Loaded) return;
  window.__swedsnusV2Loaded = true;
  ['ui-components.css','product-images.css','developer-log.css','mobile.css','ux-refinements.css'].forEach(href => {
    if (!document.querySelector(`link[href="${href}"]`)) {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = href;
      document.head.appendChild(css);
    }
  });
  function load(src) { return new Promise((resolve,reject)=>{ const s=document.createElement('script'); s.src=src; s.onload=resolve; s.onerror=reject; document.body.appendChild(s); }); }
  async function start() {
    await load('theme.js');
    await load('layout.js');
    const drawer = document.createElement('aside');
    drawer.className = 'cart-drawer';
    drawer.dataset.cartDrawer = '';
    drawer.innerHTML = `<div class="cart-head"><strong>Varukorg</strong><button type="button" data-cart-close>Stäng</button></div><div class="cart-items" data-cart-items></div><div class="cart-foot"><div class="catalog-tools"><span>Totalt</span><strong data-cart-total>0 kr</strong></div><a class="btn primary cart-checkout-link" href="checkout.html">Till kassan</a></div>`;
    document.body.append(drawer);
    await load('product-store.js');
    await load('subscriptions.js');
    await load('catalog.js');
    await load('product-images.js');
    await load('cart.js');
    await load('account.js');
    await load('developer-log.js');
    if(document.body.dataset.page==='checkout') await load('checkout.js');
    if(document.body.dataset.page==='faq') await load('faq.js');
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
})();
