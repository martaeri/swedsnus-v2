// Run from the repository root after installing Playwright and Chromium.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const repo = path.resolve(__dirname, '..');
const widths = (process.env.WIDTHS || '280,320,360,390,430,540,760').split(',').map(Number);
const manifest = JSON.parse(fs.readFileSync(path.join(repo, 'data/products.json')));
const rows = manifest.parts.flatMap(file => JSON.parse(fs.readFileSync(path.join(repo, file))));
const eligible = rows.find(row => String(row.subscription_available).toLowerCase() === 'yes');
const key = row => `${row.product_id}__${row.variant_id || row.article_number}`;
const sampleId = key(eligible);
const cart = [{ id: sampleId, cartKey: `${sampleId}::3::once::0`, name: eligible.generated_name, packQty: 3, totalPrice: 939, unitPrice: 313, qty: 1, purchaseMode: 'once' }];
const templates = fs.readdirSync(repo).filter(file => file.endsWith('.html'));
const cases = templates.map(file => ({ file, id: file === 'product.html' ? sampleId : '' }));
// Exercise product families whose variant/spec layouts differ from the first product.
const samples = new Map();
for (const row of rows) {
  if (!row.product_id || String(row.visible_on_site).toLowerCase() === 'no') continue;
  const group = [row.product_family, row.tobacco_type, row.accessory_type, row.aroma_type].join(':');
  if (!samples.has(group)) samples.set(group, row);
}
for (const row of samples.values()) if (key(row) !== sampleId) cases.push({ file: 'product.html', id: key(row) });

const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((request, response) => {
  const name = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const file = path.resolve(repo, '.' + (name === '/' ? '/index.html' : name));
  if (!file.startsWith(repo + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    response.writeHead(404); response.end(); return;
  }
  response.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(response);
});

async function inspect(page, name, failures) {
  const issues = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    const describe = el => `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().replace(/\s+/g, '.') : ''}`;
    const intentional = '.home-product-carousel-track,.series-filter-pills,.account-nav,.faq-categories,.developer-log-filters';
    const issues = [];
    if (document.documentElement.scrollWidth > viewport + 2) issues.push(`page width ${document.documentElement.scrollWidth} > ${viewport}`);
    for (const el of document.querySelectorAll('body *')) {
      const rect = el.getBoundingClientRect(), style = getComputedStyle(el);
      if (!el.getClientRects().length || !rect.width || !rect.height || style.visibility !== 'visible') continue;
      if (['INPUT', 'SELECT', 'TEXTAREA', 'SVG', 'PATH'].includes(el.tagName.toUpperCase())) continue;
      if (!el.closest(intentional) && (rect.right > viewport + 2 || rect.left < -2)) issues.push(`${describe(el)} extends outside viewport`);
      if (el.clientWidth && el.scrollWidth > el.clientWidth + 2 && !el.matches(intentional)) issues.push(`${describe(el)} has horizontal content overflow`);
      if (el.clientHeight && el.scrollHeight > el.clientHeight + 2 && ['hidden', 'clip'].includes(style.overflowY)) issues.push(`${describe(el)} clips vertical content`);
    }
    return [...new Set(issues)];
  });
  if (issues.length) failures.push({ name, issues });
}

async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser;
  const failures = [];
  try {
    browser = await chromium.launch();
    for (const width of widths) {
      const context = await browser.newContext({ viewport: { width, height: 800 } });
      await context.addInitScript(({ sampleId, cart }) => {
        sessionStorage.setItem('swedsnus-v2-session', 'true');
        localStorage.setItem('swedsnus-v2-bookmarks', JSON.stringify([sampleId]));
        localStorage.setItem('swedsnus-v2-cart', JSON.stringify(cart));
      }, { sampleId, cart });
      const page = await context.newPage();
      for (const entry of cases) {
        const name = `${width}px ${entry.file}${entry.id ? ' ' + entry.id : ''}`;
        await page.goto(`${base}/${entry.file}${entry.id ? '?id=' + encodeURIComponent(entry.id) : ''}`);
        await page.waitForFunction(() => window.SwedsnusV2?.state.ready && window.SwedsnusAccount && window.SwedsnusCart && document.querySelector('link[href="mobile-fit.css"]')?.sheet);
        await page.waitForLoadState('networkidle');
        await inspect(page, name, failures);
        if (entry.file === 'index.html') {
          await page.locator('[data-mobile-menu-toggle]').click();
          await inspect(page, name + ' navigation', failures);
          await page.locator('[data-mobile-menu-toggle]').click();
          await page.locator('[data-cart-toggle]:visible').click();
          await inspect(page, name + ' cart', failures);
          await page.locator('[data-cart-close]').click();
          await page.locator('[data-theme-overlay-toggle]').click();
          await inspect(page, name + ' collapsed theme', failures);
          await page.locator('[data-theme-overlay-toggle]').click();
          await page.locator('[data-pack-toggle]').first().click();
          await inspect(page, name + ' pack overlay', failures);
          await page.keyboard.press('Escape');
        }
        if (entry.file === 'product.html' && await page.locator('[data-subscription-open]').count()) {
          await page.locator('[data-subscription-open]').click();
          await inspect(page, name + ' subscription popup', failures);
          await page.keyboard.press('Escape');
        }
        if (entry.file === 'portion.html') {
          await page.locator('[data-mobile-filter-toggle]').click();
          await inspect(page, name + ' filters', failures);
          await page.locator('[data-mobile-filter-close]').click();
        }
        if (entry.file === 'faq.html') {
          await page.locator('.faq-item summary').first().click();
          await inspect(page, name + ' expanded answer', failures);
        }
      }
      await context.close();
    }
    if (failures.length) console.error(JSON.stringify(failures, null, 2));
    assert.equal(failures.length, 0, 'Mobile content must fit without clipping; see cases above.');
    console.log(`PASS: ${cases.length} page/product cases at ${widths.join(', ')}px, including open mobile panels.`);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
