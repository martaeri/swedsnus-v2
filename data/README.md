# Product data

The Excel workbook remains the editing source for Swedsnus product data. Export it before deployment with:

```bash
python tools/excel-to-products-json.py swedsnus_product_data.xlsx --out data/products.json --pretty
```

V2 uses the same field model as the original Swedsnus prototype: `product_id`, `variant_id`, `product_family`, `site_section`, `tobacco_type`, `product_line`, taste fields, format, strength, amount, price and visibility.

The initial V2 repository contains a local snapshot of all eight current product-data parts from `martaeri/swedsnus`. `data/products.json` points only to local files, so V2 does not depend on the original repository at runtime.

When the Excel workbook changes, regenerate the V2 product snapshot from the workbook rather than editing individual JSON rows by hand.

The website must never contain page-specific hardcoded product lists. Catalogs, cards, filters, product pages, saved products and cart records all resolve against the central product store.
