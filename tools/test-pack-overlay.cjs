const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const repo = path.resolve(__dirname, '..');

// A small DOM fixture exercises the real delegated handlers, including a menu
// detached from its card. Geometry is explicit; this is not a browser render test.
class Element {
  constructor(tag = 'div', attributes = {}) {
    this.tagName = tag;
    this.attributes = { ...attributes };
    this.dataset = {};
    for (const [key, value] of Object.entries(attributes)) {
      if (key.startsWith('data-')) this.dataset[key.slice(5).replace(/-([a-z])/g, (_, char) => char.toUpperCase())] = value;
    }
    this.classes = new Set((attributes.class || '').split(' '));
    this.classList = {
      add: value => this.classes.add(value), remove: value => this.classes.delete(value),
      contains: value => this.classes.has(value),
      toggle: (value, checked) => checked ? this.classes.add(value) : this.classes.delete(value),
    };
    this.hidden = 'hidden' in attributes;
    this.children = [];
    this.style = {};
    this.textContent = '';
    this.id = attributes.id || '';
  }
  append(child) {
    if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1);
    this.children.push(child); child.parent = this;
  }
  contains(child) { return child === this || this.children.some(next => next.contains(child)); }
  get isConnected() { return this === body || Boolean(this.parent?.isConnected); }
  setAttribute(key, value) { this.attributes[key] = value; }
  getAttribute(key) { return this.attributes[key]; }
  removeAttribute(key) { delete this.attributes[key]; if (key === 'style') this.style = {}; }
  matches(selector) {
    if (selector === ':popover-open') return Boolean(this.popoverOpen);
    if (selector.startsWith('.')) return this.classes.has(selector.slice(1));
    const [, key, value] = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/) || [];
    return key && key in this.attributes && (value === undefined || this.attributes[key] === value);
  }
  closest(selector) { return selector.split(',').some(part => this.matches(part)) ? this : this.parent?.closest(selector) || null; }
  querySelectorAll(selector) { return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  focus() { document.activeElement = this; dispatch('focusin', this); }
  getClientRects() { return this.isConnected && !this.hidden ? [this.getBoundingClientRect()] : []; }
  getBoundingClientRect() {
    let { top = 0, left = 0, width = 220, height = 44 } = this.rect || {};
    if (this.matches('[data-pack-menu]')) {
      top = parseFloat(this.style.top) || 0; left = parseFloat(this.style.left) || 0;
      width = parseFloat(this.style.width) || 220;
      height = Math.min(2 + this.children.length * 52, parseFloat(this.style.maxHeight) || Infinity);
    }
    if (this.matches('[data-pack-option]')) {
      const parent = this.parent.getBoundingClientRect();
      top = parent.top + 1 + this.parent.children.indexOf(this) * 52;
      left = parent.left + 1; width = parent.width - 2; height = 52;
    }
    return { top, left, width, height, bottom: top + height, right: left + width };
  }
}
const body = new Element('body');
const handlers = new Map(), windowHandlers = new Map(), storage = new Map();
const listen = (map, type, handler) => { if (!map.has(type)) map.set(type, []); map.get(type).push(handler); };
const document = {
  body, readyState: 'complete',
  querySelector: selector => body.querySelector(selector),
  querySelectorAll: selector => body.querySelectorAll(selector),
  addEventListener: (type, handler) => listen(handlers, type, handler),
  dispatchEvent: event => (handlers.get(event.type) || []).forEach(handler => handler(event)),
};
function dispatch(type, target, properties = {}) {
  const event = { type, target, preventDefault() { this.defaultPrevented = true; }, ...properties };
  document.dispatchEvent(event); return event;
}
const window = { innerWidth: 1000, innerHeight: 700, addEventListener: (type, handler) => listen(windowHandlers, type, handler) };
const context = vm.createContext({
  window, document, console,
  localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
  CustomEvent: class { constructor(type) { this.type = type; } },
  fetch: async url => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(repo, url), 'utf8')) }),
});
const run = file => vm.runInContext(fs.readFileSync(path.join(repo, file), 'utf8'), context, { filename: file });
function parse(html) {
  const root = new Element(), stack = [root];
  for (const token of html.matchAll(/<\/?([\w-]+)([^>]*)>|([^<]+)/g)) {
    if (token[3]) { stack.at(-1).textContent += token[3]; continue; }
    if (token[0].startsWith('</')) { stack.pop(); continue; }
    const attributes = Object.fromEntries([...token[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(match => [match[1], match[2] || '']));
    const child = new Element(token[1], attributes);
    stack.at(-1).append(child);
    stack.push(child);
  }
  return root.children[0];
}
async function main() {
  run('product-store.js');
  await new Promise(setImmediate);
  const api = window.SwedsnusV2;
  const row = api.state.rows.find(product => product.tobacco_type === 'Tobak');
  function card(left, nativePopover) {
    const card = new Element('article', { class: 'product-card' });
    const picker = parse(api.packMenu(row));
    const trigger = picker.querySelector('[data-pack-toggle]');
    const menu = picker.querySelector('[data-pack-menu]');
    trigger.rect = { left, top: 300, width: 170, height: 44 };
    if (nativePopover) {
      menu.showPopover = () => { menu.popoverOpen = true; };
      menu.hidePopover = () => { menu.popoverOpen = false; };
    }
    card.append(picker); body.append(card);
    return { card, picker, trigger, menu, options: menu.querySelectorAll('[data-pack-option]') };
  }
  const first = card(50, true), second = card(850, false);
  run('cart.js');
  dispatch('click', first.trigger);
  assert.equal(first.menu.parent, body, 'menu escapes its original clipped ancestors');
  assert(first.menu.popoverOpen, 'native popover uses the top layer');
  assert(first.picker.classList.contains('is-open'));
  assert.equal(first.trigger.getAttribute('aria-expanded'), 'true');
  assert.equal(document.activeElement, first.options[0]);
  assert.equal(first.menu.getBoundingClientRect().top + 1, first.trigger.rect.top);
  dispatch('keydown', first.options[0], { key: 'End' });
  assert.equal(document.activeElement, first.options[2]);
  dispatch('click', first.options[2]);
  assert.equal(first.picker.dataset.packQty, '3');
  assert.equal(first.picker.dataset.total, String(api.packs(row)[2].total));
  assert.equal(first.options.filter(option => option.getAttribute('aria-selected') === 'true').length, 1);
  assert.equal(first.options[2].getAttribute('aria-selected'), 'true');
  assert(first.menu.hidden && !first.menu.popoverOpen);
  assert.equal(first.menu.parent, first.picker);
  assert.equal(document.activeElement, first.trigger);
  const buy = new Element('button', { 'data-add-cart': api.key(row) });
  first.card.append(buy); dispatch('click', buy);
  assert.equal(window.SwedsnusCart.read()[0].packQty, 3, 'detached option updates the correct cart selection');
  dispatch('click', first.trigger);
  assert.equal(document.activeElement, first.options[2]);
  assert.equal(first.menu.getBoundingClientRect().top + 1 + 104, first.trigger.rect.top, 'selected row replaces the closed selector');
  dispatch('click', second.trigger);
  assert(first.menu.hidden);
  assert.equal(first.trigger.getAttribute('aria-expanded'), 'false');
  assert.equal(second.menu.parent, body, 'fallback also escapes clipping without Popover API');
  assert(second.menu.getBoundingClientRect().right <= window.innerWidth - 8);
  dispatch('keydown', second.options[0], { key: 'Escape' });
  assert(second.menu.hidden);
  assert.equal(document.activeElement, second.trigger);
  dispatch('keydown', first.trigger, { key: 'ArrowDown' });
  dispatch('keydown', first.options[2], { key: 'ArrowUp' });
  assert.equal(document.activeElement, first.options[1]);
  dispatch('keydown', first.options[1], { key: 'Home' });
  assert.equal(document.activeElement, first.options[0]);
  assert.equal(first.picker.dataset.packQty, '3', 'keyboard focus does not change selection until activated');
  dispatch('keydown', first.options[0], { key: 'Tab' });
  assert(first.menu.hidden);
  assert.equal(document.activeElement, first.trigger, 'Tab resumes the original document order');
  dispatch('click', first.trigger); dispatch('click', body);
  assert(first.menu.hidden && !first.picker.classList.contains('is-open'));
  dispatch('click', first.trigger); dispatch('scroll', first.menu);
  assert(!first.menu.hidden, 'scrolling the menu itself keeps it open');
  dispatch('scroll', first.card);
  assert(first.menu.hidden, 'rail/page scrolling closes the detached menu');
  dispatch('click', first.trigger); dispatch('focusin', buy);
  assert(first.menu.hidden, 'focus leaving the chooser dismisses it');
  window.innerWidth = 320; window.innerHeight = 260;
  second.trigger.rect = { left: 230, top: 200, width: 80, height: 44 };
  dispatch('click', second.trigger);
  let rect = second.menu.getBoundingClientRect();
  assert(rect.left >= 8 && rect.right <= 312 && rect.top >= 8 && rect.bottom <= 252, 'menu stays within a small mobile viewport');
  window.visualViewport = { offsetLeft: 100, offsetTop: 80, width: 200, height: 180 };
  (windowHandlers.get('resize') || []).forEach(handler => handler());
  rect = second.menu.getBoundingClientRect();
  assert(rect.left >= 108 && rect.right <= 292 && rect.top >= 88 && rect.bottom <= 252, 'zoomed visual viewport is respected');
  document.dispatchEvent(new context.CustomEvent('swedsnus-v2:filters-applied'));
  assert(second.menu.hidden);
  console.log('PASS: top-layer and fallback portals, selected state, cart handoff, keyboard, outside click/focus, scroll dismissal, single-open menu and viewport bounds.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
