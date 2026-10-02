from __future__ import annotations

import argparse
import json
import re
from datetime import date, datetime
from pathlib import Path
from typing import Any

from openpyxl import load_workbook

PRODUCT_SHEETS = ["Portionssnus", "Lössnus", "Aromer", "Tillbehör"]
EMPTY_VALUES = {None, ""}


def clean_value(value: Any) -> Any:
    if value in EMPTY_VALUES:
        return None
    if isinstance(value, str):
        value = value.strip()
        return value or None
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def find_header_row(sheet) -> int:
    for row_number in range(1, min(sheet.max_row, 5) + 1):
        values = {str(clean_value(cell.value)) for cell in sheet[row_number] if clean_value(cell.value)}
        if "product_id" in values and "SKU" in values:
            return row_number
    raise ValueError(f"Could not find product header row in sheet {sheet.title}")


def web_fields(record: dict[str, Any], sheet_name: str) -> None:
    if record.get("SKU") is not None:
        record["SKU"] = str(record["SKU"])
    if record.get("GTIN") is not None:
        record["GTIN"] = str(record["GTIN"])

    raw_site_section = record.get("site_section")
    if raw_site_section == "Gör eget":
        record["site_section_excel"] = raw_site_section
        record["site_section"] = "Gör Eget"

    if sheet_name == "Aromer" and record.get("generated_name"):
        raw_name = str(record["generated_name"])
        cleaned_name = re.sub(r"\s+\d+\s+dosor\s*$", "", raw_name, flags=re.IGNORECASE)
        if cleaned_name != raw_name:
            record["generated_name_excel"] = raw_name
            record["generated_name"] = cleaned_name

    record["article_number"] = record.get("SKU")
    record["gtin"] = record.get("GTIN")
    record["tobacco_type"] = "Tobak" if record.get("product_family") in {"Portionssnus", "Lössnus"} else "Ej tillämpligt"
    record["price_sek"] = record.get("price_retail") if record.get("price_retail") is not None else 333
    record["visible_on_site"] = record.get("visible_on_site") or "Yes"
    record["short_description"] = record.get("description_short") or "Lorem ipsum dolor sit amet."

    if record.get("product_family") == "Tillbehör":
        record["package_quantity"] = 1
        product_line = str(record.get("product_line") or "").casefold()
        if "portionssnus" in product_line:
            record["compatible_with"] = "Portionssnus"
        elif "lössnus" in product_line or "lossnus" in product_line:
            record["compatible_with"] = "Lössnus"


def sheet_rows(workbook_path: Path) -> list[dict[str, Any]]:
    workbook = load_workbook(workbook_path, data_only=True)
    products: list[dict[str, Any]] = []
    try:
        for sheet_name in PRODUCT_SHEETS:
            if sheet_name not in workbook.sheetnames:
                continue

            sheet = workbook[sheet_name]
            header_row = find_header_row(sheet)
            headers = [clean_value(cell.value) for cell in sheet[header_row]]

            for row in sheet.iter_rows(min_row=header_row + 1, values_only=True):
                record = {
                    str(header): clean_value(value)
                    for header, value in zip(headers, row)
                    if header
                }

                if not record.get("product_id"):
                    continue
                if record.get("product_family") != sheet_name:
                    continue

                web_fields(record, sheet_name)
                products.append(record)
    finally:
        workbook.close()

    return products


def load_existing_placeholders(manifest_path: Path) -> list[dict[str, Any]]:
    if not manifest_path.exists():
        return []

    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []

    if not isinstance(manifest, dict) or not isinstance(manifest.get("parts"), list):
        return []

    placeholders: list[dict[str, Any]] = []
    for relative_path in manifest["parts"]:
        part_path = manifest_path.parent.parent / relative_path if str(relative_path).startswith("data/") else manifest_path.parent / relative_path
        if not part_path.exists():
            continue
        try:
            rows = json.loads(part_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        placeholders.extend(row for row in rows if row.get("product_family") == "Vitt snus")

    return placeholders


def existing_part_sizes(manifest_path: Path) -> tuple[list[str], list[int]]:
    if not manifest_path.exists():
        return [], []

    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return [], []

    part_names = manifest.get("parts") if isinstance(manifest, dict) else None
    if not isinstance(part_names, list):
        return [], []

    sizes: list[int] = []
    for relative_path in part_names:
        part_path = manifest_path.parent.parent / relative_path if str(relative_path).startswith("data/") else manifest_path.parent / relative_path
        try:
            rows = json.loads(part_path.read_text(encoding="utf-8"))
            sizes.append(len(rows) if isinstance(rows, list) else 0)
        except (json.JSONDecodeError, OSError):
            sizes.append(0)

    return [str(name) for name in part_names], sizes


def write_snapshot(products: list[dict[str, Any]], manifest_path: Path, pretty: bool) -> None:
    placeholders = load_existing_placeholders(manifest_path)
    existing_keys = {(row.get("product_id"), row.get("variant_id")) for row in products}
    products.extend(
        row for row in placeholders
        if (row.get("product_id"), row.get("variant_id")) not in existing_keys
    )

    part_names, capacities = existing_part_sizes(manifest_path)
    if not part_names:
        part_names = ["data/products-part-1.json"]
        capacities = [len(products)]

    while sum(capacities) < len(products):
        next_number = len(part_names) + 1
        part_names.append(f"data/products-part-{next_number}.json")
        capacities.append(capacities[-1] if capacities else 18)

    indent = 2 if pretty else None
    separators = None if pretty else (",", ":")

    offset = 0
    written_parts: list[str] = []
    for part_name, capacity in zip(part_names, capacities):
        if offset >= len(products):
            break
        rows = products[offset:offset + capacity]
        offset += len(rows)

        part_path = manifest_path.parent.parent / part_name if part_name.startswith("data/") else manifest_path.parent / part_name
        part_path.parent.mkdir(parents=True, exist_ok=True)
        part_path.write_text(
            json.dumps(rows, ensure_ascii=False, indent=indent, separators=separators),
            encoding="utf-8",
        )
        written_parts.append(part_name)

    manifest_path.write_text(
        json.dumps({"parts": written_parts}, ensure_ascii=False, indent=indent, separators=separators),
        encoding="utf-8",
    )
    print(f"Exported {len(products)} rows across {len(written_parts)} parts")


def main() -> None:
    parser = argparse.ArgumentParser(description="Export all Swedsnus Excel product fields to the static site JSON snapshot.")
    parser.add_argument("workbook", type=Path)
    parser.add_argument("--out", type=Path, default=Path("data/products.json"))
    parser.add_argument("--pretty", action="store_true")
    args = parser.parse_args()

    products = sheet_rows(args.workbook)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    write_snapshot(products, args.out, args.pretty)


if __name__ == "__main__":
    main()
