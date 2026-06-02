#!/usr/bin/env python3
"""Rendu des pages PDF compilations Aérogligli → assets/docs/{id}/page-NNN.jpg"""
import json
import sys
from pathlib import Path

try:
    import fitz
except ImportError:
    print("Installez pymupdf : pip install pymupdf", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / "docs"
OUT = ROOT / "assets" / "docs"
MANIFEST = OUT / "manifest.json"

MAX_WIDTH = 1100
JPEG_QUALITY = 82

SOURCES = [
    {
        "id": "010",
        "mod": "R",
        "pdf": "010_compilation_droit-aerien_reglementation.pdf",
        "title": "010 — Réglementation aérienne",
    },
    {
        "id": "020",
        "mod": "A",
        "pdf": "020_compilation-connaissance_generale_aeronef.pdf",
        "title": "020 — Connaissance générale aéronef",
    },
    {
        "id": "050",
        "mod": "M",
        "pdf": "050_compilation_meteorologie.pdf",
        "title": "050 — Météorologie",
    },
    {
        "id": "091",
        "mod": "C",
        "pdf": "fiche_resume_communications.pdf",
        "title": "091 — Communications",
    },
]


def render_pdf(src):
    pdf_path = DOCS / src["pdf"]
    if not pdf_path.exists():
        print("  Manquant:", pdf_path.name)
        return None

    out_dir = OUT / src["id"]
    out_dir.mkdir(parents=True, exist_ok=True)

    doc = fitz.open(pdf_path)
    pages = []
    total_bytes = 0

    for i, page in enumerate(doc):
        name = f"page-{i + 1:03d}.jpg"
        rel = f"assets/docs/{src['id']}/{name}"
        out_path = out_dir / name

        rect = page.rect
        scale = min(1.0, MAX_WIDTH / rect.width) if rect.width > MAX_WIDTH else 1.0
        matrix = fitz.Matrix(scale * 2, scale * 2)
        pix = page.get_pixmap(matrix=matrix, alpha=False)
        pix.save(str(out_path), jpg_quality=JPEG_QUALITY)

        size = out_path.stat().st_size
        total_bytes += size
        pages.append({
            "n": i + 1,
            "file": rel,
            "w": pix.width,
            "h": pix.height,
            "bytes": size,
        })

    doc.close()
    print(f"  {src['id']}: {len(pages)} pages, {total_bytes // 1024} Ko")
    return {
        "id": src["id"],
        "mod": src["mod"],
        "title": src["title"],
        "pdf": src["pdf"],
        "pageCount": len(pages),
        "pages": pages,
    }


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {
        "version": 1,
        "maxWidth": MAX_WIDTH,
        "jpegQuality": JPEG_QUALITY,
        "sources": [],
    }

    print("Extraction pages PDF -> assets/docs/")
    for src in SOURCES:
        entry = render_pdf(src)
        if entry:
            manifest["sources"].append(entry)

    manifest["totalPages"] = sum(s["pageCount"] for s in manifest["sources"])
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Manifeste : {MANIFEST} ({manifest['totalPages']} pages)")


if __name__ == "__main__":
    main()
