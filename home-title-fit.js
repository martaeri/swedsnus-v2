(() => {
  if (document.body.dataset.page !== 'home') return;

  const groups = [
    ['h1', 'main h1'],
    ['h2', 'main h2'],
    ['h3', '.knowledge-grid h3'],
    ['info', '.info-band strong'],
    ['footer', '.site-footer h3'],
    ['product', '.product-name', true]
  ];
  const mobile = window.matchMedia('(max-width: 760px)');
  const measure = document.createElement('span');
  measure.setAttribute('aria-hidden', 'true');
  measure.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;white-space:nowrap;width:max-content;';
  document.body.append(measure);

  function fitTitles() {
    groups.forEach(([key]) => document.body.style.removeProperty(`--home-title-${key}`));
    if (!mobile.matches) return;

    groups.forEach(([key, selector, wholeWords]) => {
      const titles = [...document.querySelectorAll(selector)];
      if (!titles.length) return;
      const baseSize = Math.min(...titles.map(title => parseFloat(getComputedStyle(title).fontSize)));
      let size = baseSize;

      titles.forEach(title => {
        const style = getComputedStyle(title);
        const available = title.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 1;
        if (available <= 0) return;
        measure.style.font = style.font;
        measure.style.fontSize = `${baseSize}px`;
        measure.style.letterSpacing = style.letterSpacing;
        measure.style.textTransform = style.textTransform;
        const text = title.textContent.trim();
        const parts = wholeWords ? text.split(/\s+/) : [text];
        parts.forEach(part => {
          measure.textContent = part;
          const width = measure.getBoundingClientRect().width;
          if (width) size = Math.min(size, baseSize * available / width);
        });
      });

      // Every title in a group uses the same size, set by its longest title.
      document.body.style.setProperty(`--home-title-${key}`, `${Math.floor(size * 100) / 100}px`);
    });
  }

  let frame;
  function schedule() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(fitTitles);
  }
  window.addEventListener('resize', schedule);
  window.addEventListener('pageshow', schedule);
  document.addEventListener('swedsnus-v2:cards-rendered', schedule);
  document.fonts.ready.then(schedule);
  document.fonts.addEventListener('loadingdone', schedule);
  document.querySelectorAll('link[rel="stylesheet"]').forEach(link => link.addEventListener('load', schedule));
  schedule();
})();
