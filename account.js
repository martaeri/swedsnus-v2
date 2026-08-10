(() => {
  const AUTH_KEY = 'swedsnus-v2-session';
  const BOOKMARKS_KEY = 'swedsnus-v2-bookmarks';
  const loggedIn = () => sessionStorage.getItem(AUTH_KEY) === 'true';
  const readBookmarks = () => {
    if (!loggedIn()) return [];
    try { const value=JSON.parse(localStorage.getItem(BOOKMARKS_KEY)||'[]'); return Array.isArray(value)?value:[]; } catch { return []; }
  };
  const writeBookmarks = ids => {
    if (!loggedIn()) return;
    localStorage.setItem(BOOKMARKS_KEY,JSON.stringify(ids));
    syncBookmarks();
    document.dispatchEvent(new CustomEvent('swedsnus-v2:bookmarks-changed'));
  };
  const clearBookmarks = () => {
    localStorage.removeItem(BOOKMARKS_KEY);
    syncBookmarks();
    document.dispatchEvent(new CustomEvent('swedsnus-v2:bookmarks-changed'));
  };

  function ensureModal() {
    if (document.querySelector('[data-login-modal]')) return;
    const modal=document.createElement('div');
    modal.className='login-modal';
    modal.dataset.loginModal='';
    modal.hidden=true;
    modal.innerHTML=`<div class="login-modal-backdrop" data-login-close></div><section class="login-modal-card" role="dialog" aria-modal="true" aria-labelledby="login-modal-title"><button class="login-modal-close" type="button" data-login-close aria-label="Stäng">×</button><p class="kicker">Mina sidor</p><h2 id="login-modal-title">Logga in för att fortsätta</h2><p>Sparade produkter hör till ditt konto. I prototypen används en demo-inloggning tills den slutliga identitetslösningen är kopplad.</p><button class="btn primary" type="button" data-demo-login-modal>Demo-inloggning</button></section>`;
    document.body.append(modal);
  }

  function openModal(returnTo='') {
    ensureModal();
    const modal=document.querySelector('[data-login-modal]');
    modal.dataset.returnTo=returnTo;
    modal.hidden=false;
    document.body.classList.add('modal-open');
  }
  function closeModal() {
    const modal=document.querySelector('[data-login-modal]');
    if(modal) modal.hidden=true;
    document.body.classList.remove('modal-open');
  }

  function syncBookmarks() {
    const authenticated=loggedIn();
    if(!authenticated) localStorage.removeItem(BOOKMARKS_KEY);
    const ids=new Set(authenticated?readBookmarks():[]);
    document.querySelectorAll('[data-bookmark-count]').forEach(el=>{
      el.textContent=ids.size;
      el.hidden=!authenticated;
    });
    document.querySelectorAll('[data-bookmark]').forEach(button=>{
      const active=authenticated && ids.has(button.dataset.bookmark);
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',String(active));
      button.setAttribute('aria-label',active?'Ta bort sparad produkt':'Spara produkt');
    });
  }

  function toggleBookmark(id) {
    if(!loggedIn()) { openModal(); return; }
    const ids=new Set(readBookmarks());
    ids.has(id)?ids.delete(id):ids.add(id);
    writeBookmarks([...ids]);
    renderBookmarks();
  }

  function renderBookmarks() {
    const root=document.querySelector('[data-bookmark-grid]');
    if(!root || !window.SwedsnusV2?.state.ready) return;
    if(!loggedIn()) { root.innerHTML=''; openModal('bookmarks.html'); return; }
    const rows=readBookmarks().map(id=>window.SwedsnusV2.find(id)).filter(Boolean);
    root.innerHTML=rows.length?rows.map(window.SwedsnusV2.card).join(''):'<p>Du har inga sparade produkter ännu.</p>';
    syncBookmarks();
    document.dispatchEvent(new CustomEvent('swedsnus-v2:cards-rendered'));
  }

  function renderAccount() {
    const root=document.querySelector('[data-account-root]');
    if(!root) return;
    if(!loggedIn()) {
      root.innerHTML=`<p class="kicker">Mina sidor</p><h1>Logga in</h1><p>Detta är ett prototypflöde. Den skarpa webbplatsen ska kopplas till vald identitets- och checkoutlösning.</p><button class="btn primary" type="button" data-demo-login>Demo-inloggning</button>`;
      return;
    }
    root.innerHTML=`<p class="kicker">Mina sidor</p><h1>Konto</h1><div class="knowledge-grid"><article><h3>Orderhistorik</h3><p>Orderhistorik kommer att hämtas från den slutliga orderintegrationen.</p></article><article><h3>Sparade produkter</h3><p>Sparade produkter hör till den aktiva inloggningen i prototypen och töms när du loggar ut.</p><a class="section-link" href="bookmarks.html">Visa sparade produkter</a></article><article><h3>Kontouppgifter</h3><p>Kunddata ska hämtas från det system som blir master för kundinformationen.</p></article></div><div class="button-row"><button class="btn" type="button" data-demo-logout>Logga ut</button></div>`;
  }

  document.addEventListener('click',event=>{
    const bookmarksLink=event.target.closest('a[href="bookmarks.html"]');
    if(bookmarksLink && !loggedIn()) { event.preventDefault(); openModal('bookmarks.html'); return; }
    const bookmark=event.target.closest('[data-bookmark]');
    if(bookmark) { event.preventDefault(); toggleBookmark(bookmark.dataset.bookmark); return; }
    if(event.target.closest('[data-login-close]')) closeModal();
    if(event.target.closest('[data-demo-login], [data-demo-login-modal]')) {
      sessionStorage.setItem(AUTH_KEY,'true');
      localStorage.removeItem(BOOKMARKS_KEY);
      const returnTo=document.querySelector('[data-login-modal]')?.dataset.returnTo || '';
      closeModal(); renderAccount(); syncBookmarks(); renderBookmarks();
      if(returnTo && !location.pathname.endsWith(returnTo)) location.href=returnTo;
    }
    if(event.target.closest('[data-demo-logout]')) {
      clearBookmarks();
      sessionStorage.removeItem(AUTH_KEY);
      syncBookmarks();
      renderAccount();
      if(document.body.dataset.page==='bookmarks') openModal('bookmarks.html');
    }
  });
  document.addEventListener('swedsnus-v2:products-ready',()=>{ renderBookmarks(); syncBookmarks(); });
  document.addEventListener('swedsnus-v2:cards-rendered',syncBookmarks);
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>{ ensureModal(); syncBookmarks(); renderAccount(); if(document.body.dataset.page==='bookmarks'&&!loggedIn()) openModal('bookmarks.html'); }):(()=>{ ensureModal(); syncBookmarks(); renderAccount(); if(document.body.dataset.page==='bookmarks'&&!loggedIn()) openModal('bookmarks.html'); })();
})();