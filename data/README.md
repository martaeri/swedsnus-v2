# Product data

The Excel workbook remains the editing source for Swedsnus product data. Export it before deployment with:

```bash
python tools/excel-to-products-json.py swedsnus_product_data.xlsx --out data/products.json --pretty
```

V2 uses the same field model as the original Swedsnus prototype: `product_id`, `variant_id`, `product_family`, `site_section`, `tobacco_type`, `product_line`, taste fields, format, strength, amount, price and visibility.

During the first V2 design branch, `data/products.json` uses the local first product-data part and the remaining current product parts from `martaeri/swedsnus` so the complete existing assortment is available immediately without duplicating the visual codebase. Before V2 becomes an independent production candidate, export the workbook directly into this repository and replace the bootstrap manifest with the generated local snapshot.

The website must never contain page-specific hardcoded product lists. Catalogs, cards, filters, product pages, saved products and cart records all resolve against the central product store.
