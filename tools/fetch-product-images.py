#!/usr/bin/env python3
import argparse
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / "data" / "product-image-sources.json"
IMAGE_MAP = ROOT / "data" / "product-images.json"
ASSET_DIR = ROOT / "assets" / "products"


def main():
    parser = argparse.ArgumentParser(description="Import verified product images from the supplied Swedsnus-bilder folder.")
    parser.add_argument("source", type=Path, help="Path to the real Swedsnus-bilder folder (never __MACOSX).")
    args = parser.parse_args()

    source_root = args.source.resolve()
    if source_root.name == "__MACOSX" or "__MACOSX" in source_root.parts:
        raise SystemExit("__MACOSX is archive metadata and must never be used as an image source.")

    provenance = json.loads(SOURCES.read_text(encoding="utf-8"))
    image_map = json.loads(IMAGE_MAP.read_text(encoding="utf-8"))
    allowed = {
        filename: source_root / folder / filename
        for folder, filenames in provenance["folders"].items()
        for filename in filenames
    }

    missing = sorted(filename for filename, path in allowed.items() if not path.is_file())
    if missing:
        raise SystemExit("Missing source files:\n" + "\n".join(missing))

    mapped_files = {Path(asset).name for asset in image_map.values()}
    unknown = sorted(mapped_files - set(allowed))
    if unknown:
        raise SystemExit("Image map contains files outside the verified source list:\n" + "\n".join(unknown))

    if ASSET_DIR.exists():
        shutil.rmtree(ASSET_DIR)
    ASSET_DIR.mkdir(parents=True, exist_ok=True)

    for filename in sorted(mapped_files):
        shutil.copy2(allowed[filename], ASSET_DIR / filename)

    print(f"Replaced assets/products with {len(mapped_files)} files from {source_root}.")
    print("Products without a verified source image remain on the shared placeholder.")


if __name__ == "__main__":
    main()
