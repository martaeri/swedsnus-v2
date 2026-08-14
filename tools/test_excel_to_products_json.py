from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from openpyxl import Workbook


SCRIPT_PATH = Path(__file__).with_name("excel-to-products-json.py")
SPEC = importlib.util.spec_from_file_location("excel_to_products_json", SCRIPT_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"Could not load {SCRIPT_PATH}")
EXPORTER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(EXPORTER)


class ExcelToProductsJsonTests(unittest.TestCase):
    def create_workbook(self, path: Path) -> None:
        workbook = Workbook()
        sheet = workbook.active
        sheet.title = "Portionssnus"
        sheet.append(["product_id", "generated_name", "visible_on_site", "price_sek"])
        sheet.append([" original ", " Original Portion ", "Yes", 229])
        sheet.append(["hidden", "Hidden product", " NO ", 199])
        sheet.append([None, "Missing id", "Yes", 99])
        aroma_sheet = workbook.create_sheet("Aromer")
        aroma_sheet.append(["product_id", "generated_name"])
        aroma_sheet.append(["bergamott", "Bergamott Arom"])
        workbook.save(path)
        workbook.close()

    def test_sheet_rows_cleans_filters_and_tracks_source_sheet(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            workbook_path = Path(temp_dir) / "products.xlsx"
            self.create_workbook(workbook_path)

            products = EXPORTER.sheet_rows(workbook_path)

        self.assertEqual([product["product_id"] for product in products], ["original", "bergamott"])
        self.assertEqual(products[0]["generated_name"], "Original Portion")
        self.assertEqual(products[0]["price_sek"], 229)
        self.assertEqual(products[0]["_sheet"], "Portionssnus")
        self.assertEqual(products[1]["_sheet"], "Aromer")

    def test_cli_writes_compact_json_and_creates_output_directory(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            workbook_path = root / "products.xlsx"
            output_path = root / "nested" / "products.json"
            self.create_workbook(workbook_path)

            result = subprocess.run(
                [sys.executable, str(SCRIPT_PATH), str(workbook_path), "--out", str(output_path)],
                check=True,
                capture_output=True,
                text=True,
            )

            products = json.loads(output_path.read_text(encoding="utf-8"))

        self.assertEqual(len(products), 2)
        self.assertEqual(result.stdout.strip(), "Exported 2 rows to " + str(output_path))


if __name__ == "__main__":
    unittest.main()
