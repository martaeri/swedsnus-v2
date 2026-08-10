(() => {
  const AUTH_KEY = 'swedsnus-v2-session';
  const BOOKMARKS_KEY = 'swedsnus-v2-bookmarks';
  const loggedIn = () => sessionStorage.getItem(AUTH_KEY) === 'true';
  function renderBookmarks() {
    const root = document.querySelector('[data-bookmark-grid]');
    if (!root || !window.SwedsnusV2?.state.ready) return;
    let ids = [];
    try { ids = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '[]'); } catch {}
    const rows = ids.map(id => window.SwedsnusV2.find(id)).filter(Boolean);
    root.innerHTML = rows.length ? rows.map(window.SwedsnusV2.card).join('') : '<p>Du har inga sparade produkter ännu.</p>';
    document.dispatchEvent(new CustomEvent('swedsnus-v2:cards-rendered'));
  }
  function renderAccount() {
    const root = document.querySelector('[data-account-root]');
    if (!root) return;
    if (!loggedIn()) {
      root.innerHTML = `<p class="kicker">Mina sidor</p><h1>Logga in</h1><p>Detta är ett prototypflöde. Den skarpa webbplatsen ska kopplas till vald identitets- och checkoutlösning.</p><button class="btn primary" type="button" data-demo-login>Demo-inloggning</button>`;
      return;
    }
    root.innerHTML = `<p class="kicker">Mina sidor</p><h1>Konto</h1><div class="knowledge-grid"><article><h3>Orderhistorik</h3><p>Orderhistorik kommer att hämtas från den slutliga orderintegrationen.</p></article><article><h3>Sparade produkter</h3><p>Produkter du sparar lokalt i prototypen finns på sidan Sparat.</p><a class="section-link" href="bookmarks.html">Visa sparade</a></article><article><h3>Kontouppgifter</h3><p>Kunddata ska hämtas från det system som blir master för kundinformationen.</p></article></div><div class="button-row"><button class="btn" type="button" data-demo-logout>Logga ut</button></div>`;
  }
  document.addEventListener('click', event => {
    if (event.target.closest('[data-demo-login]')) { sessionStorage.setItem(AUTH_KEY,'true'); renderAccount(); }
    if (event.target.closest('[data-demo-logout]')) { sessionStorage.removeItem(AUTH_KEY); renderAccount(); }
  });
  document.addEventListener('swedsnus-v2:products-ready', renderBookmarks);
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', renderAccount) : renderAccount();
})();
