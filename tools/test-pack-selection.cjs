const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const repo = path.resolve(__dirname, '..');
const storage = new Map();
const events = new Map();
const roots = new Map();
const element = () => {
  const classes = new Set();
  return {
    dataset: {}, innerHTML: '', textContent: '', hidden: false,
    classList: {
      add: value => classes.add(value), remove: value => classes.delete(value),
      toggle(value, selected) { selected ? classes.add(value) : classes.delete(value); },
      contains: value => classes.has(value),
    },
    focus() {}, setAttribute() {},
    querySelector: () => null, querySelectorAll: () => [],
  };
};
const attrs = html => Object.fromEntries([...html.matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));
const dataAttrs = values => Object.fromEntries(Object.entries(values).filter(([name]) => name.startsWith('data-')).map(([name, value]) => [name.slice(5).replace(/-([a-z])/g, (_, char) => char.toUpperCase()), value]));
const doc = {
  body: { dataset: { page: 'product' }, classList: element().classList },
  readyState: 'complete',
  addEventListener(name, callback) { if (!events.has(name)) events.set(name, []); events.get(name).push(callback); },
  dispatchEvent(event) { for (const callback of events.get(event.type) || []) callback(event); },
  querySelector: selector => roots.get(selector) || null,
  querySelectorAll: () => [],
};
const ctx = vm.createContext({
  window: {}, document: doc, console, URLSearchParams, location: { search: '' },
  CustomEvent: class { constructor(type) { this.type = type; } },
  localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
  fetch: async url => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(repo, url), 'utf8')) }),
});
const run = file => vm.runInContext(fs.readFileSync(path.join(repo, file), 'utf8'), ctx, { filename: file });
const fire = (type, target) => doc.dispatchEvent({ type, target, preventDefault() {} });
const scope = element();
let picker;
scope.querySelector = selector => selector === '[data-pack-picker]' ? picker : null;
// Real handlers use closest() on the event target and on the matched button.
function clickButton(attribute, id) {
  const result = { dataset: { [attribute]: id } };
  result.closest = selector => selector === '.product-card,.product-summary' ? scope : selector === `[data-${attribute.replace(/[A-Z]/g, char => '-' + char.toLowerCase())}]` ? result : null;
  return result;
}

async function main() {
  run('product-store.js');
  await new Promise(setImmediate);
  const api = ctx.window.SwedsnusV2;
  assert(api.state.ready);
  const row = api.state.rows.find(item => item.tobacco_type === 'Tobak' && api.subscriptionEligible(item));
  const id = api.key(row);
  ctx.location.search = '?id=' + encodeURIComponent(id);
  roots.set('[data-product-detail]', element());
  roots.set('[data-product-content]', element());
  const drawer = element(), cartBody = element();
  drawer.querySelector = selector => selector === '[data-cart-items]' ? cartBody : element();
  roots.set('[data-cart-drawer]', drawer);
  const modal = element(), modalName = element(), modalPrice = element();
  modal.hidden = true;
  const select = element();
  let selectHtml = '';
  Object.defineProperty(select, 'innerHTML', {
    get: () => selectHtml,
    set(html) {
      selectHtml = html;
      const options = [...html.matchAll(/<option([^>]*)>/g)].map(match => ({ value: attrs(match[1]).value, dataset: dataAttrs(attrs(match[1])), selected: match[1].includes(' selected') }));
      select.selectedOptions = [options.find(option => option.selected) || options[0]];
    },
  });
  modal.querySelector = selector => selector === '[data-subscription-pack]' || selector === 'select' ? select : selector === '[data-subscription-modal-price]' ? modalPrice : modalName;
  roots.set('[data-subscription-modal]', modal);
  run('subscriptions.js');
  run('catalog.js');
  const detailHtml = roots.get('[data-product-detail]').innerHTML;
  assert(detailHtml.includes('<fieldset class="product-pack-picker"><legend>Flerpack</legend>'));
  assert(!detailHtml.includes('data-pack-toggle'));
  const list = api.packList(row);
  const radios = [...list.matchAll(/<input([^>]*)>/g)].map(match => {
    const input = element(), label = element();
    input.dataset = dataAttrs(attrs(match[1]));
    input.checked = match[1].includes(' checked');
    input.closest = selector => selector === '[data-pack-radio]' ? input : selector === '[data-pack-picker]' ? picker : selector === '.pack-list-option' ? label : null;
    input.label = label;
    return input;
  });
  assert.equal(radios.length, 3);
  assert.equal(radios.filter(input => input.checked).length, 1);
  picker = element();
  picker.dataset = { ...radios[0].dataset, productId: id };
  picker.querySelectorAll = selector => selector === '[data-pack-radio]' ? radios : [];
  run('cart.js');
  fire('change', radios[2]);
  assert.equal(picker.dataset.packQty, '3');
  assert.equal(radios.filter(input => input.checked).length, 1);
  assert(radios[2].label.classList.contains('selected'));
  fire('click', clickButton('addCart', id));
  const pack3 = api.packs(row)[2];
  let items = ctx.window.SwedsnusCart.read();
  assert.equal(items[0].packQty, 3);
  assert.equal(items[0].totalPrice, pack3.total);
  assert.equal(items[0].unitPrice, pack3.unitPrice);
  assert(cartBody.innerHTML.includes(api.unitPriceLabel(pack3.unitPrice)));
  assert(!cartBody.innerHTML.includes('kr/dosa'));
  fire('change', radios[1]);
  fire('click', clickButton('subscriptionOpen', id));
  assert.equal(select.selectedOptions[0].value, '2');
  assert.equal(modalPrice.textContent, api.money(api.packs(row)[1].total));
  assert(!modal.hidden);
  const form = {
    elements: { packQty: select, intervalWeeks: { value: '2' } },
    matches: selector => selector === '[data-subscription-modal-form]',
    closest: () => modal,
  };
  fire('submit', form);
  items = ctx.window.SwedsnusCart.read();
  const recurring = items.find(item => item.purchaseMode === 'subscription');
  assert.equal(recurring.packQty, 2);
  assert.equal(recurring.intervalWeeks, 2);
  assert.equal(recurring.totalPrice, api.packs(row)[1].total);
  assert(modal.hidden);
  modal.hidden = true;
  const ineligible = api.state.rows.find(item => !api.subscriptionEligible(item));
  fire('click', clickButton('subscriptionOpen', api.key(ineligible)));
  assert(modal.hidden);
  const legacy = { cartKey: 'legacy', id, name: 'Legacy product', packQty: 2, totalPrice: 646, perDose: 16.15, qty: 2 };
  ctx.window.SwedsnusCart.write([legacy]);
  assert(cartBody.innerHTML.includes('323 kr/st'));
  const checkout = element();
  for (const selector of ['[data-checkout-count]', '[data-checkout-subtotal]', '[data-checkout-total]', '[data-checkout-recurring]']) roots.set(selector, element());
  roots.set('[data-checkout-items]', checkout);
  run('checkout.js');
  assert(checkout.innerHTML.includes('323 kr/st'));
  assert(!checkout.innerHTML.includes('kr/dosa'));
  for (const product of api.state.rows) {
    for (const subscription of [false, true]) {
      const card = api.card(product, { subscription });
      assert.equal(card.includes('Från 15,65 kr dosan'), product.tobacco_type === 'Tobak');
      assert(!card.includes('kr/dosa'));
      if (!subscription && product.tobacco_type === 'Tobak') assert(card.indexOf('product-dose-price-hint') < card.indexOf('class="pack-control"'));
    }
  }
  ctx.window.SwedsnusV2 = undefined;
  run('cart.js');
  assert(cartBody.innerHTML.includes('323 kr/st'));
  console.log('PASS: exclusive radio selection, cart totals, subscription handoff, blocked subscriptions, legacy cart/checkout unit prices and tobacco-only hints.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
