(() => {
  if (document.body.dataset.page !== 'home') return;

  const api = window.SwedsnusV2;
  if (!api?.state?.ready) return;

  const groups = [
    {
      selector: '[data-home-portion]',
      filter: row => row.product_family === 'Portionssnus' && row.site_section === 'Portionssnus' && row.tobacco_type !== 'Tobaksfri'
    },
    {
      selector: '[data-home-los]',
      filter: row => row.product_family === 'Lössnus' || row.aroma_type === 'Expressarom'
    },
    {
      selector: '[data-home-white]',
      filter: row => row.tobacco_type === 'Tobaksfri' || row.site_section === 'Vitt snus'
    }
  ];

  function createCarousel(selector, filter) {
    const rail = document.querySelector(selector);
    if (!rail) return;

    rail.innerHTML = api.state.rows.filter(filter).slice(0, 10).map(api.card).join('');
    rail.classList.add('home-product-carousel-track');

    const viewport = document.createElement('div');
    viewport.className = 'home-product-carousel-viewport';
    rail.parentNode.insertBefore(viewport, rail);
    viewport.appendChild(rail);

    const controls = document.createElement('div');
    controls.className = 'home-product-carousel-controls';
    controls.innerHTML = `
      <button type="button" class="home-carousel-arrow prev" aria-label="Föregående produkter">‹</button>
      <button type="button" class="home-carousel-arrow next" aria-label="Nästa produkter">›</button>
    `;
    viewport.appendChild(controls);

    const prev = controls.querySelector('.prev');
    const next = controls.querySelector('.next');

    const scrollAmount = () => Math.max(rail.clientWidth * 0.82, 260);
    const update = () => {
      const max = rail.scrollWidth - rail.clientWidth - 2;
      prev.disabled = rail.scrollLeft <= 2;
      next.disabled = rail.scrollLeft >= max;
    };

    prev.addEventListener('click', () => rail.scrollBy({ left: -scrollAmount(), behavior: 'smooth' }));
    next.addEventListener('click', () => rail.scrollBy({ left: scrollAmount(), behavior: 'smooth' }));
    rail.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  groups.forEach(group => createCarousel(group.selector, group.filter));
  document.dispatchEvent(new CustomEvent('swedsnus-v2:cards-rendered'));
})();
