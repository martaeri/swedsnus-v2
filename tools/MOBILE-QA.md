# Mobile overflow check

`mobile-fit.css` loads after the existing styles and applies only up to 760 px. It permits content to shrink and wrap, keeps closed drawers within the viewport, and removes clipping from content panels. Carousels and navigation strips retain their own horizontal scrolling.

Run the browser check locally with a supported Node.js installation:

```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
node tools/test-mobile-overflow.cjs
```

The check serves the repository locally and tests all HTML templates plus different product-family layouts at 280, 320, 360, 390, 430, 440, 540 and 760 px. The 440 px case covers the iPhone 16 Pro Max CSS viewport width. It seeds demo cart, saved products and account data in isolated browser contexts. It also opens navigation, cart, filters, a product-card overlay and the subscription popup. Each portionssnus format pill is selected and checked for text fitting and stable dimensions. It reports page overflow, component overflow and vertically clipped content, allowing the intended carousels and navigation strips to scroll.

For a quicker pass, choose widths explicitly:

```sh
WIDTHS=320,390 node tools/test-mobile-overflow.cjs
```
