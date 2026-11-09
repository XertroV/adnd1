#!/usr/bin/env python3
"""Inventory native source-raster ink near every current catalog crop edge.

The script consumes the complete usage map produced by source-visual-audit.py,
validates the map's current data/catalog/source hashes, renders each needed
source PDF page to a temporary grayscale raster, and emits only numeric edge
component metadata. It does not emit page pixels, crop images, OCR or text.

An edge component is a review candidate, never a semantic verdict. A missing
geometry, source, page, image, or matching hash is explicitly not-assessable.
No-candidate is not a crop-completeness or contextual-adequacy pass.
"""
from __future__ import annotations

import argparse
import collections
import gzip
import hashlib
import importlib.util
import json
import math
import os
import sys
from pathlib import Path

try:
    import fitz
    import numpy as np
    from scipy import ndimage
except ImportError as exc:  # pragma: no cover - exercised by command-line users
    raise SystemExit(f"source raster audit requires PyMuPDF, numpy, and scipy: {exc}")

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DIST = ROOT / "dist"
PDF_FILENAMES = {
    "PHB": "tsr2010-players-handbook.pdf",
    "DMG": "DMG_1stEd.pdf",
    "UA": "Unearthed Arcana.pdf",
    "MM": "Monster_Manual.pdf",
    "MM2": "Monster Manual II.pdf",
}
SUPPLEMENTAL_IMAGE_FILENAMES = {"dmg175-user-confirmed-supplement": "dmg175.jpg"}
SUPPLEMENTAL_NA_REASON = "Supplemental source-image frame is retained in the usage denominator but is not part of the current PDF-raster geometry assessment."
THRESHOLDS = (180, 230, 254)
STRUCTURE_8 = np.ones((3, 3), dtype=np.uint8)
_continuation_spec = importlib.util.spec_from_file_location("continuation_candidates", ROOT / "tools" / "continuation-candidates.py")
_continuation = importlib.util.module_from_spec(_continuation_spec)
_continuation_spec.loader.exec_module(_continuation)
supplemental_region_identity = _continuation.supplemental_region_identity
_frame_spec = importlib.util.spec_from_file_location("source_frame_coordinate_bridge", ROOT / "research" / "source_frame_coordinate_bridge.py")
_frame_bridge = importlib.util.module_from_spec(_frame_spec)
_frame_spec.loader.exec_module(_frame_bridge)
current_observation = _frame_bridge.current_observation
owner_key = _frame_bridge.owner_key
normalized_rect_to_page_points = _frame_bridge.normalized_rect_to_page_points
public_resolution = _frame_bridge.public_resolution
load_registry = _frame_bridge.load_registry
REGISTRY_SHA256 = _frame_bridge.REGISTRY_SHA256
REGISTRY_RELATIVE_PATH = _frame_bridge.REGISTRY_RELATIVE_PATH
validate_live_registry = _frame_bridge.validate_live_registry


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def half_up(value: float) -> int:
    return math.floor(value + 0.5)


def rect_to_pixels(bounds_points, page, pix, dpi):
    """Map page-relative PDF point LTRB bounds to native raster pixels."""
    if not isinstance(bounds_points, list) or len(bounds_points) != 4:
        return None, "missing-geometry"
    try:
        x0, y0, x1, y1 = map(float, bounds_points)
    except (TypeError, ValueError):
        return None, "invalid-geometry"
    if not all(math.isfinite(value) for value in (x0, y0, x1, y1)):
        return None, "invalid-geometry"
    if x0 < 0 or y0 < 0 or x1 <= x0 or y1 <= y0:
        return None, "invalid-geometry"
    if x1 > page.rect.width + 0.002 or y1 > page.rect.height + 0.002:
        return None, "out-of-page-geometry"
    scale = dpi / 72.0
    # `page.rect` is page-relative. Pixmap x/y are device-space origins; using
    # them makes the transform explicit for pages with non-zero render origins.
    ltrb = [
        half_up(x0 * scale - pix.x),
        half_up(y0 * scale - pix.y),
        half_up(x1 * scale - pix.x),
        half_up(y1 * scale - pix.y),
    ]
    if ltrb[0] < 0 or ltrb[1] < 0 or ltrb[2] > pix.width or ltrb[3] > pix.height:
        return None, "raster-boundary-out-of-frame"
    if ltrb[0] >= ltrb[2] or ltrb[1] >= ltrb[3]:
        return None, "empty-raster-geometry"
    return ltrb, "assessable"


def _threshold_counts(array):
    return {f"lt{threshold}": int(np.count_nonzero(array < threshold)) for threshold in THRESHOLDS}


def _rect_ltrb(xs, ys, origin_x, origin_y):
    if xs.size == 0:
        return None
    return [
        int(origin_x + xs.min()),
        int(origin_y + ys.min()),
        int(origin_x + xs.max() + 1),
        int(origin_y + ys.max() + 1),
    ]


def _components_254(combined, outside_mask, origin_x, origin_y):
    """Return only numeric 8-connected sub-254 components touching either band."""
    labels, count = ndimage.label(combined < 254, structure=STRUCTURE_8)
    found = []
    for label_id, slices in enumerate(ndimage.find_objects(labels), start=1):
        if slices is None:
            continue
        sy, sx = slices
        local_labels = labels[sy, sx] == label_id
        outside_local = outside_mask[sy, sx]
        outside_component = local_labels & outside_local
        inside_component = local_labels & ~outside_local
        n_outside = int(np.count_nonzero(outside_component))
        n_inside = int(np.count_nonzero(inside_component))
        if not n_outside and not n_inside:
            continue
        ys, xs = np.where(local_labels)
        values = combined[sy, sx][local_labels]
        found.append({
            "boundsPx": [
                int(origin_x + sx.start + xs.min()),
                int(origin_y + sy.start + ys.min()),
                int(origin_x + sx.start + xs.max() + 1),
                int(origin_y + sy.start + ys.max() + 1),
            ],
            "pixelCountLt254": int(len(xs)),
            "outsidePixelCountLt254": n_outside,
            "insidePixelCountLt254": n_inside,
            "minGray": int(values.min()),
            "contact": "crossing" if n_outside and n_inside else "outside-only" if n_outside else "inside-only",
        })
    return found


def scan_edge_bands(gray, bounds_px, band_px=8):
    """Inventory all four edge bands, including outside-only components.

    The returned status is pixel-only. `outside-only` components are preserved
    so a glyph whose visible component lies completely outside a crop is not
    mistaken for an empty edge. `inside-only` components can also be ordinary
    content near an edge and do not imply clipping.
    """
    height, width = gray.shape
    x0, y0, x1, y1 = bounds_px
    edge_specs = {
        "left": ([max(0, x0 - band_px), y0, min(width, x0 + band_px), y1],
                 (max(0, x0 - band_px), y0, x0, y1)),
        "right": ([max(0, x1 - band_px), y0, min(width, x1 + band_px), y1],
                  (x1, y0, min(width, x1 + band_px), y1)),
        "top": ([x0, max(0, y0 - band_px), x1, min(height, y0 + band_px)],
                (x0, max(0, y0 - band_px), x1, y0)),
        "bottom": ([x0, max(0, y1 - band_px), x1, min(height, y1 + band_px)],
                   (x0, y1, x1, min(height, y1 + band_px))),
    }
    results = {}
    for edge, (combined_bounds, outside_bounds) in edge_specs.items():
        cx0, cy0, cx1, cy1 = combined_bounds
        ox0, oy0, ox1, oy1 = outside_bounds
        combined = gray[cy0:cy1, cx0:cx1]
        if edge == "left":
            split = x0 - cx0
            outside_mask = np.zeros(combined.shape, dtype=bool)
            outside_mask[:, :split] = True
            boundary_point = x0
        elif edge == "right":
            split = x1 - cx0
            outside_mask = np.zeros(combined.shape, dtype=bool)
            outside_mask[:, split:] = True
            boundary_point = x1
        elif edge == "top":
            split = y0 - cy0
            outside_mask = np.zeros(combined.shape, dtype=bool)
            outside_mask[:split, :] = True
            boundary_point = y0
        else:
            split = y1 - cy0
            outside_mask = np.zeros(combined.shape, dtype=bool)
            outside_mask[split:, :] = True
            boundary_point = y1
        inside_mask = ~outside_mask
        outside_arr = combined[outside_mask]
        inside_arr = combined[inside_mask]
        components = _components_254(combined, outside_mask, cx0, cy0)
        counts_out = _threshold_counts(outside_arr)
        counts_in = _threshold_counts(inside_arr)
        results[edge] = {
            "boundaryPixel": int(boundary_point),
            "combinedBandBoundsPx": combined_bounds,
            "outsideBandBoundsPx": [ox0, oy0, ox1, oy1],
            "insideBandBoundsPx": ([x0, y0, min(width, x0 + band_px), y1] if edge == "left" else
                                   [max(0, x1 - band_px), y0, x1, y1] if edge == "right" else
                                   [x0, y0, x1, min(height, y0 + band_px)] if edge == "top" else
                                   [x0, max(0, y1 - band_px), x1, y1]),
            "outsideInkPixels": counts_out,
            "insideInkPixels": counts_in,
            "componentCountLt254": len(components),
            "crossingComponentCountLt254": sum(c["contact"] == "crossing" for c in components),
            "crossingComponentCountWithMinGrayLt230": sum(c["contact"] == "crossing" and c["minGray"] < 230 for c in components),
            "faintCrossingComponentCountMinGray230To253": sum(c["contact"] == "crossing" and 230 <= c["minGray"] < 254 for c in components),
            "outsideOnlyComponentCountLt254": sum(c["contact"] == "outside-only" for c in components),
            "outsideOnlyComponentCountWithMinGrayLt230": sum(c["contact"] == "outside-only" and c["minGray"] < 230 for c in components),
            "insideOnlyComponentCountLt254": sum(c["contact"] == "inside-only" for c in components),
            "componentsLt254": components,
        }
    any_components = any(edge["componentCountLt254"] for edge in results.values())
    any_crossings = any(edge["crossingComponentCountLt254"] for edge in results.values())
    strong_crossings = any(edge["crossingComponentCountWithMinGrayLt230"] for edge in results.values())
    strong_outside_only = any(edge["outsideOnlyComponentCountWithMinGrayLt230"] for edge in results.values())
    return {
        "edgeStatus": "near-edge-ink-components-present" if any_components else "no-near-edge-component-at-configured-threshold",
        "crossingComponentCandidate": any_crossings,
        "strongCrossingComponentCandidate": strong_crossings,
        "strongOutsideOnlyComponentCandidate": strong_outside_only,
        "semanticReviewStatus": "unresolved-requires-source-review",
        "edges": results,
    }


def render_gray(page, dpi):
    pix = page.get_pixmap(matrix=fitz.Matrix(dpi / 72.0, dpi / 72.0), colorspace=fitz.csGRAY, alpha=False)
    raw = bytes(pix.samples)
    arr = np.frombuffer(raw, dtype=np.uint8).reshape(pix.height, pix.stride)[:, :pix.width]
    # Copy the page array because Pixmap lifetime is deliberately short.
    return pix, arr.copy(), sha256_bytes(raw)


def canonical_geometry_key(usage):
    bounds = usage.get("pdfBounds")
    if not isinstance(bounds, list) or len(bounds) != 4:
        return None
    return (usage.get("book"), usage.get("pdfPage"), tuple(round(float(v), 6) for v in bounds), usage.get("imageSha256"))


def source_page_path(source_dir, book):
    filename = PDF_FILENAMES.get(book)
    return Path(source_dir) / filename if filename else None


def _linked_catalogs(data):
    """Enumerate every live excerpt/verification catalog link in data.json."""
    links = []
    for collection in ("rules", "spells", "equipment", "matrices", "classes", "progressionExplainer"):
        items = ([dict(data[collection], id="progression-explainer")]
                 if collection == "progressionExplainer" and data.get(collection)
                 else data.get(collection, []))
        for item in items:
            if not isinstance(item, dict):
                continue
            for binding in ("sourceExcerpts", "scanVerification"):
                link = item.get(binding)
                if isinstance(link, dict) and isinstance(link.get("catalog"), str) and link["catalog"]:
                    links.append({
                        "collection": collection,
                        "itemId": item.get("id"),
                        "binding": binding,
                        "catalog": link["catalog"],
                    })
    return links


def _usage_identity(row):
    fields = ("collection", "itemId", "binding", "catalog", "regionId", "book",
              "printedPage", "pdfPage", "image", "imageSha256", "sourceHashMatches", "coordinateFrameResolution")
    return tuple(json.dumps(row.get(field), ensure_ascii=False, sort_keys=True, separators=(",", ":")) for field in fields)


def _catalog_region_geometry(region, page=None, coordinate_space=None):
    """Mirror source-visual-audit's normalized/direct bounds selection."""
    normalized = region.get("normalizedPageRect")
    if isinstance(normalized, dict):
        values = [normalized.get("x"), normalized.get("y"),
                  normalized.get("width", normalized.get("w")),
                  normalized.get("height", normalized.get("h"))]
        shape = "object"
    elif isinstance(normalized, list) and len(normalized) == 1 and isinstance(normalized[0], list):
        values, shape = normalized[0], "nested"
    elif isinstance(normalized, list) and len(normalized) == 4:
        values, shape = normalized, "flat"
    else:
        values, shape = None, "none"
    if values is not None:
        try:
            x, y, width, height = map(float, values)
        except (TypeError, ValueError):
            return None, "invalid"
        if (not all(math.isfinite(value) for value in (x, y, width, height))
                or x < 0 or y < 0 or width <= 0 or height <= 0
                or x + width > 1.000002 or y + height > 1.000002):
            return None, "invalid"
        if page is None:
            return [x, y, width, height], shape
        if coordinate_space is not None:
            bounds, status = normalized_rect_to_page_points(region.get("normalizedPageRect"), coordinate_space, page.rect, page.cropbox, page.mediabox)
            return (bounds, shape) if status == "assessable" else (None, status)
        return [round(x * page.rect.width, 4), round(y * page.rect.height, 4),
                round((x + width) * page.rect.width, 4), round((y + height) * page.rect.height, 4)], shape
    bounds = region.get("boundsPdfPoints")
    if not isinstance(bounds, list) or len(bounds) != 4:
        return None, "missing"
    try:
        values = list(map(float, bounds))
    except (TypeError, ValueError):
        return None, "invalid"
    if (not all(math.isfinite(value) for value in values)
            or values[0] < 0 or values[1] < 0 or values[2] <= values[0] or values[3] <= values[1]
            or (page is not None and (values[2] > page.rect.width + 0.002 or values[3] > page.rect.height + 0.002))):
        return None, "invalid"
    return [round(value, 4) for value in values], "boundsPdfPoints"


def _supplemental_region_receipt(catalog, region, catalog_path, source_dir, data_root, declared_pdf_hashes):
    """Validate the closed source-image artifact and keep it out of PDF geometry."""
    identity = supplemental_region_identity(catalog, region)
    if identity is None or not identity.get("valid"):
        raise ValueError(f"invalid supplemental source identity: {region.get('id')}")
    artifact_id = region.get("sourceArtifactId")
    filename = SUPPLEMENTAL_IMAGE_FILENAMES.get(artifact_id) if isinstance(artifact_id, str) else None
    if not filename:
        raise ValueError(f"unknown supplemental source artifact: {artifact_id}")
    source_path = Path(source_dir) / filename
    if not source_path.is_file() or sha256_file(source_path) != identity.get("sourceSha256"):
        raise ValueError(f"supplemental source image SHA mismatch: {artifact_id}")
    canonical_sha = identity.get("canonicalPdfSha256")
    catalog_sha = ((catalog.get("sources") or {}).get(region.get("book")) or {}).get("sha256")
    if canonical_sha != catalog_sha or canonical_sha != declared_pdf_hashes.get(region.get("book")):
        raise ValueError(f"supplemental canonical PDF identity mismatch: {artifact_id}")

    normalized, shape = _catalog_region_geometry(region)
    dimensions, crop = identity.get("sourceDimensionsPx"), identity.get("sourceCropBoundsPx")
    if shape != "object" or normalized is None or not dimensions or not crop:
        raise ValueError(f"supplemental image-coordinate geometry is missing: {region.get('id')}")
    x, y, width, height = normalized
    left, top, right, bottom = crop
    source_width, source_height = dimensions
    expected_rect = (left / source_width, top / source_height,
                     (right - left) / source_width, (bottom - top) / source_height)
    if any(abs(actual - expected) > 0.000002 for actual, expected in zip((x, y, width, height), expected_rect)):
        raise ValueError(f"supplemental image-coordinate bounds mismatch: {region.get('id')}")

    # Catalog paths are relative to dist; resolve the crop alongside its catalog.
    image_path = Path(data_root) / Path(catalog_path).parent / str(region.get("image", ""))
    if not image_path.is_file() or sha256_file(image_path) != region.get("sha256"):
        raise ValueError(f"supplemental published crop SHA mismatch: {region.get('id')}")

    return {
        "sourceKind": "supplemental-image",
        "sourceArtifactId": artifact_id,
        "sourceArtifactSha256": identity.get("sourceSha256"),
        "sourcePdfSha256": canonical_sha,
        "canonicalPdfSha256": canonical_sha,
        "sourceFrameDimensionsPx": dimensions,
        "sourceCropBoundsPx": crop,
        "sourceCoordinateSpace": identity.get("sourceCoordinateSpace"),
        "canonicalPdfContainsPrintedPage": False,
    }


def _historical_source_map_is_sealed(source_map_path):
    """Return the exact seal for a repository historical source-map artifact."""
    path = Path(source_map_path).resolve()
    try:
        relative_path = path.relative_to(ROOT.resolve()).as_posix()
    except ValueError as exc:
        raise ValueError("historical diagnostics require a sealed repository artifact") from exc
    manifest_path = ROOT / "research" / "citation-evidence-seals.json"
    manifest = json.loads(manifest_path.read_text())
    matches = [row for row in manifest.get("seals", []) if row.get("path") == relative_path]
    if len(matches) != 1:
        raise ValueError("historical diagnostics require an exact citation-evidence-seal path")
    actual = sha256_file(path)
    if actual != matches[0].get("sha256"):
        raise ValueError("historical diagnostics source-map bytes differ from their citation evidence seal")
    return {"path": relative_path, "sha256": actual}, json.loads(path.read_bytes())


def reconcile_live_catalog_usage(source_map, data_root, source_map_path, pdfs, source_dir=None,
                                 *, historical_diagnostics=False):
    """Require the hash-bound map to cover the complete live catalog universe."""
    data = json.loads((Path(data_root) / "data.json").read_text())
    links = _linked_catalogs(data)
    expected_catalog_paths = {link["catalog"] for link in links}
    declared_hashes = source_map.get("catalogSha256")
    if not isinstance(declared_hashes, dict):
        raise ValueError("source usage map catalogSha256 must be an object")
    missing_catalogs = sorted(expected_catalog_paths - set(declared_hashes))
    extra_catalogs = sorted(set(declared_hashes) - expected_catalog_paths)
    if missing_catalogs or extra_catalogs:
        raise ValueError(f"source usage map catalog universe mismatch: missing={missing_catalogs[:5]} extra={extra_catalogs[:5]}")

    live_catalog_hashes = {}
    catalog_contents = {}
    for relpath in sorted(expected_catalog_paths):
        path = Path(data_root) / relpath
        if not path.is_file():
            raise ValueError(f"catalog missing: {relpath}")
        observed = sha256_file(path)
        live_catalog_hashes[relpath] = observed
        if observed != declared_hashes[relpath]:
            raise ValueError(f"source usage map is stale: catalog SHA mismatch: {relpath}")
        catalog_contents[relpath] = json.loads(path.read_text())

    expected_snapshot = sha256_bytes(json.dumps(dict(sorted(live_catalog_hashes.items())),
                                                separators=(",", ":"), ensure_ascii=False).encode())
    if source_map.get("catalogSnapshotSha256") != expected_snapshot:
        raise ValueError("source usage map is stale: catalog snapshot SHA mismatch")

    declared_pdf_hashes = source_map.get("sourcePdfSha256")
    if not isinstance(declared_pdf_hashes, dict) or set(declared_pdf_hashes) != set(PDF_FILENAMES):
        raise ValueError("source usage map sourcePdfSha256 must identify all five source PDFs")
    for book, value in declared_pdf_hashes.items():
        if not isinstance(value, str) or len(value) != 64 or any(ch not in "0123456789abcdef" for ch in value):
            raise ValueError(f"source usage map has invalid source identity for {book}")

    # Current validation is selected by trusted repo code/config, never by an
    # input report's optional declaration. Historical bytes require a separate
    # explicit, seal-pinned diagnostics path.
    bridge_enabled = not historical_diagnostics
    bridge = load_registry() if bridge_enabled else None
    historical_seal = None
    if historical_diagnostics:
        historical_seal, sealed_source_map = _historical_source_map_is_sealed(source_map_path)
        if json.dumps(source_map, ensure_ascii=False, sort_keys=True, separators=(",", ":")) != json.dumps(sealed_source_map, ensure_ascii=False, sort_keys=True, separators=(",", ":")):
            raise ValueError("historical diagnostics object differs from its sealed source-map bytes")
    live_registry_validation=None
    if bridge_enabled:
        declaration = source_map.get("sourceFrameCoordinateBridge")
        if not isinstance(declaration, dict):
            raise ValueError("source usage map is missing the active source-frame bridge declaration")
        if declaration.get("path") != REGISTRY_RELATIVE_PATH or declaration.get("sha256") != REGISTRY_SHA256 or declaration.get("status") != "scoped-geometric-provenance-only":
            raise ValueError("source usage map source-frame bridge declaration mismatch")
        live_registry_validation=validate_live_registry(data,data_root,declared_pdf_hashes,None)
        if live_registry_validation.get("status") != "current-pins-match":
            raise ValueError("active source-frame bridge no longer matches current data/catalog pins")
        if declaration.get("registryValidation") != live_registry_validation:
            raise ValueError("source usage map source-frame registry live-pins check is stale")
        if (declaration.get("resolutionCounts") is None
                or not isinstance(declaration.get("resolutionCounts"), dict)):
            raise ValueError("source usage map source-frame bridge resolution counts are missing")
    owner_items = {}
    for collection in ("rules", "spells", "equipment", "matrices", "classes"):
        for item in data.get(collection, []):
            if isinstance(item, dict): owner_items[(collection, item.get("id"))] = item
    if isinstance(data.get("progressionExplainer"), dict):
        item=dict(data["progressionExplainer"], id="progression-explainer")
        owner_items[("progressionExplainer", item["id"])] = item
    expected_usages = []
    geometry_expectations = []
    for link in links:
        catalog = catalog_contents[link["catalog"]]
        regions = catalog.get("regions")
        if not isinstance(regions, list):
            raise ValueError(f"catalog regions must be an array: {link['catalog']}")
        owner_item = owner_items.get((link["collection"], link["itemId"]))
        if owner_item is None or not isinstance(owner_item.get(link["binding"]), dict):
            raise ValueError(f"live source owner is missing: {link['collection']}#{link['itemId']}#{link['binding']}")
        for region in regions:
            if not isinstance(region, dict):
                raise ValueError(f"catalog contains a malformed region: {link['catalog']}")
            book = region.get("book")
            catalog_source = ((catalog.get("sources") or {}).get(book) or {}).get("sha256")
            resolution = {"status":"not-assessable-source-pdf-unavailable","basis":"unassessable"}
            if bridge_enabled and "sourceArtifactId" in region:
                resolution = {"status":"not-applicable-supplemental-image-frame","basis":"unassessable"}
            elif bridge_enabled and isinstance(region.get("pdfPage"), int) and region["pdfPage"] > 0:
                image_path = Path(data_root) / Path(link["catalog"]).parent / str(region.get("image", ""))
                page = pdfs[book][region["pdfPage"]-1] if book in pdfs and region["pdfPage"] <= len(pdfs[book]) else None
                resolution = current_observation(collection=link["collection"], item_id=link["itemId"], binding=link["binding"], catalog_path=link["catalog"], catalog_hash=live_catalog_hashes[link["catalog"]], catalog=catalog, region=region, owner_link=owner_item[link["binding"]], image_path=image_path, book=book, printed_page=region.get("printedPage"), pdf_page=region.get("pdfPage"), source_pdf_sha256=declared_pdf_hashes.get(book), page=page)
            elif bridge_enabled:
                resolution = {"status":"not-assessable-source-page-unavailable","basis":"unassessable"}
            resolution_summary=public_resolution(resolution) if bridge_enabled else None
            expected_row={
                **link,
                "regionId": region.get("id"),
                "book": book,
                "printedPage": region.get("printedPage"),
                "pdfPage": region.get("pdfPage"),
                "image": (Path(link["catalog"]).parent / str(region.get("image", ""))).as_posix(),
                "imageSha256": region.get("sha256"),
                "sourceHashMatches": bool(book in declared_pdf_hashes and catalog_source == declared_pdf_hashes.get(book)),
            }
            if bridge_enabled: expected_row["coordinateFrameResolution"] = resolution_summary
            pinned_bounds = None
            if bridge_enabled and resolution.get("status") == "matched":
                frame, registered_row = bridge["owners"][owner_key(link["collection"], link["itemId"], link["binding"], link["catalog"], region.get("id"))]
                pinned_bounds, pinned_status = normalized_rect_to_page_points(
                    region.get("normalizedPageRect"), frame["coordinateSpace"],
                    frame["pdfBoxesPoints"]["pageRect"], frame["pdfBoxesPoints"]["cropBox"], frame["pdfBoxesPoints"]["mediaBox"])
                if pinned_status != "assessable":
                    raise ValueError(f"registered source-frame geometry is invalid: {link['catalog']}#{region.get('id')}")
            expected_usages.append(expected_row)
            geometry_expectations.append((link["catalog"], region, resolution, pinned_bounds))

    if bridge_enabled:
        expected_resolution_counts = dict(sorted(collections.Counter(
            (row.get("coordinateFrameResolution") or {}).get("status", "unknown")
            for row in expected_usages).items()))
        if source_map["sourceFrameCoordinateBridge"].get("resolutionCounts") != expected_resolution_counts:
            raise ValueError("source usage map source-frame bridge resolution counts are stale")

    actual_usages = source_map.get("usages")
    if not isinstance(actual_usages, list) or any(not isinstance(row, dict) for row in actual_usages):
        raise ValueError("source usage map usages must be an array of objects")
    expected_counts = collections.Counter(_usage_identity(row) for row in expected_usages)
    actual_counts = collections.Counter(_usage_identity(row) for row in actual_usages)
    if actual_counts != expected_counts:
        missing = sum((expected_counts - actual_counts).values())
        excess = sum((actual_counts - expected_counts).values())
        duplicate_excess = sum(max(0, count - expected_counts.get(key, 0)) for key, count in actual_counts.items())
        raise ValueError(f"source usage map live usage multiset mismatch: missing={missing} extra={excess} duplicateExcess={duplicate_excess}")

    # Verify crop coordinates against the live catalog whenever the source page
    # is available. If it is unavailable, the later scan retains an explicit NA.
    actual_by_identity = collections.defaultdict(list)
    for row in actual_usages:
        actual_by_identity[_usage_identity(row)].append(row)
    expected_by_identity = collections.defaultdict(list)
    for expected, (_, region, resolution, pinned_bounds) in zip(expected_usages, geometry_expectations):
        expected_by_identity[_usage_identity(expected)].append((expected, region, resolution, pinned_bounds))
    for identity, expectations in expected_by_identity.items():
        rows = actual_by_identity[identity]
        for row, (expected, region, resolution, pinned_bounds) in zip(rows, expectations):
            book = expected.get("book")
            page_no = expected.get("pdfPage")
            if bridge_enabled and resolution.get("status") == "matched" and row.get("pdfBounds") != pinned_bounds:
                raise ValueError(f"source usage map registered frame bounds mismatch: {expected['catalog']}#{expected['regionId']}")
            if "sourceArtifactId" in region:
                if source_dir is None:
                    raise ValueError(f"supplemental source directory is required: {expected['regionId']}")
                receipt = _supplemental_region_receipt(catalog_contents[expected["catalog"]], region,
                                                       expected["catalog"], source_dir, data_root,
                                                       declared_pdf_hashes)
                if row.get("boundsType") != "object" or row.get("pdfBounds") is not None:
                    raise ValueError(f"supplemental image geometry was mapped into PDF coordinates: {expected['catalog']}#{expected['regionId']}")
                for field, value in receipt.items():
                    if row.get(field) != value:
                        raise ValueError(f"source usage map supplemental identity mismatch: {expected['catalog']}#{expected['regionId']} field={field}")
                if row.get("sourceArtifactHashMatches") is not True or row.get("normalizedImageRectMatches") is not True:
                    raise ValueError(f"source usage map supplemental source validation failed: {expected['catalog']}#{expected['regionId']}")
                if row.get("sourceHashMatches") is not True or row.get("notAssessableReason") != SUPPLEMENTAL_NA_REASON:
                    raise ValueError(f"source usage map supplemental PDF/NA binding mismatch: {expected['catalog']}#{expected['regionId']}")
                continue
            if (row.get("sourceKind") not in (None, "pdf") or row.get("sourceArtifactId") not in (None, "")
                    or row.get("sourceArtifactSha256") not in (None, "")):
                raise ValueError(f"source usage map assigns a supplemental identity to a PDF region: {expected['catalog']}#{expected['regionId']}")
            if book not in pdfs or not isinstance(page_no, int) or not (1 <= page_no <= len(pdfs[book])):
                _, shape = _catalog_region_geometry(region)
                if row.get("boundsType") != shape:
                    raise ValueError(f"source usage map source geometry identity mismatch: {expected['catalog']}#{expected['regionId']}")
                continue
            page = pdfs[book][page_no - 1]
            if bridge_enabled and resolution.get("status") == "matched":
                bounds, shape = _catalog_region_geometry(region, page, resolution.get("basis"))
            elif bridge_enabled and resolution.get("status") == "conflicting-frame-identity":
                bounds, shape = None, "source-frame-mismatch"
            else:
                bounds, shape = _catalog_region_geometry(region, page)
            if row.get("boundsType") != shape or row.get("pdfBounds") != bounds:
                raise ValueError(f"source usage map source bounds mismatch: {expected['catalog']}#{expected['regionId']}")

    return live_catalog_hashes


def _calibration_targets():
    return [
        ("ua-other-007:G1-cont:v2-primary-context", "prefix-cut-positive", None),
        ("ua-other-007:G2:v2-primary-context", "prefix-cut-positive", None),
        ("ua-other-008:H1-main:v2-primary-context", "prefix-cut-positive", None),
        ("ua-other-005:E1-cont:v2-primary-context", "revised-crop-negative-control", [305, 25, 585, 252]),
        ("ua-other-008:H1-cont:v2-primary-context", "revised-crop-negative-control", [305, 25, 590, 270]),
    ]


def scan_calibration(manifest_path, pdfs, dpi, band_px):
    if not manifest_path:
        return {"status": "not-requested"}
    path = Path(manifest_path)
    manifest = json.loads(path.read_text())
    source_pdf_sha = manifest.get("sourcePdfSha256")
    targets = manifest.get("targets") or []
    by_id = {target.get("targetId"): target for target in targets}
    outcomes = []
    frame_cache = {}
    for target_id, expected_role, old_bounds in _calibration_targets():
        target = by_id.get(target_id)
        if not target:
            outcomes.append({"targetId": target_id, "expectedRole": expected_role, "status": "not-assessable-target-missing"})
            continue
        book = target["source"]["book"]
        page_no = target["source"]["pdfPage"]
        pdf_sha = target["source"]["sourcePdfSha256"]
        crop = target["crop"]
        key = (book, page_no)
        if key not in frame_cache:
            page = pdfs[book][page_no - 1]
            pix, gray, frame_sha = render_gray(page, dpi)
            frame_cache[key] = (page, pix, gray, frame_sha)
        page, pix, gray, frame_sha = frame_cache[key]
        bounds_px, bounds_status = rect_to_pixels(crop.get("cropBoundsPdfPagePointsTopLeftLTRB"), page, pix, dpi)
        if pdf_sha != source_pdf_sha or bounds_status != "assessable":
            outcomes.append({"targetId": target_id, "expectedRole": expected_role, "status": "not-assessable-source-or-geometry-mismatch", "sourcePdfSha256": pdf_sha, "manifestSourcePdfSha256": source_pdf_sha, "boundsStatus": bounds_status})
            continue
        pixel_scan = scan_edge_bands(gray, bounds_px, band_px)
        left = pixel_scan["edges"]["left"]
        bottom = pixel_scan["edges"]["bottom"]
        if expected_role == "prefix-cut-positive":
            edge = "left"
            counts = left["outsideInkPixels"]
            inside = left["insideInkPixels"]
            calibrated = counts["lt254"] > 0 and inside["lt254"] > 0
            expected = "faint-ink-on-both-sides-of-left-boundary"
        else:
            edge = "bottom"
            old_px, old_status = rect_to_pixels(old_bounds, page, pix, dpi)
            old_scan = scan_edge_bands(gray, old_px, band_px) if old_status == "assessable" else None
            old_edge = old_scan["edges"][edge] if old_scan else None
            # The revised boundary must avoid the high-contrast source pixels
            # from the specific next table/title that crossed the old bound.
            # Faint scan/grain components below 254 may remain at either edge.
            old_crossed = bool(old_edge and old_edge["outsideInkPixels"]["lt230"] and old_edge["insideInkPixels"]["lt230"])
            revised_has_strong_boundary_ink = bool(bottom["outsideInkPixels"]["lt230"] or bottom["insideInkPixels"]["lt230"])
            calibrated = old_crossed and not revised_has_strong_boundary_ink
            expected = "prior-boundary-has-lt230-ink-on-both-sides; revised-boundary-has-none-in-8px-bands"
        crop_path = Path(crop.get("privateCropPath", ""))
        crop_sha = sha256_file(crop_path) if crop_path.is_file() else None
        outcomes.append({
            "targetId": target_id,
            "expectedRole": expected_role,
            "status": "calibration-expected-observed" if calibrated else "calibration-expectation-failed",
            "expectedPixelPattern": expected,
            "observedBoundaryPixelScan": pixel_scan,
            "priorDefectiveBoundsPdfPagePointsLTRB": old_bounds,
            "priorDefectiveBoundaryScan": old_scan if expected_role != "prefix-cut-positive" else None,
            "sourcePdfSha256": pdf_sha,
            "sourceFrameRawGraySha256": frame_sha,
            "sourceFrameDimensionsPx": [pix.width, pix.height],
            "sourceFrameRenderDpi": dpi,
            "printedPage": target["source"].get("printedPage"),
            "pdfPage": page_no,
            "cropBoundsPdfPagePointsLTRB": crop.get("cropBoundsPdfPagePointsTopLeftLTRB"),
            "cropBoundsPixelsLTRB": bounds_px,
            "candidateCleanCropSha256": crop.get("cropSha256"),
            "candidateCleanCropBytesSha256Observed": crop_sha,
        })
    return {
        "status": "complete" if all(item.get("status") == "calibration-expected-observed" for item in outcomes) else "incomplete-or-failed",
        "manifestPath": str(path),
        "manifestSha256": sha256_file(path),
        "sourcePdfSha256": source_pdf_sha,
        "targetCount": len(outcomes),
        "outcomes": outcomes,
        "limits": ["The three positive cases are private source-crop boundary calibration records; they do not assert any current public catalog binding.", "For each of the two revised-boundary controls, the prior bottom band contains high-contrast (<230) ink on both sides while the revised bottom 8px bands contain no <230 pixels. Fainter components may remain; this is not a semantic or whole-context pass."],
    }


def build_audit(source_map_path, source_dir, data_root, dpi=300, band_px=8, calibration_manifest=None,
                *, historical_diagnostics=False):
    source_map_path = Path(source_map_path).resolve()
    source_dir = Path(source_dir).resolve()
    data_root = Path(data_root).resolve()
    source_map = json.loads(source_map_path.read_text())
    input_data = data_root / "data.json"
    input_data_sha = sha256_file(input_data)
    if input_data_sha != source_map.get("inputDataSha256"):
        raise ValueError("source usage map is stale: dist/data.json SHA does not match")

    declared_pdf_hashes = source_map.get("sourcePdfSha256")
    if not isinstance(declared_pdf_hashes, dict) or set(declared_pdf_hashes) != set(PDF_FILENAMES):
        raise ValueError("source usage map sourcePdfSha256 must identify all five source PDFs")
    pdf_paths = {}
    pdfs = {}
    live_pdf_hashes = {}
    for book, expected in declared_pdf_hashes.items():
        path = source_page_path(source_dir, book)
        if path is None or not path.is_file():
            continue
        observed = sha256_file(path)
        live_pdf_hashes[book] = observed
        if observed != expected:
            raise ValueError(f"source PDF SHA mismatch for {book}")
        pdf_paths[book] = path
        pdfs[book] = fitz.open(path)

    # This exact live-data/catalog reconciliation runs before any source page
    # is rendered. It prevents a stale or hand-edited usage map from shrinking
    # the scan to an empty or partial universe while keeping missing-source and
    # missing-geometry cases explicit downstream NAs.
    live_catalog_hashes = reconcile_live_catalog_usage(
        source_map, data_root, source_map_path, pdfs, source_dir,
        historical_diagnostics=historical_diagnostics)

    usages = source_map.get("usages", [])
    geometry_groups = collections.defaultdict(list)
    not_assessable_uses = []
    verified_image_hashes = {}
    for ordinal, usage in enumerate(usages):
        reason = None
        book = usage.get("book")
        page_no = usage.get("pdfPage")
        if usage.get("sourceKind") == "supplemental-image":
            reason = SUPPLEMENTAL_NA_REASON
            not_assessable_uses.append({
                "usageOrdinal": ordinal,
                "collection": usage.get("collection"),
                "itemId": usage.get("itemId"),
                "binding": usage.get("binding"),
                "catalog": usage.get("catalog"),
                "regionId": usage.get("regionId"),
                "book": book,
                "printedPage": usage.get("printedPage"),
                "pdfPage": None,
                "imageSha256": usage.get("imageSha256"),
                "sourceKind": usage.get("sourceKind"),
                "sourceArtifactId": usage.get("sourceArtifactId"),
                "sourceArtifactSha256": usage.get("sourceArtifactSha256"),
                "sourcePdfSha256": usage.get("sourcePdfSha256"),
                "coordinateFrameResolution": usage.get("coordinateFrameResolution"),
                "notAssessableReason": reason,
                "semanticReviewStatus": "unresolved-requires-source-review",
            })
            continue
        if not usage.get("sourceHashMatches") or book not in pdfs:
            reason = "source-hash-mismatch-or-source-unavailable"
        elif (usage.get("coordinateFrameResolution") or {}).get("status") == "conflicting-frame-identity":
            reason = "source-frame-identity-mismatch"
        elif not isinstance(page_no, int) or page_no < 1 or page_no > len(pdfs[book]):
            reason = "source-page-unavailable"
        elif not usage.get("pdfBounds"):
            reason = "missing-geometry"
        elif usage.get("boundsType") == "invalid":
            reason = "invalid-geometry"
        else:
            imgpath = data_root / usage.get("image", "")
            if not imgpath.is_file():
                reason = "published-image-unavailable"
            else:
                imgkey = (usage.get("catalog"), usage.get("image"))
                if imgkey not in verified_image_hashes:
                    verified_image_hashes[imgkey] = sha256_file(imgpath)
                if verified_image_hashes[imgkey] != usage.get("imageSha256"):
                    reason = "published-image-hash-mismatch"
        if reason:
            not_assessable_uses.append({
                "usageOrdinal": ordinal,
                "collection": usage.get("collection"),
                "itemId": usage.get("itemId"),
                "binding": usage.get("binding"),
                "catalog": usage.get("catalog"),
                "regionId": usage.get("regionId"),
                "book": book,
                "printedPage": usage.get("printedPage"),
                "pdfPage": page_no,
                "imageSha256": usage.get("imageSha256"),
                "coordinateFrameResolution": usage.get("coordinateFrameResolution"),
                "notAssessableReason": reason,
                "semanticReviewStatus": "unresolved-requires-source-review",
            })
            continue
        key = canonical_geometry_key(usage)
        if key is None:
            not_assessable_uses.append({"usageOrdinal": ordinal, "collection": usage.get("collection"), "itemId": usage.get("itemId"), "binding": usage.get("binding"), "catalog": usage.get("catalog"), "regionId": usage.get("regionId"), "book": book, "printedPage": usage.get("printedPage"), "pdfPage": page_no, "imageSha256": usage.get("imageSha256"), "notAssessableReason": "missing-or-malformed-geometry-key", "semanticReviewStatus": "unresolved-requires-source-review"})
            continue
        geometry_groups[key].append((ordinal, usage))

    geometries_by_page = collections.defaultdict(list)
    for key, group in geometry_groups.items():
        geometries_by_page[(key[0], key[1])].append((key, group))

    frame_records = []
    geometry_records = []
    geometry_id_for_key = {}
    assessed_uses = []
    renderer = f"PyMuPDF {fitz.VersionBind}; grayscale page raster; dpi={dpi}; half-up point-to-pixel boundary mapping"

    for book, page_no in sorted(geometries_by_page):
        page = pdfs[book][page_no - 1]
        pix, gray, raw_frame_sha = render_gray(page, dpi)
        frame_records.append({
            "book": book,
            "pdfPage": page_no,
            "pageRectPoints": [round(float(page.rect.x0), 6), round(float(page.rect.y0), 6), round(float(page.rect.x1), 6), round(float(page.rect.y1), 6)],
            "rasterDimensionsPx": [pix.width, pix.height],
            "rasterOriginPx": [pix.x, pix.y],
            "rawGrayRasterSha256": raw_frame_sha,
            "sourcePdfSha256": live_pdf_hashes[book],
            "renderDpi": dpi,
        })
        for key, group in sorted(geometries_by_page[(book, page_no)], key=lambda item: str(item[0])):
            _, _, bounds, image_sha = key
            first = group[0][1]
            bounds_px, bounds_status = rect_to_pixels(list(bounds), page, pix, dpi)
            identity = json.dumps([book, page_no, bounds, image_sha], separators=(",", ":"))
            geometry_id = "raster-edge-" + hashlib.sha256(identity.encode()).hexdigest()[:20]
            geometry_id_for_key[key] = geometry_id
            if bounds_status != "assessable":
                scan = {"edgeStatus": "not-assessable", "notAssessableReason": bounds_status, "semanticReviewStatus": "unresolved-requires-source-review", "edges": {}}
            else:
                scan = scan_edge_bands(gray, bounds_px, band_px)
            geometry = {
                "geometryId": geometry_id,
                "book": book,
                "printedPage": first.get("printedPage"),
                "pdfPage": page_no,
                "sourcePdfSha256": live_pdf_hashes[book],
                "sourceFrameRawGraySha256": raw_frame_sha,
                "sourceFrameDimensionsPx": [pix.width, pix.height],
                "renderDpi": dpi,
                "imageSha256": image_sha,
                "coordinateFrameResolution": first.get("coordinateFrameResolution") or {"status":"unknown-frame","basis":"unassessable"},
                "boundsPdfPagePointsLTRB": list(bounds),
                "boundsRasterPixelsLTRB": bounds_px,
                "pixelMapping": "page-relative point coordinate multiplied by dpi/72, round-half-up; half-open raster bounds",
                "edgeBandWidthPx": band_px,
                "scan": scan,
                "uses": [{
                    "usageOrdinal": ordinal,
                    "collection": usage.get("collection"),
                    "itemId": usage.get("itemId"),
                    "binding": usage.get("binding"),
                    "catalog": usage.get("catalog"),
                    "regionId": usage.get("regionId"),
                } for ordinal, usage in group],
            }
            geometry_records.append(geometry)
            for ordinal, usage in group:
                assessed_uses.append({
                    "usageOrdinal": ordinal,
                    "collection": usage.get("collection"),
                    "itemId": usage.get("itemId"),
                    "binding": usage.get("binding"),
                    "catalog": usage.get("catalog"),
                    "regionId": usage.get("regionId"),
                    "book": usage.get("book"),
                    "printedPage": usage.get("printedPage"),
                    "pdfPage": usage.get("pdfPage"),
                    "imageSha256": usage.get("imageSha256"),
                    "coordinateFrameResolution": usage.get("coordinateFrameResolution"),
                    "geometryId": geometry_id,
                    "priorWordboxCandidate": usage.get("cropEdgeAssessment") == "candidate-text-box-crossing",
                    "rasterPixelCandidateStatus": scan.get("edgeStatus"),
                    "strongCrossingComponentCandidate": scan.get("strongCrossingComponentCandidate", False),
                    "strongOutsideOnlyComponentCandidate": scan.get("strongOutsideOnlyComponentCandidate", False),
                    "semanticReviewStatus": "unresolved-requires-source-review",
                })

    calibration = scan_calibration(calibration_manifest, pdfs, dpi, band_px)
    if calibration.get("status") == "incomplete-or-failed":
        # Keep the measured failures in the output for diagnosis; a failed
        # calibration prevents publication of a current raster baseline.
        raise ValueError("raster-boundary calibration failed; inspect calibration output from --calibration-report")

    # Re-check every raw input before writing: shared workspace changes during
    # the source render must not be silently mixed into one purported baseline.
    if sha256_file(input_data) != input_data_sha:
        raise ValueError("dist/data.json changed during raster scan")
    for relpath, expected in live_catalog_hashes.items():
        if sha256_file(data_root / relpath) != expected:
            raise ValueError(f"catalog changed during raster scan: {relpath}")
    for book, expected in live_pdf_hashes.items():
        if sha256_file(pdf_paths[book]) != expected:
            raise ValueError(f"source PDF changed during raster scan: {book}")

    total_uses = len(usages)
    unique_images = len({u.get("imageSha256") for u in usages})
    unique_pages = len({(u.get("book"), u.get("pdfPage")) for u in usages if u.get("book") and u.get("pdfPage")})
    uses_by_book = collections.Counter(u.get("book") for u in usages)
    geometry_by_book = collections.Counter(g.get("book") for g in geometry_records)
    pages_by_book = collections.Counter(frame.get("book") for frame in frame_records)
    geometry_status_counts = collections.Counter(g["scan"].get("edgeStatus") for g in geometry_records)
    pixel_candidate_count = sum(g["scan"].get("crossingComponentCandidate", False) for g in geometry_records)
    strong_crossing_count = sum(g["scan"].get("strongCrossingComponentCandidate", False) for g in geometry_records)
    strong_outside_only_count = sum(g["scan"].get("strongOutsideOnlyComponentCandidate", False) for g in geometry_records)
    faint_only_crossing_count = sum(
        not g["scan"].get("strongCrossingComponentCandidate", False)
        and any(edge.get("faintCrossingComponentCountMinGray230To253", 0) for edge in g["scan"].get("edges", {}).values())
        for g in geometry_records
    )
    all_candidate_component_count = sum(sum(edge.get("componentCountLt254", 0) for edge in g["scan"].get("edges", {}).values()) for g in geometry_records)
    coordinate_frame_status_counts=collections.Counter(
        (usage.get("coordinateFrameResolution") or {}).get("status", "unregistered-legacy-usage") for usage in usages)
    output = {
        "artifactType": "Complete numeric source-raster crop-boundary candidate inventory",
        "sourceFrameCoordinateBridge": ({"path":REGISTRY_RELATIVE_PATH,"sha256":REGISTRY_SHA256,"status":"scoped-geometric-provenance-only","resolutionCounts":dict(sorted(coordinate_frame_status_counts.items())),"registryValidation":(source_map.get("sourceFrameCoordinateBridge") or {}).get("registryValidation")} if source_map.get("sourceFrameCoordinateBridge") else {"status":"not-present-in-source-usage-map; historical/legacy projections do not establish a typed source-frame basis"}),
        "runMode": ({"status":"historical-sealed-diagnostics-only","sourceMapSeal":_historical_source_map_is_sealed(source_map_path)[0]} if historical_diagnostics else {"status":"current-active-bridge-required"}),
        "schemaVersion": 1,
        "status": "complete-structural-inventory-semantic-review-unresolved",
        "scope": "Every current sourceExcerpts and scanVerification catalog use in the bound usage map. For each assessable use, verify the published PNG hash, then scan an 8px native source-raster band on each side of its declared crop boundary. This is not a pixel replay/comparison of each published PNG against its source crop. Raster candidates are numeric components near crop edges; no candidate/no ink is not proof of completeness, contextual adequacy, reading correctness, or absence of source defects.",
        "inputs": {
            "sourceUsageMapPath": str(source_map_path),
            "sourceUsageMapSha256": sha256_file(source_map_path),
            "distDataSha256": input_data_sha,
            "catalogSnapshotSha256": source_map.get("catalogSnapshotSha256"),
            "catalogCount": len(live_catalog_hashes),
            "sourcePdfSha256": live_pdf_hashes,
        },
        "render": {"engine": renderer, "dpi": dpi, "edgeBandWidthPx": band_px, "thresholdsExclusive": list(THRESHOLDS), "componentConnectivity": "8-connected at grayscale <254", "componentCoordinates": "full-page raster LTRB half-open"},
        "counts": {
            "regionUsages": total_uses,
            "uniqueImages": unique_images,
            "uniqueImageGeometryBindings": len(geometry_records),
            "uniqueSourcePages": unique_pages,
            "sourcePagesRendered": len(frame_records),
            "sourcePagesRenderedByBook": dict(sorted(pages_by_book.items())),
            "geometriesByBook": dict(sorted(geometry_by_book.items())),
            "regionUsagesByBook": dict(sorted(uses_by_book.items())),
            "notAssessableUsages": len(not_assessable_uses),
            "assessedUsages": len(assessed_uses),
            "geometryStatusCounts": dict(sorted(geometry_status_counts.items())),
            "geometriesWithBoundaryCrossingComponentCandidate": pixel_candidate_count,
            "geometriesWithStrongCrossingComponentCandidateMinGrayLt230": strong_crossing_count,
            "geometriesWithStrongOutsideOnlyComponentCandidateMinGrayLt230": strong_outside_only_count,
            "geometriesWithFaintOnlyCrossingComponentCandidateMinGray230To253": faint_only_crossing_count,
            "componentsLt254AcrossFourEdges": all_candidate_component_count,
            "priorWordboxCandidateUsages": sum(u["priorWordboxCandidate"] for u in assessed_uses),
            "candidateMetricNote": "Strong crossing, strong outside-only, and faint-only crossing counts overlap by geometry and are not defect rates or mutually exclusive categories. Component counts are per crop edge; corner components can be counted on two adjacent edges.",
        },
        "assessmentPolicy": {
            "near-edge-ink-components-present": "Candidate only; inspect authorized source pixels and the published crop. Components can be rules, page artifacts, unrelated neighboring text, or clipped glyphs.",
            "no-near-edge-component-at-configured-threshold": "Not a semantic pass; no connected component under the selected threshold was found in the configured edge bands.",
            "not-assessable": "Missing/malformed bounds, mismatched source/image hashes, missing source pages or geometry outside the raster are explicit NA states.",
            "semanticReview": "All uses remain unresolved for source readability, full table/passage completeness, units, notes, continuations, row identity and relevance. No OCR or text payload is emitted.",
            "publishedPngPixelReplay": "Not performed by this script; PNG SHA-256 is checked against the bound usage map. Crop rendering/comparison must be separately verified.",
        },
        "calibration": calibration,
        "sourceFrames": frame_records,
        "geometries": geometry_records,
        "usages": assessed_uses,
        "notAssessableUsages": not_assessable_uses,
    }
    return output


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", required=True, help="Directory with the original five PDFs")
    parser.add_argument("--source-usage-map", required=True, help="Hash-bound JSON from research/source-visual-audit.py")
    parser.add_argument("--data-root", type=Path, default=DEFAULT_DIST, help="Current dist directory; defaults to repository dist")
    parser.add_argument("--dpi", type=int, default=300)
    parser.add_argument("--band-px", type=int, default=8)
    parser.add_argument("--calibration-manifest", help="Optional private context manifest for the three prefix-cut positives and two revised-boundary negative controls")
    parser.add_argument("--calibration-report", type=Path, help="Optional plain numeric JSON copy of calibration results when calibration fails")
    parser.add_argument("--output", type=Path, required=True, help="Write a numeric JSON.GZ snapshot to a new path")
    parser.add_argument("--historical-diagnostics", action="store_true", help="Explicitly inspect a citation-sealed historical source map; output is diagnostic-only and cannot pass current coverage checks")
    args = parser.parse_args(argv)
    if args.dpi < 72 or args.dpi > 600:
        parser.error("--dpi must be in [72,600]")
    if args.band_px < 1 or args.band_px > 64:
        parser.error("--band-px must be in [1,64]")
    output_path = args.output.resolve()
    if output_path.exists():
        parser.error(f"--output already exists; choose a new immutable path: {output_path}")
    try:
        report = build_audit(args.source_usage_map, args.source_dir, args.data_root, args.dpi, args.band_px, args.calibration_manifest,
                             historical_diagnostics=args.historical_diagnostics)
    except Exception as exc:
        if args.calibration_report and args.calibration_manifest:
            # Safe metadata-only diagnostic: do not attach page pixels or text.
            try:
                source_map = json.loads(Path(args.source_usage_map).read_text())
                pdfs = {book: fitz.open(source_page_path(args.source_dir, book)) for book in source_map.get("sourcePdfSha256", {}) if source_page_path(args.source_dir, book) and source_page_path(args.source_dir, book).is_file()}
                calibration = scan_calibration(args.calibration_manifest, pdfs, args.dpi, args.band_px)
                args.calibration_report.parent.mkdir(parents=True, exist_ok=True)
                args.calibration_report.write_text(json.dumps(calibration, indent=2) + "\n")
            except Exception:
                pass
        raise SystemExit(f"source raster boundary audit failed: {exc}")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    raw = (json.dumps(report, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    # Deterministic gzip: fixed mtime and no source-name field.
    try:
        file = output_path.open("xb")
    except FileExistsError:
        raise SystemExit(f"source raster boundary audit failed: output already exists: {output_path}")
    with file:
        with gzip.GzipFile(filename="", mode="wb", fileobj=file, mtime=0, compresslevel=9) as gz:
            gz.write(raw)
    print(json.dumps({"output": str(output_path), "sha256": sha256_file(output_path), "uncompressedBytes": len(raw), "counts": report["counts"], "calibration": report["calibration"].get("status")}, indent=2))


if __name__ == "__main__":
    main()
