# Swedsnus V2

Alternative frontend prototype for Swedsnus.

V2 keeps the centralized, data-driven architecture of the original `martaeri/swedsnus` project while rebuilding the presentation layer from scratch. The goal is a more restrained, specialist retail interface with fewer colors, fewer decorative effects and clearer emphasis on product data.

## Core principles

- Excel remains the product editing source.
- `tools/excel-to-products-json.py` exports deployable JSON.
- `product-store.js` is the single product-data owner in the browser.
- product cards, catalog pages and product detail pages are generated from the same records.
- shared header/footer live in `layout.js`.
- cart and saved products use centralized local-storage state.
- V2 has one fixed visual identity rather than a theme switcher.
- no page-specific product lists or one-off CSS patch files.

## Local preview

Serve the repository through a local HTTP server rather than opening the HTML files directly, because product data is fetched as JSON.

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Product export

```bash
python tools/excel-to-products-json.py swedsnus_product_data.xlsx --out data/products.json --pretty
```

See `data/README.md` and `docs/frontend-architecture.md` for ownership rules and the temporary V2 bootstrap data setup.

## GitHub Pages

The site is static and can be hosted independently through GitHub Pages from this repository, allowing the original Swedsnus prototype and V2 to remain available in parallel.
