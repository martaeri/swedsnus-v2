(() => {
  const page = document.body.dataset.page || '';
  const active = key => page === key ? ' class="active"' : '';
  const theme = document.documentElement.dataset.theme || 'cool';
  const header = document.createElement('header');
  header.className = 'site-header';
  header.innerHTML = `<div class="age-banner">18-årsgräns: Tobaksprodukter och tobaksfria nikotinprodukter får inte säljas eller lämnas ut till personer under 18 år.</div><div class="header-main"><a class="brand" href="index.html">Swedsnus<small>Tillverkat i Hemsjö</small></a><label class="header-search"><input type="search" data-product-search placeholder="Sök produkt, smak eller format" aria-label="Sök produkter"></label><div class="header-actions"><a class="header-action-link" href="bookmarks.html">Sparade produkter <span class="header-count" data-bookmark-count hidden>0</span></a><a class="header-account-link" href="account.html">Konto</a><button class="header-action-link" type="button" data-cart-toggle>Varukorg <span class="header-count" data-cart-count>0</span></button></div><button class="mobile-menu-toggle" type="button" data-mobile-menu-toggle aria-expanded="false" aria-controls="main-navigation"><span></span><span></span><span></span><b>Meny</b></button></div><nav class="nav-bar" id="main-navigation" data-mobile-navigation><div class="nav-inner"><a href="index.html"${active('home')}>Hem</a><a href="portion.html"${active('portion')}>Portionssnus</a><a href="los.html"${active('los')}>Lössnus</a><a href="gor-eget.html"${active('gor-eget')}>Gör eget</a><a href="vitt-snus.html"${active('vitt-snus')}>Vitt snus</a><a href="tillbehor.html"${active('tillbehor')}>Tillbehör</a><a href="guide.html"${active('guide')}>Guide</a><a href="faq.html"${active('faq')}>Vanliga frågor</a></div></nav>`;
  document.body.prepend(header);

  const themeOverlay = document.createElement('label');
  themeOverlay.className = 'theme-overlay';
  themeOverlay.innerHTML = `<span>Tema</span><select data-theme-select aria-label="Välj färgtema"><option value="cool"${theme==='cool'?' selected':''}>Blå / grå</option><option value="warm"${theme==='warm'?' selected':''}>Beige / brun</option><option value="green"${theme==='green'?' selected':''}>Grön</option></select>`;
  document.body.append(themeOverlay);

  const footer = document.createElement('footer');
  footer.className = 'site-footer';
  footer.innerHTML = `<div class="footer-grid"><div><h3>Swedsnus</h3><p>Produktinformation för Swedsnus sortiment. Tillverkning i Hemsjö, Sverige.</p></div><div><h3>Sortiment</h3><a href="portion.html">Portionssnus</a><a href="los.html">Lössnus</a><a href="gor-eget.html">Gör eget</a><a href="vitt-snus.html">Vitt snus</a></div><div><h3>Information</h3><a href="guide.html">Beredningsguide</a><a href="faq.html">Vanliga frågor</a><a href="about.html">Om Swedsnus</a></div><div><h3>Kundservice</h3><a href="contact.html">Kontakt</a><a href="account.html">Mina sidor</a><p>Försäljning endast till personer som fyllt 18 år.</p></div></div><div class="footer-bottom">Tobaksprodukter och tobaksfria nikotinprodukter omfattas av olika svenska regelverk. Produktinformation och obligatoriska varningar anpassas efter produktkategori.</div>`;
  document.body.append(footer);

  const toggle = header.querySelector('[data-mobile-menu-toggle]');
  const nav = header.querySelector('[data-mobile-navigation]');
  const setMenu = open => {
    nav.classList.toggle('mobile-open', open);
    toggle.classList.toggle('active', open);
    toggle.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('mobile-nav-open', open);
  };
  toggle.addEventListener('click', event => { event.stopPropagation(); setMenu(!nav.classList.contains('mobile-open')); });
  nav.addEventListener('click', event => { event.stopPropagation(); if (event.target.closest('a')) setMenu(false); });
  document.addEventListener('click', event => {
    if (!nav.classList.contains('mobile-open')) return;
    if (!header.contains(event.target)) setMenu(false);
  });
  window.addEventListener('resize', () => { if (window.innerWidth > 760) setMenu(false); });

  document.dispatchEvent(new CustomEvent('swedsnus-v2:layout-ready'));
})();