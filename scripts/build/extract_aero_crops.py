#!/usr/bin/env python3
"""Découpe les schémas 020 (Aérogligli) pour QCM image — assets/docs/020/crops/"""
import json
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Installez Pillow : pip install pillow", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[2]
PAGES = ROOT / "assets" / "docs" / "020"
OUT = PAGES / "crops"
MANIFEST = OUT / "manifest.json"

# box = (x0, y0, x1, y1) en fractions de la page
CROPS = [
    {"id": "geo-aile-plan", "page": "page-003.jpg", "box": (0.03, 0.18, 0.97, 0.57)},
    {"id": "geo-dimensions", "page": "page-003.jpg", "box": (0.03, 0.55, 0.97, 0.91)},
    {"id": "geo-diedre-calage", "page": "page-004.jpg", "box": (0.03, 0.06, 0.97, 0.47)},
    {"id": "geo-trains-angles", "page": "page-004.jpg", "box": (0.03, 0.45, 0.97, 0.93)},
    {"id": "moteur-4cyl", "page": "page-006.jpg", "box": (0.03, 0.17, 0.97, 0.48)},
    {"id": "moteur-cylindre", "page": "page-006.jpg", "box": (0.03, 0.50, 0.97, 0.93)},
    {"id": "anemo-schema", "page": "page-011.jpg", "box": (0.05, 0.16, 0.95, 0.63)},
    {"id": "alti-schema", "page": "page-016.jpg", "box": (0.05, 0.13, 0.95, 0.59)},
    {"id": "vario-schema", "page": "page-019.jpg", "box": (0.05, 0.13, 0.95, 0.56)},
    {"id": "horizon-schema", "page": "page-021.jpg", "box": (0.05, 0.12, 0.95, 0.56)},
    {"id": "directionnel-schema", "page": "page-024.jpg", "box": (0.05, 0.10, 0.95, 0.54)},
    {"id": "coordinateur-schema", "page": "page-027.jpg", "box": (0.05, 0.10, 0.95, 0.54)},
]


def crop_one(entry):
    src = PAGES / entry["page"]
    if not src.exists():
        print("  Manquant:", src.name)
        return None
    img = Image.open(src).convert("RGB")
    w, h = img.size
    x0, y0, x1, y1 = entry["box"]
    box = (int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h))
    cropped = img.crop(box)
    out_name = entry["id"] + ".jpg"
    out_path = OUT / out_name
    cropped.save(out_path, "JPEG", quality=88, optimize=True)
    rel = f"assets/docs/020/crops/{out_name}"
    return {
        "id": entry["id"],
        "file": rel,
        "page": entry["page"],
        "w": cropped.width,
        "h": cropped.height,
        "bytes": out_path.stat().st_size,
    }


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {"version": 1, "crops": []}
    print("Decoupe schémas 020 -> assets/docs/020/crops/")
    for entry in CROPS:
        meta = crop_one(entry)
        if meta:
            manifest["crops"].append(meta)
            print(f"  {entry['id']}: {meta['w']}x{meta['h']}")
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Manifeste: {MANIFEST} ({len(manifest['crops'])} crops)")


if __name__ == "__main__":
    main()
