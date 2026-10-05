# Product data

The Excel workbook remains the editing source for Swedsnus product data. Export it before deployment with:

```bash
python tools/excel-to-products-json.py swedsnus_product_data.xlsx --out data/products.json --pretty
```

The exporter keeps every column from the product sheets `Portionssnus`, `Lössnus`, `Aromer` and `Tillbehör`, including fields that are not currently rendered by the website. Empty Excel cells are retained as `null` so the JSON snapshot preserves the complete product-field structure.

The exporter also keeps the website helper fields used by the static frontend, preserves existing placeholder products for `Vitt snus`, and writes the product snapshot through the part files referenced by `data/products.json`.

The website must never contain page-specific hardcoded product lists. Catalogs, cards, filters, product pages, saved products and cart records all resolve against the central product store.

When the Excel workbook changes, regenerate the product snapshot from the workbook rather than editing individual JSON rows by hand.

`subscription_available` is the sole subscription flag. Only `yes` (case-insensitive) enables subscriptions; `no`, empty cells and missing values disable them. White-snus placeholders without this field remain available for one-time purchases only.
