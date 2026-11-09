#!/usr/bin/env python3
"""Replay current source frames with isolated rendering and source-bound caches (v5).

This pinned private-audit tool writes metadata, hashes and recipes only. It renders
full pages only to temporary/private memory and never emits page pixels to the repo.
No source meaning, review flags or rule completeness are inferred.
"""
from __future__ import annotations

import argparse
import collections
import hashlib
import io
import json
import math
import shutil
import subprocess
import tempfile
from pathlib import Path

import fitz
from PIL import Image

V3_TOOL_SHA256 = "2a06c62393fd3b1ab39db11a798b1d3dd4c0656c3d890b206239e44e551e13df"
V4_TOOL_SHA256 = "2dee3572eb989c63ef1a441949f41e54ddb8c8bf1a469372c68e37869316da0e"
V4_PRIVATE_REPORT_SHA256 = "aa2c4b3c152f775f2dfde1caf7a2c47971752513312bec78c9c76e114f70c2c9"
V4_INDEPENDENT_REVIEW_SHA256 = "4cabaf20c3d800814823a945abe0c03da9e799b1f229c1e67451008e3e97f539"
MUPDF_STORE_POLICY = "clear global MuPDF store before every actual get_pixmap call"

INPUT_COMMIT = "6d330af372ac809d11ed6029ed8695d0d8dc0909"
INPUT_DATA_SHA256 = "ceb7c8b9a8fe32b676e57c8d007f124a4490684d54558479e555d504075ba4f3"
V1_TOOL_SHA256 = "27ad7dfd1b12de1fb5ad2843f2a1b8bae2f9d5193768843a2d576d98a30c0cf0"
V1_REPORT_SHA256 = "8747f5ad0100ad3337f0e8240687e5eb4bcea5404237f3ac36dbc1e684198b11"
V2_TOOL_SHA256 = "896d54418af2bc3c2e381111d5fb8cfabd08c366e243b23f50030b7c0c0fcc6b"
V2_PRIVATE_REPORT_SHA256 = "186cd7864cc32f4228ecd4820cf87e9abe8367cf33227e5e55d474cb40de1cbb"
V2_PUBLIC_REPORT_SHA256 = "1b242d7da3ad3be9eb667b177abc7db7173ba1fc552f78c4eb9de84c446dd9a2"
SOURCE_HASHES = {
    "PHB": ("tsr2010-players-handbook.pdf", "e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095"),
    "DMG": ("DMG_1stEd.pdf", "7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669"),
    "UA": ("Unearthed Arcana.pdf", "e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4"),
    "MM": ("Monster_Manual.pdf", "c586009f2e5231bf022cf9f593b0ee42fcb5bded3c957d90efc6cb8d1e54bd81"),
    "MM2": ("Monster Manual II.pdf", "b49b64590a1e2d61aa4ded3af6c9abd598bd8fc142f1caa8f5d7bef4abc5ff24"),
}
SUPPLEMENT_SOURCE = ("dmg175.jpg", "e4acdde4a9fed34ae4c60945db53a37e9e7d1b3682f967bc83ccc481e63e5ba7")
V2_CANDIDATE_COUNT = 740
V2_CANDIDATE_USES = 743
COMMON_DPI = {72, 96, 100, 120, 144, 150, 160, 180, 200, 216, 240, 288, 300, 360, 400, 432}
LOCATOR_FIELDS = (
    "normalizedPageRect", "boundsPdfPoints", "sourcePdfPointsLTRB", "cropProvenance",
    "sourcePageCoordinate", "sourceRowImagePixels", "sourcePixelFrame",
    "sourcePageCropPixelsOnRender", "sourceRenderDpi", "sourceCropFrame",
    "renderFrame", "cropRecipe", "sourceCropBoundsPx", "focusSourcePdfPointsLTRB",
    "approvedCropProposal", "sourceCoordinateSpace",
)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def file_sha(path: Path) -> str:
    return sha256(path.read_bytes())


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def numeric4(value: object) -> bool:
    return isinstance(value, (list, tuple)) and len(value) == 4 and all(
        isinstance(x, (int, float)) and math.isfinite(x) for x in value
    )


def normalized_schema(value: object) -> dict:
    """Parse known normalized-rectangle forms without guessing mixed aliases."""
    if value is None:
        return {"status": "absent", "values": None}
    if isinstance(value, list) and len(value) == 1:
        return normalized_schema(value[0])
    if numeric4(value):
        return {"status": "supported-list", "values": list(value)}
    if not isinstance(value, dict):
        return {"status": "unsupported-value-shape", "values": None}

    if not all(k in value for k in ("x", "y")):
        return {"status": "unsupported-object-schema-missing-x-y", "values": None}
    dim_keys = {k for k in ("width", "height", "w", "h") if k in value}
    has_long = {"width", "height"}.issubset(value)
    has_short = {"w", "h"}.issubset(value)
    if has_long and has_short:
        long_values = [value["width"], value["height"]]
        short_values = [value["w"], value["h"]]
        numeric = all(isinstance(x, (int, float)) and math.isfinite(x) for x in long_values + short_values)
        if not numeric:
            return {"status": "unsupported-object-schema-nonnumeric-dimensions", "values": None}
        if long_values != short_values:
            return {"status": "conflicting-mixed-width-height-and-w-h", "values": None}
        if dim_keys != {"width", "height", "w", "h"}:
            return {"status": "unsupported-object-schema-extra-dimension-alias", "values": None}
        xywh = [value["x"], value["y"], value["width"], value["height"]]
        if not all(isinstance(x, (int, float)) and math.isfinite(x) for x in xywh):
            return {"status": "unsupported-object-schema-nonnumeric-values", "values": None}
        if xywh[2] <= 0 or xywh[3] <= 0:
            return {"status": "unsupported-object-schema-nonpositive-size", "values": None}
        return {"status": "supported-object-equal-mixed-aliases", "values": xywh}

    if has_long and dim_keys == {"width", "height"}:
        xywh = [value["x"], value["y"], value["width"], value["height"]]
        status = "supported-object-width-height"
    elif has_short and dim_keys == {"w", "h"}:
        xywh = [value["x"], value["y"], value["w"], value["h"]]
        status = "supported-object-w-h"
    else:
        return {"status": "unsupported-object-schema-incomplete-or-mixed-aliases", "values": None}
    if not all(isinstance(x, (int, float)) and math.isfinite(x) for x in xywh):
        return {"status": "unsupported-object-schema-nonnumeric-values", "values": None}
    if xywh[2] <= 0 or xywh[3] <= 0:
        return {"status": "unsupported-object-schema-nonpositive-size", "values": None}
    return {"status": status, "values": xywh}


def normalized(value: object) -> list[float] | None:
    parsed = normalized_schema(value)
    return parsed["values"] if parsed["status"].startswith("supported-") else None


def unresolved_status(schema_status: str, supported_recipes: int, pixel_comparisons: int) -> str:
    """Classify unresolved replay without calling unparsed schemas searched."""
    if pixel_comparisons > 0:
        return "tried-no-exact-pixel-match"
    if schema_status.startswith("conflicting-") and supported_recipes == 0:
        return "conflicting-normalized-coordinate-schema; zero pixel recipes attempted"
    if schema_status.startswith("unsupported-") and supported_recipes == 0:
        return "unsupported-normalized-coordinate-schema; zero pixel recipes attempted"
    if supported_recipes > 0:
        return "supported-schema-no-dimension-compatible-pixel-recipe"
    return "no-supported-coordinate-declaration; zero pixel recipes attempted"


def declarations(region: dict) -> dict:
    return {k: region[k] for k in LOCATOR_FIELDS if k in region}


def pdf_clips(region: dict, page: fitz.Page) -> list[tuple[str, list[float]]]:
    recipes: list[tuple[str, list[float]]] = []
    rect = normalized(region.get("normalizedPageRect"))
    if rect:
        x, y, w, h = rect
        recipes.append(("normalizedPageRect-on-canonical-CropBox", [
            x * page.rect.width, y * page.rect.height,
            (x + w) * page.rect.width, (y + h) * page.rect.height,
        ]))
    for field in ("boundsPdfPoints", "sourcePdfPointsLTRB"):
        if numeric4(region.get(field)):
            recipes.append((field + "-as-canonical-CropBox-points", list(region[field])))
    provenance = region.get("cropProvenance")
    if isinstance(provenance, dict) and numeric4(provenance.get("requestedPdfClipLTRB")):
        recipes.append(("cropProvenance-requestedPdfClipLTRB", list(provenance["requestedPdfClipLTRB"])))
    pixel_frame = region.get("sourcePixelFrame")
    if isinstance(pixel_frame, dict) and numeric4(pixel_frame.get("nominalPdfClipPoints")):
        recipes.append(("sourcePixelFrame-nominalPdfClipPoints", list(pixel_frame["nominalPdfClipPoints"])))
    recipe = region.get("cropRecipe")
    if isinstance(recipe, dict) and numeric4(recipe.get("requestedSourceBoundsPoints")):
        recipes.append(("cropRecipe-requestedSourceBoundsPoints", list(recipe["requestedSourceBoundsPoints"])))
    return recipes


def candidate_dpis(clip: list[float], target_size: tuple[int, int], explicit: list[int] | None = None) -> list[int]:
    width, height = clip[2] - clip[0], clip[3] - clip[1]
    candidates = set(COMMON_DPI)
    if width > 0 and height > 0:
        estimates = [target_size[0] * 72 / width, target_size[1] * 72 / height]
        for estimate in estimates:
            nearest = round(estimate)
            candidates.update(range(max(36, nearest - 2), min(432, nearest + 2) + 1))
        lower = max(36, math.floor(max((target_size[0] - 1) * 72 / width, (target_size[1] - 1) * 72 / height)))
        upper = min(432, math.ceil(min((target_size[0] + 1) * 72 / width, (target_size[1] + 1) * 72 / height)))
        if lower <= upper and upper - lower < 50:
            candidates.update(range(lower, upper + 1))
    if explicit:
        # A separately authored render DPI may be honored as a declared recipe.
        # Generic dimension-derived candidates stay within the 432-DPI ceiling.
        candidates.update(x for x in explicit if isinstance(x, int) and 36 <= x <= 1200)
    return sorted(x for x in candidates if 36 <= x <= 432 or (explicit and x in explicit and 36 <= x <= 1200))


def poppler_crop_candidates(page: fitz.Page, rect_norm: list[float], target_size: tuple[int, int], dpi: int) -> dict:
    """Return only raster crops dimension-compatible with this normalized source rectangle."""
    expected_size = [math.ceil(page.rect.width * dpi / 72), math.ceil(page.rect.height * dpi / 72)]
    x, y, w, h = rect_norm
    edges = [x * expected_size[0], y * expected_size[1], (x + w) * expected_size[0], (y + h) * expected_size[1]]
    starts_x = sorted({math.floor(edges[0]), round(edges[0]), math.ceil(edges[0])})
    starts_y = sorted({math.floor(edges[1]), round(edges[1]), math.ceil(edges[1])})
    candidates = []
    for x0 in starts_x:
        x1 = x0 + target_size[0]
        if max(abs(x0 - edges[0]), abs(x1 - edges[2])) > 1.0:
            continue
        for y0 in starts_y:
            y1 = y0 + target_size[1]
            if max(abs(y0 - edges[1]), abs(y1 - edges[3])) > 1.0:
                continue
            if 0 <= x0 < x1 <= expected_size[0] and 0 <= y0 < y1 <= expected_size[1]:
                candidates.append([x0, y0, x1, y1])
    return {"expectedFullPageDimensions": expected_size, "projectedEdges": edges, "cropBoundsCandidates": candidates}


def pixel_comparison(actual: Image.Image, target: Image.Image) -> dict:
    a = actual.convert("RGB")
    b = target.convert("RGB")
    exact = a.size == b.size and a.tobytes() == b.tobytes()
    differing = None
    if a.size == b.size and not exact:
        aa, bb = a.tobytes(), b.tobytes()
        differing = sum(x != y for x, y in zip(aa, bb))
    return {
        "actualDimensions": list(a.size), "targetDimensions": list(b.size),
        "actualRawRgbSha256": sha256(a.tobytes()), "targetRawRgbSha256": sha256(b.tobytes()),
        "exactRgbPixels": exact, "differingRgbChannels": differing,
    }


class Replay:
    def __init__(self, sources: Path, docs: dict, pdf_render: str, cache_dir: Path | None = None):
        self.sources = sources
        self.docs = docs
        # Bind each loaded document to the hash-verified immutable source path.
        # Page ownership is checked before cache lookup, so a same-book replacement
        # document cannot inherit a previous document's result.
        self.source_bindings = {}
        for book, document in docs.items():
            require(book in SOURCE_HASHES, f"unsupported source book: {book}")
            source_path = (sources / SOURCE_HASHES[book][0]).resolve()
            source_sha = file_sha(source_path)
            require(source_sha == SOURCE_HASHES[book][1], f"source PDF hash mismatch: {book}")
            require(bool(document.name) and Path(document.name).resolve() == source_path,
                    f"loaded document does not own the verified source path: {book}")
            self.source_bindings[book] = (source_sha, document)
        self.full_cache = collections.OrderedDict()
        self.full_cache_core_to_key = {}
        self.direct_cache = {}
        self.reused_render_cache = cache_dir is not None and cache_dir.exists()
        self.render_cache_dir = cache_dir.resolve() if cache_dir else Path(tempfile.mkdtemp(prefix="source-frame-universe-v4-cache-"))
        self.render_cache_dir.mkdir(parents=True, exist_ok=True)
        self.disk_cache_hits = 0
        self.disk_cache_misses = 0
        self.poppler = shutil.which("pdftoppm")
        self.poppler_version = "unavailable"
        if self.poppler:
            v = subprocess.run([self.poppler, "-v"], text=True, capture_output=True, check=False)
            self.poppler_version = (v.stderr or v.stdout).strip()
        self.max_cached_pages = 2

    def bound_document(self, book: str) -> tuple[str, fitz.Document]:
        require(book in self.source_bindings, f"unbound source book: {book}")
        source_sha, document = self.source_bindings[book]
        require(self.docs.get(book) is document, f"source document replaced after binding: {book}")
        return source_sha, document

    def full_page(self, book: str, pdf_page: int, dpi: int, renderer: str) -> Image.Image:
        source_sha, document = self.bound_document(book)
        renderer_version = f"PyMuPDF {fitz.VersionBind}" if renderer == "pymupdf" else self.poppler_version
        core = {
            "sourceSha256": source_sha, "pdfOrdinal": pdf_page, "renderer": renderer,
            "rendererVersion": renderer_version, "dpi": dpi,
            "colorMode": "RGB, alpha false",
            "mupdfStorePolicy": MUPDF_STORE_POLICY if renderer == "pymupdf" else "external renderer",
        }
        core_text = json.dumps(core, sort_keys=True, separators=(",", ":"))
        cache_core_key = sha256(core_text.encode("utf-8"))
        if cache_core_key in self.full_cache_core_to_key:
            key = self.full_cache_core_to_key[cache_core_key]
            self.full_cache.move_to_end(key)
            return self.full_cache[key]
        index_path = self.render_cache_dir / f"{cache_core_key}.index.json"
        cache_metadata = json.loads(index_path.read_text()) if index_path.exists() else None
        cache_path = self.render_cache_dir / cache_metadata["file"] if cache_metadata else None
        if cache_metadata and cache_path.exists():
            require(cache_metadata.get("core") == core, "private raster cache key metadata mismatch")
            image = Image.open(cache_path).convert("RGB").copy()
            require(list(image.size) == cache_metadata.get("measuredDimensions"), "private raster cache measured dimensions mismatch")
            rgb_hash = sha256(image.tobytes())
            require(rgb_hash == cache_metadata.get("rawRgbSha256"), "private raster cache RGB hash mismatch")
            full_key = {**core, "measuredDimensions": list(image.size), "rawRgbSha256": rgb_hash}
            expected_file = sha256(json.dumps(full_key, sort_keys=True, separators=(",", ":")).encode("utf-8")) + ".png"
            require(cache_path.name == expected_file, "private raster cache full key mismatch")
            self.disk_cache_hits += 1
        else:
            if renderer == "pymupdf":
                fitz.TOOLS.store_shrink(100)
                pix = document[pdf_page - 1].get_pixmap(dpi=dpi, alpha=False, colorspace=fitz.csRGB)
                image = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
            elif renderer == "poppler-pdftoppm":
                require(self.poppler is not None, "pdftoppm is required for fallback full-page recipes")
                source = self.sources / SOURCE_HASHES[book][0]
                with tempfile.TemporaryDirectory(prefix="source-frame-universe-v4-") as directory:
                    prefix = Path(directory) / "page"
                    subprocess.run([
                        self.poppler, "-f", str(pdf_page), "-l", str(pdf_page), "-r", str(dpi),
                        "-png", "-singlefile", str(source), str(prefix),
                    ], check=True, capture_output=True)
                    image = Image.open(prefix.with_suffix(".png")).convert("RGB").copy()
            else:
                raise AssertionError(f"unknown renderer {renderer}")
            rgb_hash = sha256(image.tobytes())
            full_key = {**core, "measuredDimensions": list(image.size), "rawRgbSha256": rgb_hash}
            full_key_hash = sha256(json.dumps(full_key, sort_keys=True, separators=(",", ":")).encode("utf-8"))
            cache_path = self.render_cache_dir / f"{full_key_hash}.png"
            image.save(cache_path, format="PNG", compress_level=3)
            index_path.write_text(json.dumps({"core": core, "file": cache_path.name, "measuredDimensions": list(image.size), "rawRgbSha256": rgb_hash}, separators=(",", ":")) + "\n")
            self.disk_cache_misses += 1
        measured_key = (cache_core_key, tuple(image.size))
        self.full_cache[measured_key] = image
        self.full_cache_core_to_key[cache_core_key] = measured_key
        while len(self.full_cache) > self.max_cached_pages:
            evicted, _ = self.full_cache.popitem(last=False)
            self.full_cache_core_to_key.pop(evicted[0], None)
        return image

    def cleanup(self) -> None:
        shutil.rmtree(self.render_cache_dir, ignore_errors=True)

    def direct(self, book: str, page: fitz.Page, clip: list[float], target: Image.Image, explicit_dpi: list[int]) -> dict:
        if not numeric4(clip) or clip[2] <= clip[0] or clip[3] <= clip[1]:
            return {"exact": False, "trials": []}
        target_rgb = target.tobytes()
        source_sha, document = self.bound_document(book)
        require(page.parent is document, f"page does not belong to bound source document: {book}")
        dpis = tuple(candidate_dpis(clip, target.size, explicit_dpi))
        key = (book, source_sha, id(document), page.number, tuple(clip),
               sha256(target_rgb), target.size, dpis, MUPDF_STORE_POLICY)
        if key in self.direct_cache:
            return self.direct_cache[key]
        trials = []
        for dpi in dpis:
            device = fitz.Rect(clip) * fitz.Matrix(dpi / 72, dpi / 72)
            if (device.irect.width, device.irect.height) != target.size:
                continue
            fitz.TOOLS.store_shrink(100)
            pix = page.get_pixmap(dpi=dpi, clip=fitz.Rect(clip), alpha=False, colorspace=fitz.csRGB)
            exact = (pix.width, pix.height) == target.size and pix.samples == target_rgb
            trials.append({"dpi": dpi, "dimensions": [pix.width, pix.height], "rasterOrigin": [pix.x, pix.y], "rawRgbSha256": sha256(pix.samples), "exactRgbPixels": exact})
        result = {"exact": any(x["exactRgbPixels"] for x in trials), "trials": trials}
        self.direct_cache[key] = result
        return result

    def full_page_clip(self, book: str, page: fitz.Page, clip: list[float], target: Image.Image, dpi: int, renderer: str) -> dict:
        full = self.full_page(book, page.number + 1, dpi, renderer)
        if renderer == "pymupdf":
            pixel_rect = fitz.Rect(clip) * fitz.Matrix(dpi / 72, dpi / 72)
            bounds = [pixel_rect.irect.x0, pixel_rect.irect.y0, pixel_rect.irect.x1, pixel_rect.irect.y1]
            choices = [("pdf-point-device-irect", tuple(bounds))]
        else:
            page_rect = page.rect
            n = [clip[0] / page_rect.width, clip[1] / page_rect.height,
                 (clip[2] - clip[0]) / page_rect.width, (clip[3] - clip[1]) / page_rect.height]
            edges = [n[0] * full.width, n[1] * full.height, (n[0] + n[2]) * full.width, (n[1] + n[3]) * full.height]
            x0, y0, x1, y1 = [round(v) for v in edges]
            choices = [("normalized-full-page-pixel-round", (x0, y0, x1, y1))]
            xf, yf, xe, ye = math.floor(edges[0]), math.floor(edges[1]), math.ceil(edges[2]), math.ceil(edges[3])
            if (xf, yf, xe, ye) != (x0, y0, x1, y1):
                choices.append(("normalized-full-page-pixel-floor-ceil", (xf, yf, xe, ye)))
        trials = []
        for label, box in choices:
            crop = full.crop(box)
            comparison = pixel_comparison(crop, target)
            trials.append({"pixelBounds": list(box), "boundMethod": label, **comparison})
        return {"renderer": renderer, "dpi": dpi, "fullPageDimensions": list(full.size), "trials": trials, "exact": any(x["exactRgbPixels"] for x in trials)}


def owner_uses(data: dict) -> list[dict]:
    uses = []
    for collection, records in data.items():
        if not isinstance(records, list):
            continue
        for item in records:
            for binding in ("sourceExcerpts", "scanVerification"):
                owner = item.get(binding)
                if not isinstance(owner, dict) or not owner.get("catalog"):
                    continue
                for review in owner.get("regionReviews", []):
                    uses.append({"collection": collection, "itemId": item.get("id"), "binding": binding,
                                 "catalog": owner["catalog"], "regionId": review.get("regionId"),
                                 "imageSha256": review.get("imageSha256"), "sourceSha256": review.get("sourceSha256")})
    explainer = data.get("progressionExplainer")
    if isinstance(explainer, dict):
        for binding in ("sourceExcerpts", "scanVerification"):
            owner = explainer.get(binding)
            if isinstance(owner, dict) and owner.get("catalog"):
                for review in owner.get("regionReviews", []):
                    uses.append({"collection": "progressionExplainer", "itemId": explainer.get("id"), "binding": binding,
                                 "catalog": owner["catalog"], "regionId": review.get("regionId"),
                                 "imageSha256": review.get("imageSha256"), "sourceSha256": review.get("sourceSha256")})
    return uses


def run(args: argparse.Namespace) -> dict:
    repo, sources = args.repo.resolve(), args.sources.resolve()
    data_path = repo / "dist/data.json"
    current_commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=repo, text=True).strip()
    raw_data_sha = file_sha(data_path)
    require(current_commit == INPUT_COMMIT and raw_data_sha == INPUT_DATA_SHA256, "pinned current data/tree changed")
    data = json.loads(data_path.read_text())
    canonical_data_sha = sha256(json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
    require(canonical_data_sha == "52c405720f28aa665786c38692b2141ce598e3a9d3031555e17020d2f86ca957", "canonical data-object hash changed")

    # V5 is additive: all earlier tools and reports retain their exact bytes.
    require(file_sha(repo / "tools/source-frame-universe-v3.py") == V3_TOOL_SHA256, "v3 tool evidence pin changed")
    require(file_sha(repo / "tools/source-frame-universe-v4.py") == V4_TOOL_SHA256, "v4 tool evidence pin changed")
    v4_report_path = args.v4_report.resolve()
    require(file_sha(v4_report_path) == V4_PRIVATE_REPORT_SHA256, "v4 private replay report pin changed")
    require(file_sha(repo / "research/source-audit-pass8-independent-frame-v4-review.json") == V4_INDEPENDENT_REVIEW_SHA256, "independent v4 review pin changed")
    v4_private = json.loads(v4_report_path.read_text())
    require(v4_private["input"]["v4ToolSha256"] == V4_TOOL_SHA256 and v4_private["denominators"]["currentRegionRows"] == 3396, "v4 replay capture identity mismatch")
    v1_tool = args.v1_tool.resolve(); v1_report_path = args.v1_report.resolve()
    v2_tool = args.v2_tool.resolve(); v2_report_path = args.v2_report.resolve()
    v2_public = args.v2_public_report.resolve()
    require(file_sha(v1_tool) == V1_TOOL_SHA256 and file_sha(v1_report_path) == V1_REPORT_SHA256, "v1 evidence pin changed")
    require(file_sha(v2_tool) == V2_TOOL_SHA256 and file_sha(v2_report_path) == V2_PRIVATE_REPORT_SHA256 and file_sha(v2_public) == V2_PUBLIC_REPORT_SHA256, "v2 evidence pin changed")
    v2_private = json.loads(v2_report_path.read_text())
    v2_public_json = json.loads(v2_public.read_text())
    require(v2_private["input"]["commit"] == INPUT_COMMIT and v2_private["denominators"]["allCurrentRegionRows"] == 3396, "v2 capture input mismatch")
    require(v2_public_json["denominators"]["historicalUnknownFrameMemberCensus"]["reportedHistoricalDenominator"] == 726, "v2 historical scope changed")

    source_docs, source_records = {}, {}
    for book, (name, expected_hash) in SOURCE_HASHES.items():
        path = sources / name
        actual = file_sha(path)
        require(actual == expected_hash, f"source PDF hash mismatch {book}: {actual}")
        source_records[book] = {"name": name, "sha256": actual}
        source_docs[book] = fitz.open(path)
    supplement = sources / SUPPLEMENT_SOURCE[0]
    supplement_hash = file_sha(supplement)
    require(supplement_hash == SUPPLEMENT_SOURCE[1], "DMG supplement JPEG source identity mismatch")
    source_records["DMG-175-supplement-image"] = {"name": SUPPLEMENT_SOURCE[0], "sha256": supplement_hash, "pdf": False}
    usage_list = owner_uses(data)
    require(len(usage_list) == 3399, f"owner-use count drift: {len(usage_list)}")
    use_map: dict[tuple[str, str], list[dict]] = collections.defaultdict(list)
    for use in usage_list:
        use_map[(use["catalog"], use["regionId"])].append(use)

    scan_catalogs = sorted((repo / "dist/scans").rglob("*.json"))
    row_work = []
    field_counts = collections.Counter()
    total_region_count = 0
    identity_counts = collections.Counter()
    v1_candidates = {(x["key"][0], x["key"][1]): x for x in v2_private["records"]["candidateRows"]}
    replay = Replay(sources, source_docs, "RGB", args.render_cache_dir)
    explicit_dpi_tests = []
    row_coordinate_checks = []
    crop_provenance_checks = []
    render_frame_checks = []

    for catalog_index, catalog_path in enumerate(scan_catalogs, 1):
        catalog = json.loads(catalog_path.read_text())
        relative = str(catalog_path.relative_to(repo / "dist"))
        catalog_sha = file_sha(catalog_path)
        for ordinal, region in enumerate(catalog.get("regions", [])):
            total_region_count += 1
            key = (relative, region["id"])
            ds = declarations(region)
            field_counts.update(ds.keys())
            expected_region_uses = use_map.get(key, [])
            image_path = catalog_path.parent / region["image"]
            image_bytes = image_path.read_bytes()
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            actual_img_sha = sha256(image_bytes)
            declared_img_sha = region.get("sha256")
            book = region.get("book")
            pdf_page = region.get("pdfPage")
            is_supplement = str(region.get("sourceCoordinateSpace", "")).startswith("supplement-image")
            expected_source_sha = supplement_hash if is_supplement else SOURCE_HASHES.get(book, (None, None))[1]
            image_hash_ok = actual_img_sha == declared_img_sha
            image_dimensions_ok = list(image.size) == [region.get("width"), region.get("height")]
            usage_checks = []
            for use in expected_region_uses:
                usage_checks.append({
                    "collection": use["collection"], "itemId": use["itemId"], "binding": use["binding"],
                    "imageSha256Matches": use.get("imageSha256") == actual_img_sha,
                    "sourceSha256Matches": use.get("sourceSha256") == expected_source_sha,
                    "sourceSha256": use.get("sourceSha256"),
                })
            source_identity_ok = image_hash_ok and image_dimensions_ok and book in SOURCE_HASHES and all(x["imageSha256Matches"] and x["sourceSha256Matches"] for x in usage_checks) and len(usage_checks) > 0
            if is_supplement:
                source_identity_ok = image_hash_ok and image_dimensions_ok and all(x["imageSha256Matches"] and x["sourceSha256Matches"] for x in usage_checks) and len(usage_checks) > 0
            identity_counts["rows"] += 1
            identity_counts["imageHashMatchRows"] += int(image_hash_ok)
            identity_counts["dimensionMatchRows"] += int(image_dimensions_ok)
            identity_counts["rowsWithAtLeastOneOwnerUse"] += int(bool(usage_checks))
            identity_counts["ownerUseRecords"] += len(usage_checks)
            identity_counts["ownerImageHashMatches"] += sum(int(x["imageSha256Matches"]) for x in usage_checks)
            identity_counts["ownerSourceHashMatches"] += sum(int(x["sourceSha256Matches"]) for x in usage_checks)
            if not source_identity_ok:
                identity_counts["identityFailureRows"] += 1
            row_result = {
                "catalog": relative, "catalogSha256": catalog_sha, "regionOrdinal": ordinal,
                "regionId": region["id"], "book": book, "printedPage": region.get("printedPage"),
                "pdfPage": pdf_page, "image": region["image"], "imageSha256": actual_img_sha,
                "imageDimensions": list(image.size), "imageRawRgbSha256": sha256(image.tobytes()),
                "declaredImageSha256": declared_img_sha, "imageHashMatches": image_hash_ok,
                "imageDimensionsMatch": image_dimensions_ok, "expectedSourceSha256": expected_source_sha,
                "sourceIdentityMatches": source_identity_ok, "ownerUses": usage_checks,
                "declarations": ds, "directRecipes": [], "fullPageRecipes": [],
                "frameStatus": None, "normalizedPageRectSchemaStatus": normalized_schema(region.get("normalizedPageRect"))["status"],
                "pixelComparisonCount": 0, "semanticsApproved": False,
            }
            if not source_identity_ok:
                row_result["frameStatus"] = "source-identity-failure; pixel replay withheld"
                row_work.append(row_result)
                continue

            # The two DMG p.175 entries explicitly refer to a private JPEG image, not a PDF page.
            if is_supplement:
                require(pdf_page is None, f"supplement image incorrectly assigned a PDF page: {key}")
                bounds = region.get("sourceCropBoundsPx")
                if not numeric4(bounds):
                    row_result["frameStatus"] = "typed-supplement-no-crop-bounds-not-pdf"
                    row_work.append(row_result)
                    continue
                src_image = Image.open(supplement).convert("RGB")
                crop = src_image.crop(tuple(bounds))
                result = pixel_comparison(crop, image)
                n = normalized(region.get("normalizedPageRect"))
                if n:
                    normalized_edges = [n[0] * src_image.width, n[1] * src_image.height, (n[0]+n[2])*src_image.width, (n[1]+n[3])*src_image.height]
                    result["normalizedRectProjectedPixels"] = normalized_edges
                row_result["fullPageRecipes"].append({"type": "source-image-pil-crop-not-pdf", "sourceImageSha256": supplement_hash, "sourceImageDimensions": list(src_image.size), "sourceCropLTRBPixels": list(bounds), **result})
                row_result["pixelComparisonCount"] = 1
                row_result["frameStatus"] = "exact-supplement-image-crop-not-pdf" if result["exactRgbPixels"] else "typed-supplement-no-exact-pixel-match-not-pdf"
                row_work.append(row_result)
                continue

            if book not in source_docs or not isinstance(pdf_page, int) or not (1 <= pdf_page <= len(source_docs[book])):
                row_result["frameStatus"] = "unsupported-source-page; no canonical PDF recipe"
                row_work.append(row_result)
                continue
            page = source_docs[book][pdf_page - 1]
            clips = pdf_clips(region, page)
            explicit_dpis = [region.get("sourceRenderDpi")]
            for d in (region.get("sourcePixelFrame"), region.get("cropProvenance"), region.get("cropRecipe")):
                if isinstance(d, dict):
                    explicit_dpis.extend([d.get("renderDpi")])
            explicit_dpis = [x for x in explicit_dpis if isinstance(x, int)]
            direct_match = False
            for label, clip in clips:
                attempt = replay.direct(book, page, clip, image, explicit_dpis)
                row_result["directRecipes"].append({"coordinateField": label, "clipLTRBPoints": clip, **attempt})
                if attempt["exact"]:
                    direct_match = True
            row_result["pixelComparisonCount"] = sum(len(x.get("trials", [])) for x in row_result["directRecipes"])
            if direct_match:
                row_result["frameStatus"] = "exact-direct-pymupdf-pdf-clip"
                row_work.append(row_result)
                continue

            # Explicit full-page and source-frame recipes are attempted before generic fallbacks.
            special_match = False
            frame = region.get("sourcePixelFrame")
            if isinstance(frame, dict):
                dpi = frame.get("renderDpi"); bounds = frame.get("actualPixelLTRB")
                if isinstance(dpi, int) and numeric4(bounds):
                    full = replay.full_page(book, frame.get("pdfPage", pdf_page), dpi, "pymupdf")
                    crop = full.crop(tuple(bounds)); cmp = pixel_comparison(crop, image)
                    row_result["fullPageRecipes"].append({"type": "sourcePixelFrame-pymupdf-page-crop", "dpi": dpi, "fullPageDimensions": list(full.size), "bounds": list(bounds), **cmp})
                    special_match |= cmp["exactRgbPixels"]
            frame = region.get("sourcePageCropPixelsOnRender")
            if isinstance(frame, dict):
                dpi = region.get("sourceRenderDpi", 160)
                x,y,w,h = [frame[k] for k in ("x","y","width","height")]
                for renderer_name in ("poppler-pdftoppm", "pymupdf"):
                    full = replay.full_page(book, pdf_page, dpi, renderer_name)
                    crop = full.crop((x,y,x+w,y+h)); cmp = pixel_comparison(crop,image)
                    row_result["fullPageRecipes"].append({"type": "sourcePageCropPixelsOnRender", "renderer": renderer_name, "dpi": dpi, "fullPageDimensions": list(full.size), "bounds": [x,y,x+w,y+h], **cmp})
                    special_match |= cmp["exactRgbPixels"]
            recipe = region.get("cropRecipe")
            if isinstance(recipe, dict) and numeric4(recipe.get("sourceCropBoundsPixelsXYXY")):
                dpi = recipe.get("renderDpi")
                if isinstance(dpi, int):
                    full = replay.full_page(book,pdf_page,dpi,"pymupdf")
                    bounds = recipe["sourceCropBoundsPixelsXYXY"]
                    crop = full.crop(tuple(bounds));cmp=pixel_comparison(crop,image)
                    row_result["fullPageRecipes"].append({"type":"cropRecipe-pymupdf-page-crop","dpi":dpi,"fullPageDimensions":list(full.size),"bounds":list(bounds),**cmp})
                    special_match |= cmp["exactRgbPixels"]
            if special_match:
                row_result["pixelComparisonCount"] += len(row_result["fullPageRecipes"])
                row_result["frameStatus"] = "exact-explicit-full-page-recipe"
                row_work.append(row_result)
                continue

            # Dimension-guided full-page crop search. Candidate generation is finite; only exact RGB equality passes.
            fallback_exact = False
            bounded_explicit_dpis = [dpi for dpi in explicit_dpis if dpi <= 432]
            for label, clip in clips:
                dpis = candidate_dpis(clip, image.size, bounded_explicit_dpis)
                for dpi in dpis:
                    rect = fitz.Rect(clip) * fitz.Matrix(dpi / 72, dpi / 72)
                    if (rect.irect.width, rect.irect.height) != image.size:
                        continue
                    full = replay.full_page(book, pdf_page, dpi, "pymupdf")
                    bounds = [rect.irect.x0, rect.irect.y0, rect.irect.x1, rect.irect.y1]
                    crop = full.crop(tuple(bounds)); cmp = pixel_comparison(crop, image)
                    row_result["fullPageRecipes"].append({"type":"dimension-guided-pymupdf-page-crop","coordinateField":label,"dpi":dpi,"fullPageDimensions":list(full.size),"bounds":bounds,**cmp})
                    if cmp["exactRgbPixels"]:
                        fallback_exact=True
                        break
                if fallback_exact: break
            if not fallback_exact and replay.poppler:
                rect_norm = normalized(region.get("normalizedPageRect"))
                if rect_norm:
                    pseudo_clip = [rect_norm[0]*page.rect.width,rect_norm[1]*page.rect.height,(rect_norm[0]+rect_norm[2])*page.rect.width,(rect_norm[1]+rect_norm[3])*page.rect.height]
                    for dpi in candidate_dpis(pseudo_clip,image.size,bounded_explicit_dpis):
                        feasibility = poppler_crop_candidates(page, rect_norm, image.size, dpi)
                        if not feasibility["cropBoundsCandidates"]:
                            continue
                        full = replay.full_page(book,pdf_page,dpi,"poppler-pdftoppm")
                        tested_bounds = []
                        for bounds in feasibility["cropBoundsCandidates"]:
                            if bounds[2] > full.width or bounds[3] > full.height:
                                continue
                            crop=full.crop(tuple(bounds));cmp=pixel_comparison(crop,image)
                            row_result["fullPageRecipes"].append({"type":"dimension-guided-poppler-page-crop","dpi":dpi,"expectedFullPageDimensions":feasibility["expectedFullPageDimensions"],"fullPageDimensions":list(full.size),"projectedEdges":feasibility["projectedEdges"],"bounds":bounds,**cmp})
                            tested_bounds.append(bounds)
                            if cmp["exactRgbPixels"]:
                                fallback_exact=True;break
                        row_result.setdefault("popplerCandidateDpiChecks", []).append({"dpi":dpi, **feasibility, "testedBounds":tested_bounds, "fullPageDimensions":list(full.size)})
                        if fallback_exact: break
            row_result["pixelComparisonCount"] = sum(len(x.get("trials", [])) for x in row_result["directRecipes"]) + len(row_result["fullPageRecipes"])
            if fallback_exact:
                row_result["frameStatus"] = "exact-dimension-guided-full-page-recipe"
            else:
                row_result["frameStatus"] = unresolved_status(
                    row_result["normalizedPageRectSchemaStatus"], len(clips), row_result["pixelComparisonCount"]
                )
            row_work.append(row_result)
        if catalog_index % 50 == 0 or catalog_index == len(scan_catalogs):
            print(f"catalogs={catalog_index}/{len(scan_catalogs)} regions={total_region_count} directCache={len(replay.direct_cache)} fullPages={replay.disk_cache_misses} cacheHits={replay.disk_cache_hits}", flush=True)

    # V2 cohort must still have precisely its prior set and exact per-row status.
    v2_status = {tuple(r["key"]): r["augmentedFrameStatus"] for r in v2_private["records"]["candidateRows"]}
    v2_status_class = {
        "direct-exact-pdf-clip": "exact-direct-pymupdf-pdf-clip",
        "full-page-pymupdf-raster-crop": "exact-direct-pymupdf-pdf-clip", # V4 retains the v3 direct-first dispatch, then special below if direct is not exact.
        "full-page-poppler-raster-then-PIL-crop": "exact-explicit-full-page-recipe",
        "supplement-source-jpeg-pil-crop-not-pdf": "exact-supplement-image-crop-not-pdf",
    }
    lookup_rows = {(x["catalog"],x["regionId"]):x for x in row_work}
    require(set(v2_status)==set(v1_candidates), "v2 candidate row IDs mismatch")
    # Require all frozen rows remain exact even if renderer-dispatch labels are generalized.
    v2_failures = [k for k in v2_status if not lookup_rows[k]["frameStatus"].startswith("exact-")]
    require(not v2_failures, f"v2 candidate rows no longer replay exactly: {len(v2_failures)}")

    frame_counts = collections.Counter(x["frameStatus"] for x in row_work)
    schema_counts = collections.Counter(x["normalizedPageRectSchemaStatus"] for x in row_work)
    unresolved_rows = [x for x in row_work if not x["frameStatus"].startswith("exact-")]
    unresolved_image_count = len({x["imageSha256"] for x in unresolved_rows})
    unresolved_geometry_keys = {
        json.dumps([
            x["expectedSourceSha256"], x["pdfPage"], x["normalizedPageRectSchemaStatus"],
            x["declarations"].get("normalizedPageRect"), x["imageDimensions"],
        ], sort_keys=True, separators=(",", ":"))
        for x in unresolved_rows
    }
    unresolved_outcome_counts = collections.Counter(x["frameStatus"] for x in unresolved_rows)
    owner_status = []
    for row in row_work:
        for use in row["ownerUses"]:
            owner_status.append({
                "catalog": row["catalog"], "regionId": row["regionId"],
                "collection": use["collection"], "itemId": use["itemId"], "binding": use["binding"],
                "frameStatus": row["frameStatus"], "imageHashMatches": use["imageSha256Matches"],
                "sourceHashMatches": use["sourceSha256Matches"],
            })
    require(len(row_work)==3396 and len(owner_status)==3399, "universe record counts incomplete")

    tool_hash=file_sha(Path(__file__).resolve())
    output= {
        "schemaVersion":5,
        "artifactType":"private full current source-frame universe replay v5; normalized schema support and isolated pixel identity only",
        "input":{"commit":current_commit,"rawDataSha256":raw_data_sha,"canonicalDataObjectSha256":canonical_data_sha,"v1ToolSha256":V1_TOOL_SHA256,"v1ReportSha256":V1_REPORT_SHA256,"v2ToolSha256":V2_TOOL_SHA256,"v2PrivateReportSha256":V2_PRIVATE_REPORT_SHA256,"v2PublicReceiptSha256":V2_PUBLIC_REPORT_SHA256,"v3ToolSha256":V3_TOOL_SHA256,"v4ToolSha256":V4_TOOL_SHA256,"v4PrivateReportSha256":V4_PRIVATE_REPORT_SHA256,"v4IndependentReviewSha256":V4_INDEPENDENT_REVIEW_SHA256,"v5ToolSha256":tool_hash},
        "sourceFiles":source_records,
        "runtime":{"pymupdf":fitz.VersionBind,"pillow":__import__("PIL").__version__,"pdftoppm":replay.poppler_version,"pixelMode":"RGB; exact decoded pixel equality; no perceptual or registration tolerance","mupdfStorePolicy":MUPDF_STORE_POLICY},
        "denominators":{"catalogs":len(scan_catalogs),"currentRegionRows":len(row_work),"currentOwnerUses":len(owner_status),"currentRowsWithOwners":sum(bool(x["ownerUses"]) for x in row_work),"historicalUnknownFrameMemberCensus":{"denominator":726,"status":"unavailable; not mapped to current 3396 rows"}},
        "identity":{"regionImageShaMatches":identity_counts["imageHashMatchRows"],"regionDimensionMatches":identity_counts["dimensionMatchRows"],"ownerUseImageHashMatches":identity_counts["ownerImageHashMatches"],"ownerUseSourceHashMatches":identity_counts["ownerSourceHashMatches"],"ownerUses":identity_counts["ownerUseRecords"],"identityFailureRows":identity_counts["identityFailureRows"]},
        "frameStatusCounts":dict(sorted(frame_counts.items())),
        "ownerUseStatusCounts":dict(sorted(collections.Counter(x["frameStatus"] for x in owner_status).items())),
        "coordinateSchema":{"normalizedPageRectStatusCounts":dict(sorted(schema_counts.items())),"unsupportedSchemaZeroAttemptRows":sum(1 for x in row_work if x["frameStatus"].startswith("unsupported-normalized-coordinate-schema")),"conflictingSchemaRows":sum(1 for x in row_work if x["normalizedPageRectSchemaStatus"].startswith("conflicting-")),"supportedSchemaPixelAttemptRows":sum(1 for x in row_work if x["normalizedPageRectSchemaStatus"].startswith("supported-") and x["pixelComparisonCount"]>0),"supportedSchemaNoCompatiblePixelRecipeRows":sum(1 for x in row_work if x["frameStatus"]=="supported-schema-no-dimension-compatible-pixel-recipe"),"triedNoExactPixelMatchRows":sum(1 for x in row_work if x["frameStatus"]=="tried-no-exact-pixel-match"),"unresolvedSourceIdentityFailures":sum(1 for x in row_work if x["frameStatus"].startswith("source-identity-failure")),"typedSupplementRows":sum(1 for x in row_work if str(x["declarations"].get("sourceCoordinateSpace", "")).startswith("supplement-image"))},
        "unresolvedPopulation":{"rows":len(unresolved_rows),"uniqueImageSha256":unresolved_image_count,"uniqueSourcePageCoordinateTargetGeometries":len(unresolved_geometry_keys),"outcomeCounts":dict(sorted(unresolved_outcome_counts.items()))},
        "fieldCoverage":dict(sorted(field_counts.items())),
        "limits":["Exact RGB match establishes a current frame/render recipe, not historical authoring process or semantic/source correctness.","No source interpretation, completeness, relevance, qualifier, highlight-focus or rule approval is inferred.","All previous v1/v2/v3/v4 artifacts are pinned and unchanged; historical 726-member set remains unavailable and is not closed by the current universe.","No catalog/data/review flags were changed.","Generic dimension-guided DPI candidates are bounded to 432 DPI; separately declared explicit recipes may use 36–1200 DPI. Untested or unmatched recipes remain unresolved; no resampling.","Normalized x/y/w/h fields are a candidate coordinate interpretation only; a successful exact pixel replay does not approve source semantics or historical authoring intent."],
        "records":row_work,
        "ownerUseRecords":owner_status,
    }
    output["rendererCache"]={"fullPageRenderCacheMisses":replay.disk_cache_misses,"fullPageRenderCacheHits":replay.disk_cache_hits,"privateCacheDirectorySupplied":replay.reused_render_cache,"cacheVisibility":"private temporary directory; removed at completion","fullCacheContentKeyFields":["sourceSha256","pdfOrdinal","renderer","rendererVersion","dpi","colorMode","measuredDimensions","rawRgbSha256","mupdfStorePolicy"],"directCacheIdentityFields":["book","verifiedSourceSha256","boundDocumentIdentity","pageOrdinal","clipLTRBPoints","targetRawRgbSha256","targetDimensions","effectiveDpiCandidates","mupdfStorePolicy"],"priorAttempt02CacheReuse":"none; prior cache has no provenance sidecars and cannot be validated against complete keys","suppliedCacheValidation":"all indexed rasters are verified against source/renderer/runtime, measured dimensions and decoded RGB hashes before reuse"}
    replay.cleanup()
    out=args.private_output.resolve();out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(output,ensure_ascii=False,separators=(",",":"))+"\n")
    return {"privateOutput":str(out),"privateOutputSha256":file_sha(out),"privateOutputBytes":out.stat().st_size,"toolSha256":tool_hash,"denominators":output["denominators"],"identity":output["identity"],"frameStatusCounts":output["frameStatusCounts"],"pdftoppm":replay.poppler_version}


def parse_args():
    root=Path(__file__).resolve().parents[1]
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo",type=Path,default=root)
    parser.add_argument("--sources",type=Path,default=Path("/workspace/vault-audit-private/sources"))
    parser.add_argument("--v1-tool",type=Path,default=Path("/workspace/vault-audit-private/pass8/root/source-frame-replay.py"))
    parser.add_argument("--v1-report",type=Path,default=Path("/workspace/vault-audit-private/pass8/root/source-frame-replay-before.json"))
    parser.add_argument("--v2-tool",type=Path,default=root/"tools/source-coordinate-replay.py")
    parser.add_argument("--v2-report",type=Path,default=Path("/workspace/vault-audit-private/pass8/site/source-frame-replay-v2.json"))
    parser.add_argument("--v2-public-report",type=Path,default=root/"research/source-audit-pass8-frame-replay.json")
    parser.add_argument("--private-output",type=Path,default=Path("/workspace/vault-audit-private/pass8/site/source-frame-universe-v5.json"))
    parser.add_argument("--render-cache-dir",type=Path,default=None,help="reuse only a private cache whose full content keys are validated before every hit")
    parser.add_argument("--v4-report",type=Path,default=Path("/workspace/vault-audit-private/pass8-independent-source-frame-review/v4-fresh-full.json"))
    return parser.parse_args()


if __name__=="__main__":
    print(json.dumps(run(parse_args()),indent=2))
