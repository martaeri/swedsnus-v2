#!/usr/bin/env python3
import html
import json
import mimetypes
import re
import time
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / "data" / "product-image-sources.json"
OUTPUT_MAP = ROOT / "data" / "product-images.json"
REPORT = ROOT / "data" / "product-image-import-report.json"
ASSET_DIR = ROOT / "assets" / "products"
USER_AGENT = "Mozilla/5.0 (compatible; SwedsnusTemplateImageImporter/1.0)"


class AssetParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []

    def handle_starttag(self, tag, attrs):
        for name, value in attrs:
            if not value:
                continue
            if name in {"src", "data-src", "data-zoom-image", "href"}:
                self.urls.append(value)
            elif name == "srcset":
                self.urls.extend(part.strip().split(" ")[0] for part in value.split(",") if part.strip())


def request(url):
    return Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html,image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"})


def fetch_bytes(url):
    with urlopen(request(url), timeout=25) as response:
        return response.read(), response.headers.get_content_type()


def candidate_score(url, filename):
    path = html.unescape(urlparse(url).path).lower()
    basename = Path(path).name
    stem = Path(filename).stem.lower()
    article = stem.split("-", 1)[0]
    score = 0
    if stem in basename:
        score += 100
    if basename.startswith(article + "-"):
        score += 50
    words = [word for word in re.split(r"[-_ ]+", stem) if len(word) > 2 and not word.isdigit()]
    score += sum(4 for word in words if word in basename)
    if "1000x1000" in basename:
        score += 12
    elif "560x560" in basename:
        score += 8
    if "transparent" in basename or "placeholder" in basename:
        score -= 100
    return score


def resolve_image(page_url, filename):
    page_bytes, _ = fetch_bytes(page_url)
    text = page_bytes.decode("utf-8", errors="ignore")
    parser = AssetParser()
    parser.feed(text)
    candidates = []
    for raw in parser.urls:
        absolute = urljoin(page_url, html.unescape(raw))
        score = candidate_score(absolute, filename)
        if score > 0:
            candidates.append((score, absolute))
    for _, candidate in sorted(set(candidates), reverse=True):
        try:
            data, content_type = fetch_bytes(candidate)
            if content_type.startswith("image/") and len(data) > 1500:
                return candidate, data, content_type
        except Exception:
            continue
    return None, None, None


def main():
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    sources = json.loads(SOURCES.read_text(encoding="utf-8"))
    image_map = {}
    report = {"matched": {}, "failed": {}}

    for index, (product_key, source) in enumerate(sources.items(), start=1):
        filename = source["filename"]
        target = ASSET_DIR / filename
        try:
            image_url, data, content_type = resolve_image(source["page"], filename)
            if not data:
                raise RuntimeError("Ingen säker bildträff hittades på produktsidan")
            target.write_bytes(data)
            relative = target.relative_to(ROOT).as_posix()
            image_map[product_key] = relative
            report["matched"][product_key] = {
                "asset": relative,
                "source_page": source["page"],
                "source_image": image_url,
                "content_type": content_type,
            }
            print(f"[{index}/{len(sources)}] matched {product_key} -> {relative}")
        except Exception as error:
            report["failed"][product_key] = {
                "source_page": source["page"],
                "expected_filename": filename,
                "error": str(error),
            }
            print(f"[{index}/{len(sources)}] placeholder {product_key}: {error}")
        time.sleep(0.08)

    OUTPUT_MAP.write_text(json.dumps(image_map, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Matched {len(image_map)} of {len(sources)} verified source rows.")


if __name__ == "__main__":
    main()
