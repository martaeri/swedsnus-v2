(() => {
  function hydrateProductPage() {
    if (document.body.dataset.page !== 'product') return;
    const api = window.SwedsnusV2;
    if (!api?.state.ready) return;
    const id = new URLSearchParams(location.search).get('id');
    const row = api.find(id);
    const gallery = document.querySelector('.product-gallery');
    if (!row || !gallery || gallery.classList.contains('has-product-image')) return;
    if (!api.image(row)) return;
    gallery.outerHTML = api.media(row, 'product-gallery', true);
  }

  const hydrate = () => queueMicrotask(hydrateProductPage);
  document.addEventListener('swedsnus-v2:products-ready', hydrate);
  document.addEventListener('swedsnus-v2:cards-rendered', hydrate);
  if (window.SwedsnusV2?.state.ready) hydrate();
})();
