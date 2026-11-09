#!/usr/bin/env python3
"""Bounded exact-template search for rows unresolved by the pinned v5 replay.

The tool does not write catalog coordinates or approval flags. It inventories the
v5-unresolved rows, searches exact RGB target crops inside current full-page
renders for previously tested renderer/DPI pairs, and adds a finite DPI window
derived from target pixel dimensions only for the 19 rows with no v5 pixel trial.
Full-page rasters exist only in v5 Replay's private temporary cache.
"""
from __future__ import annotations

import argparse
import collections
import hashlib
import importlib.util
import json
import math
from pathlib import Path

import fitz
from PIL import Image

INPUT_COMMIT = "6d330af372ac809d11ed6029ed8695d0d8dc0909"
INPUT_DATA_SHA256 = "ceb7c8b9a8fe32b676e57c8d007f124a4490684d54558479e555d504075ba4f3"
V5_TOOL_SHA256 = "bcd0b251fc741af873d271a763f3d622c1980fe6f422b0472ecfc35d1f7919cb"
V5_PRIVATE_REPORT_SHA256 = "f5a0a2ba7c4328bcc3ff8bb6d2a7c77881417bcd9f50593285352783c20998c3"
V5_REVIEW_SHA256 = "460043606777463c843fa629870fdfe5349498ddc1e8125e56087ec57f41ef6a"
V5_RECEIPT_SHA256 = "1742a5790d7b59c660c22813360b35c2469dd520c3866f887015d754fccce54d"
V4_TOOL_SHA256 = "2dee3572eb989c63ef1a441949f41e54ddb8c8bf1a469372c68e37869316da0e"
V4_REVIEW_SHA256 = "4cabaf20c3d800814823a945abe0c03da9e799b1f229c1e67451008e3e97f539"
V1_TOOL_SHA256 = "27ad7dfd1b12de1fb5ad2843f2a1b8bae2f9d5193768843a2d576d98a30c0cf0"
V1_REPORT_SHA256 = "8747f5ad0100ad3337f0e8240687e5eb4bcea5404237f3ac36dbc1e684198b11"
V2_TOOL_SHA256 = "896d54418af2bc3c2e381111d5fb8cfabd08c366e243b23f50030b7c0c0fcc6b"
V2_PRIVATE_REPORT_SHA256 = "186cd7864cc32f4228ecd4820cf87e9abe8367cf33227e5e55d474cb40de1cbb"
V2_PUBLIC_REPORT_SHA256 = "1b242d7da3ad3be9eb667b177abc7db7173ba1fc552f78c4eb9de84c446dd9a2"
SCALE_DPI_RADIUS = 2
MAX_DPI = 432


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def file_sha(path: Path) -> str:
    return sha256(path.read_bytes())


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def load_v5_tool(path: Path):
    spec = importlib.util.spec_from_file_location("source_frame_universe_v5_for_v6", path)
    require(spec is not None and spec.loader is not None, "could not load pinned v5 helper")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def normalized_scale_dpis(page: fitz.Page, rect: list[float], target_size: tuple[int, int]) -> dict:
    """A narrow per-axis DPI window derived from the declared rect and actual crop size."""
    x, y, w, h = rect
    estimates = {
        "width": target_size[0] * 72 / (w * page.rect.width),
        "height": target_size[1] * 72 / (h * page.rect.height),
    }
    candidates = sorted({
        dpi
        for estimate in estimates.values()
        for dpi in range(round(estimate) - SCALE_DPI_RADIUS, round(estimate) + SCALE_DPI_RADIUS + 1)
        if 36 <= dpi <= MAX_DPI
    })
    return {"perAxisDpiEstimates": estimates, "candidateDpis": candidates, "candidateRule": f"integer DPI within ±{SCALE_DPI_RADIUS} of either measured target-size/page-rect estimate; capped at {MAX_DPI}"}


def fullpage_projected_edges(page: fitz.Page, rect: list[float], size: tuple[int, int], dpi: int, renderer: str) -> list[float]:
    """Record the normalized-rect projection for comparison; never use it to alter a target."""
    if renderer == "poppler-pdftoppm":
        fullw = math.ceil(page.rect.width * dpi / 72)
        fullh = math.ceil(page.rect.height * dpi / 72)
    else:
        # PyMuPDF's actual full raster dimensions are recorded separately. The page
        # rectangle projection is given in points so the raster size need not be guessed.
        fullw = page.rect.width * dpi / 72
        fullh = page.rect.height * dpi / 72
    x, y, w, h = rect
    return [x * fullw, y * fullh, (x + w) * fullw, (y + h) * fullh]


def _anchor_row(target_rgb: bytes, width: int, height: int) -> tuple[int, bytes]:
    ranked = []
    row_bytes = width * 3
    for y in range(height):
        row = target_rgb[y * row_bytes:(y + 1) * row_bytes]
        distinct = len(set(zip(row[0::3], row[1::3], row[2::3])))
        transitions = sum(row[i:i + 3] != row[i - 3:i] for i in range(3, len(row), 3))
        ranked.append((distinct + transitions, y, row))
    _, y, row = max(ranked, default=(0, 0, b""))
    return y, row


def exact_template_positions(full_page: Image.Image, target: Image.Image, max_positions: int = 200) -> dict:
    """Find byte-exact RGB subimages without resizing, registration or tolerances."""
    full = full_page.convert("RGB")
    crop = target.convert("RGB")
    fw, fh = full.size
    tw, th = crop.size
    if tw > fw or th > fh:
        return {"exactRgbTemplateFound": False, "matches": [], "matchCount": 0, "matchesTruncated": False, "reason": "target-exceeds-full-page-dimensions"}
    full_rgb, target_rgb = full.tobytes(), crop.tobytes()
    full_row_bytes, target_row_bytes = fw * 3, tw * 3
    anchor_y, anchor = _anchor_row(target_rgb, tw, th)
    positions = []
    for top_y in range(fh - th + 1):
        # The anchor is an informative row inside the target, not necessarily
        # its first row. Search at top_y + anchor_y, then verify from top_y.
        anchor_source_y = top_y + anchor_y
        row = full_rgb[anchor_source_y * full_row_bytes:(anchor_source_y + 1) * full_row_bytes]
        offset = row.find(anchor)
        while offset >= 0:
            if offset % 3 == 0:
                source_x = offset // 3
                if source_x + tw <= fw:
                    exact = True
                    for y in range(th):
                        source_start = (top_y + y) * full_row_bytes + source_x * 3
                        target_start = y * target_row_bytes
                        if full_rgb[source_start:source_start + target_row_bytes] != target_rgb[target_start:target_start + target_row_bytes]:
                            exact = False
                            break
                    if exact:
                        positions.append([source_x, top_y])
                        if len(positions) >= max_positions:
                            return {"exactRgbTemplateFound": True, "matches": positions, "matchCount": len(positions), "matchesTruncated": True, "anchorRow": anchor_y}
            offset = row.find(anchor, offset + 1)
    return {"exactRgbTemplateFound": bool(positions), "matches": positions, "matchCount": len(positions), "matchesTruncated": False, "anchorRow": anchor_y}


def matrix_values(matrix) -> list[float]:
    return [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f]


def rect_values(rect) -> list[float]:
    return [rect.x0, rect.y0, rect.x1, rect.y1]


def point_values(point) -> list[float]:
    return [point.x, point.y]


def renderer_for_recipe(recipe: dict) -> str | None:
    if recipe.get("renderer") in ("pymupdf", "poppler-pdftoppm"):
        return recipe["renderer"]
    kind = str(recipe.get("type", ""))
    if "poppler" in kind:
        return "poppler-pdftoppm"
    if "pymupdf" in kind or kind in ("sourcePixelFrame-pymupdf-page-crop", "cropRecipe-pymupdf-page-crop"):
        return "pymupdf"
    return None


def geometry_key(row: dict) -> str:
    value = [row["book"], row["pdfPage"], row["imageSha256"], row["normalizedPageRectSchemaStatus"],
             row["declarations"].get("normalizedPageRect"), row["imageDimensions"]]
    return sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode("utf-8"))


def run(args: argparse.Namespace) -> dict:
    repo, sources = args.repo.resolve(), args.sources.resolve()
    v5_tool_path = repo / "tools/source-frame-universe-v5.py"
    v5_review_path = repo / "research/source-audit-pass8-independent-frame-v5-review.json"
    v5_receipt_path = repo / "research/source-audit-pass8-frame-universe-v5.json"
    v4_tool_path = repo / "tools/source-frame-universe-v4.py"
    v4_review_path = repo / "research/source-audit-pass8-independent-frame-v4-review.json"
    v1_tool = args.v1_tool.resolve()
    v1_report = args.v1_report.resolve()
    v2_tool = args.v2_tool.resolve()
    v2_report = args.v2_report.resolve()
    v2_public = args.v2_public_report.resolve()
    v5_report = args.v5_report.resolve()
    require(file_sha(v5_tool_path) == V5_TOOL_SHA256, "v5 tool pin changed")
    require(file_sha(v5_review_path) == V5_REVIEW_SHA256, "independent v5 review pin changed")
    require(file_sha(v5_receipt_path) == V5_RECEIPT_SHA256, "v5 public receipt pin changed")
    require(file_sha(v4_tool_path) == V4_TOOL_SHA256 and file_sha(v4_review_path) == V4_REVIEW_SHA256, "v4 evidence pin changed")
    require(file_sha(v1_tool) == V1_TOOL_SHA256 and file_sha(v1_report) == V1_REPORT_SHA256, "v1 evidence pin changed")
    require(file_sha(v2_tool) == V2_TOOL_SHA256 and file_sha(v2_report) == V2_PRIVATE_REPORT_SHA256 and file_sha(v2_public) == V2_PUBLIC_REPORT_SHA256, "v2 evidence pin changed")
    require(file_sha(v5_report) == V5_PRIVATE_REPORT_SHA256, "v5 private report pin changed")
    current_commit = __import__("subprocess").check_output(["git", "rev-parse", "HEAD"], cwd=repo, text=True).strip()
    data_path = repo / "dist/data.json"
    require(current_commit == INPUT_COMMIT and file_sha(data_path) == INPUT_DATA_SHA256, "pinned data/commit changed")
    v5_data = json.loads(v5_report.read_text())
    require(v5_data["input"]["v5ToolSha256"] == V5_TOOL_SHA256 and v5_data["denominators"]["currentRegionRows"] == 3396, "v5 replay input mismatch")
    v5 = load_v5_tool(v5_tool_path)

    docs, source_files = {}, {}
    for book, (filename, expected_sha) in v5.SOURCE_HASHES.items():
        path = sources / filename
        actual = file_sha(path)
        require(actual == expected_sha, f"source PDF identity mismatch: {book}")
        docs[book] = fitz.open(path)
        source_files[book] = {"filename": filename, "sha256": actual}

    rows = [r for r in v5_data["records"] if not r["frameStatus"].startswith("exact-")]
    require(len(rows) == 151, f"v5 unresolved row count drift: {len(rows)}")
    identity_bad = [r["regionId"] for r in rows if not r["sourceIdentityMatches"] or not r["imageHashMatches"] or not r["imageDimensionsMatch"]]
    require(not identity_bad, f"source/image identity not verified for unresolved rows: {len(identity_bad)}")

    catalog_cache = {}
    groups = {}
    for row in rows:
        key = geometry_key(row)
        entry = groups.setdefault(key, {"geometryKey": key, "rowReferences": [], "v5PixelComparisonCount": 0,
                                        "v5DirectRecipes": [], "v5FullPageRecipes": [], "candidateRenders": {}})
        catalog = catalog_cache.get(row["catalog"])
        if catalog is None:
            catalog = json.loads((repo / "dist" / row["catalog"]).read_text())
            catalog_cache[row["catalog"]] = catalog
        region = next(r for r in catalog["regions"] if r["id"] == row["regionId"])
        target_path = repo / "dist" / Path(row["catalog"]).parent / region["image"]
        target_bytes = target_path.read_bytes()
        require(sha256(target_bytes) == row["imageSha256"], f"current target image changed: {row['regionId']}")
        target = Image.open(target_path).convert("RGB")
        require(list(target.size) == row["imageDimensions"], f"current target dimensions changed: {row['regionId']}")
        entry["rowReferences"].append({"catalog": row["catalog"], "regionId": row["regionId"], "imagePath": region["image"],
                                       "ownerUses": [{"collection": x["collection"], "itemId": x["itemId"], "binding": x["binding"]} for x in row["ownerUses"]]})
        entry["v5PixelComparisonCount"] = max(entry["v5PixelComparisonCount"], row["pixelComparisonCount"])
        entry["v5DirectRecipes"] = row["directRecipes"]
        entry["v5FullPageRecipes"] = row["fullPageRecipes"]
        entry.update({"book": row["book"], "printedPage": row["printedPage"], "pdfPage": row["pdfPage"],
                      "sourceSha256": row["expectedSourceSha256"], "imageSha256": row["imageSha256"],
                      "imageDimensions": row["imageDimensions"], "normalizedPageRectSchemaStatus": row["normalizedPageRectSchemaStatus"],
                      "rawDeclarations": row["declarations"], "v5FrameStatus": row["frameStatus"],
                      "targetImage": target})

    # Page metadata is collected before any candidate rendering, for all 56 cases.
    page_metadata = {}
    for entry in groups.values():
        book, pdf_page = entry["book"], entry["pdfPage"]
        key = (book, pdf_page)
        if key not in page_metadata:
            page = docs[book][pdf_page - 1]
            page_metadata[key] = {
                "book": book, "pdfOrdinal": pdf_page, "rotationDegrees": page.rotation,
                "visiblePageRectPoints": rect_values(page.rect), "cropBoxPoints": rect_values(page.cropbox),
                "mediaBoxPoints": rect_values(page.mediabox), "cropBoxPositionPoints": point_values(page.cropbox_position),
                "pdfToMuPdfTransformationMatrix": matrix_values(page.transformation_matrix),
                "pageRotationMatrix": matrix_values(page.rotation_matrix),
                "pageDerotationMatrix": matrix_values(page.derotation_matrix),
            }
        entry["pageGeometry"] = page_metadata[key]

    # Candidate render configurations. Pixel-tested v5 rows reuse only their actual
    # tested renderer/DPI pairs. The 19 zero-comparison rows get a narrow DPI window
    # inferred from target dimensions and their parsed normalized rectangle.
    render_to_groups: dict[tuple[str, int, str, int], dict] = {}
    for key, entry in groups.items():
        book, pdf_page = entry["book"], entry["pdfPage"]
        page = docs[book][pdf_page - 1]
        norm = v5.normalized(entry["rawDeclarations"].get("normalizedPageRect"))
        require(norm is not None, f"unresolved case lacks supported normalized coordinates: {key}")
        entry["normalizedCandidateValues"] = norm
        entry["normalizedPageRectDpiScaleWindow"] = None

        def add(renderer: str, dpi: int, reason: str):
            require(renderer in ("pymupdf", "poppler-pdftoppm"), f"unsupported candidate renderer {renderer}")
            rk = (book, pdf_page, renderer, dpi)
            rec = render_to_groups.setdefault(rk, {"candidateKey": f"{book}:{pdf_page}:{renderer}:{dpi}", "book": book,
                                                      "pdfOrdinal": pdf_page, "renderer": renderer, "dpi": dpi,
                                                      "geometryKeys": [], "candidateReasons": []})
            if key not in rec["geometryKeys"]:
                rec["geometryKeys"].append(key)
            if reason not in rec["candidateReasons"]:
                rec["candidateReasons"].append(reason)
            per_group = entry["candidateRenders"].setdefault(rec["candidateKey"], {"renderer": renderer, "dpi": dpi,
                                                                                     "candidateReasons": []})
            if reason not in per_group["candidateReasons"]:
                per_group["candidateReasons"].append(reason)

        if entry["v5PixelComparisonCount"] > 0:
            for rowref in entry["rowReferences"]:
                v5row = next(r for r in rows if r["catalog"] == rowref["catalog"] and r["regionId"] == rowref["regionId"])
                for recipe in v5row["directRecipes"]:
                    for trial in recipe.get("trials", []):
                        add("pymupdf", trial["dpi"], "same-page/renderer/DPI as an actual v5 direct pixel trial")
                for recipe in v5row["fullPageRecipes"]:
                    renderer = renderer_for_recipe(recipe)
                    dpi = recipe.get("dpi")
                    if renderer and isinstance(dpi, int):
                        add(renderer, dpi, "same-page/renderer/DPI as an actual v5 full-page pixel trial")
        else:
            scale = normalized_scale_dpis(page, norm, tuple(entry["imageDimensions"]))
            entry["normalizedPageRectDpiScaleWindow"] = scale
            for dpi in scale["candidateDpis"]:
                add("pymupdf", dpi, "dimension-derived exact-template candidate for v5 zero-pixel-comparison row")
                add("poppler-pdftoppm", dpi, "dimension-derived exact-template candidate for v5 zero-pixel-comparison row")

    source_docs_for_replay = dict(docs)
    replay = v5.Replay(sources, source_docs_for_replay, "RGB", args.render_cache_dir)
    render_records = []
    try:
        for index, (render_key, candidate) in enumerate(sorted(render_to_groups.items()), 1):
            book, pdf_page, renderer, dpi = render_key
            page = docs[book][pdf_page - 1]
            try:
                full = replay.full_page(book, pdf_page, dpi, renderer)
                full_rgb_sha = sha256(full.tobytes())
                rv = f"PyMuPDF {fitz.VersionBind}" if renderer == "pymupdf" else replay.poppler_version
                recipe_result = {
                    **candidate,
                    "rendererVersion": rv,
                    "fullPageDimensions": list(full.size),
                    "fullPageRawRgbSha256": full_rgb_sha,
                    "templateResults": [],
                    "renderError": None,
                }
                for geometry_key_value in candidate["geometryKeys"]:
                    entry = groups[geometry_key_value]
                    target = entry["targetImage"]
                    match = exact_template_positions(full, target)
                    norm = entry["normalizedCandidateValues"]
                    projected = fullpage_projected_edges(page, norm, tuple(entry["imageDimensions"]), dpi, renderer)
                    matches = []
                    for x, y in match["matches"]:
                        l, t, r, b = x, y, x + target.width, y + target.height
                        matches.append({"pixelLTRBFullPage": [l, t, r, b],
                                        "normalizedRectProjectedEdges": projected,
                                        "deltaPixelsFromNormalizedProjectionLTRB": [l - projected[0], t - projected[1], r - projected[2], b - projected[3]],
                                        "candidateNormalizedLTRBFullPage": [l / full.width, t / full.height, r / full.width, b / full.height],
                                        "exactCropRawRgbSha256": sha256(target.tobytes())})
                    recipe_result["templateResults"].append({"geometryKey": geometry_key_value,
                                                               "targetImageSha256": entry["imageSha256"],
                                                               "targetDimensions": entry["imageDimensions"],
                                                               "exactRgbTemplateFound": match["exactRgbTemplateFound"],
                                                               "matchCount": match["matchCount"],
                                                               "matchesTruncated": match["matchesTruncated"],
                                                               "anchorRow": match.get("anchorRow"),
                                                               "matches": matches,
                                                               "noMatchReason": match.get("reason")})
                render_records.append(recipe_result)
            except Exception as exc:
                render_records.append({**candidate, "rendererVersion": None, "fullPageDimensions": None,
                                       "fullPageRawRgbSha256": None, "templateResults": [],
                                       "renderError": f"{type(exc).__name__}: {exc}"})
            if index % 10 == 0 or index == len(render_to_groups):
                print(f"candidatePageRenders={index}/{len(render_to_groups)} geometries={len(groups)}", flush=True)
    finally:
        replay.cleanup()

    render_by_geometry = collections.defaultdict(list)
    for render in render_records:
        for item in render.get("templateResults", []):
            render_by_geometry[item["geometryKey"]].append({
                "candidateKey": render["candidateKey"], "renderer": render["renderer"], "dpi": render["dpi"],
                "rendererVersion": render["rendererVersion"], "fullPageDimensions": render["fullPageDimensions"],
                "fullPageRawRgbSha256": render["fullPageRawRgbSha256"], "candidateReasons": render["candidateReasons"],
                **item,
            })

    outcome_counts = collections.Counter()
    for key, entry in groups.items():
        attempts = render_by_geometry.get(key, [])
        matches = [attempt for attempt in attempts if attempt["exactRgbTemplateFound"]]
        positions = {(attempt["renderer"], attempt["dpi"], tuple(match["pixelLTRBFullPage"]))
                     for attempt in matches for match in attempt["matches"]}
        if len(positions) == 1:
            status = "exact-full-page-template-found-one-rendered-position"
        elif positions:
            status = "exact-full-page-template-found-multiple-rendered-positions"
        elif attempts:
            status = "no-exact-template-match-in-bounded-render-set"
        else:
            status = "no-candidate-renders-eligible"
        entry["candidateSearch"] = {
            "renderAttempts": attempts,
            "exactTemplateRenderAttempts": sum(bool(x["exactRgbTemplateFound"]) for x in attempts),
            "exactRenderedPositions": [{"renderer": r, "dpi": dpi, "pixelLTRBFullPage": list(box)} for r, dpi, box in sorted(positions)],
            "status": status,
            "testedRenderCount": len(attempts),
            "failedExactTemplateRenderCount": sum(not x["exactRgbTemplateFound"] for x in attempts),
            "renderErrorCount": sum(x.get("fullPageDimensions") is None for x in attempts),
        }
        outcome_counts[status] += 1
        entry.pop("targetImage", None)
    records = sorted(groups.values(), key=lambda x: (x["book"], x["pdfPage"], x["imageSha256"], x["geometryKey"]))
    require(sum(len(x["rowReferences"]) for x in records) == 151, "candidate inventory row refs drift")
    require(len(records) == 56, f"unique image/geometry inventory drift: {len(records)}")
    require(sum(x["v5PixelComparisonCount"] == 0 for x in records) == 10, "no-comparison unique geometry count drift")

    tool_hash = file_sha(Path(__file__).resolve())
    output = {
        "schemaVersion": 6,
        "artifactType": "private bounded exact full-page template search for unresolved current source frames",
        "input": {"commit": current_commit, "rawDataSha256": file_sha(data_path),
                  "v1ToolSha256": V1_TOOL_SHA256, "v1ReportSha256": V1_REPORT_SHA256,
                  "v2ToolSha256": V2_TOOL_SHA256, "v2PrivateReportSha256": V2_PRIVATE_REPORT_SHA256,
                  "v2PublicReceiptSha256": V2_PUBLIC_REPORT_SHA256,
                  "v3ToolSha256": v5.V3_TOOL_SHA256, "v4ToolSha256": V4_TOOL_SHA256,
                  "v4IndependentReviewSha256": V4_REVIEW_SHA256,
                  "v5ToolSha256": V5_TOOL_SHA256, "v5PrivateReportSha256": V5_PRIVATE_REPORT_SHA256,
                  "v5IndependentReviewSha256": V5_REVIEW_SHA256, "v5PublicReceiptSha256": V5_RECEIPT_SHA256,
                  "v6ToolSha256": tool_hash},
        "sourceFiles": source_files,
        "runtime": {"pymupdf": fitz.VersionBind, "pillow": __import__("PIL").__version__,
                    "pdftoppm": replay.poppler_version,
                    "pixelMode": "exact decoded RGB template equality; no resampling or similarity tolerance",
                    "renderPolicy": v5.MUPDF_STORE_POLICY},
        "denominators": {"v5UnresolvedRows": len(rows), "v5UnresolvedUniqueImages": len({r["imageSha256"] for r in rows}),
                         "v5UnresolvedUniqueImageGeometries": len(records),
                         "v5PixelTestedNoMatchRows": sum(r["frameStatus"] == "tried-no-exact-pixel-match" for r in rows),
                         "v5NoDimensionCompatiblePixelRecipeRows": sum(r["frameStatus"] == "supported-schema-no-dimension-compatible-pixel-recipe" for r in rows),
                         "uniqueV5NoDimensionCompatibleGeometries": sum(x["v5PixelComparisonCount"] == 0 for x in records),
                         "uniqueV5PixelTestedGeometries": sum(x["v5PixelComparisonCount"] > 0 for x in records),
                         "historicalUnknownFrameMemberCensus": {"denominator": 726, "status": "unavailable; not mapped to current rows"}},
        "candidateMethod": {
            "v5PixelTestedRows": "Search the exact target RGB byte array inside each same-source full-page raster at every renderer/DPI previously used in an actual v5 direct or full-page pixel comparison. No new DPI is introduced for this cohort.",
            "v5ZeroComparisonRows": f"Generate only integer DPI candidates within ±{SCALE_DPI_RADIUS} of each width/height target-size estimate derived from the raw normalized rectangle and actual PDF visible page dimensions; cap at {MAX_DPI}; test both PyMuPDF and Poppler. These are candidate render scales, not claims about historical authoring.",
            "matchRule": "A match requires target dimensions and every RGB channel to equal a contiguous full-page subimage. Search records all exact positions up to a 200-position per-recipe cap; it never resizes, rotates, shifts a source clip into a match, or accepts near matches.",
            "pixelVisibility": "Full-page rasters are private temporary render-cache files and are deleted after the run; private output stores hashes, dimensions and coordinates only.",
        },
        "v5OutcomeCorrection": {"historicalV5ReceiptPath": "research/source-audit-pass8-frame-universe-v5.json",
                                "historicalV5ReceiptSha256": V5_RECEIPT_SHA256,
                                "independentV5ReviewPath": "research/source-audit-pass8-independent-frame-v5-review.json",
                                "independentV5ReviewSha256": V5_REVIEW_SHA256,
                                "correctPartition": {"pixelTestedNoMatchRows": 132, "zeroDimensionCompatibleComparisonRows": 19},
                                "qualification": "The preserved v5 receipt describes the supported-schema unresolved cohort as 151 pixel-tested rows; the independently recomputed partition is 132 tested misses plus 19 zero-comparison rows. Earlier receipt bytes remain untouched."},
        "candidateRenderSummary": {"renderConfigs": len(render_records),
                                   "renderConfigsWithError": sum(x.get("renderError") is not None for x in render_records),
                                   "fullPageCacheMisses": replay.disk_cache_misses,
                                   "fullPageCacheHits": replay.disk_cache_hits,
                                   "outcomesByUniqueGeometry": dict(sorted(outcome_counts.items()))},
        "limits": ["An exact full-page template match proves a current crop is byte-identical to a contiguous region under the recorded source renderer/DPI. It does not establish historical authoring, semantic content, reading order, relevance, crop intent or source completeness.",
                   "No match means no exact template was found in this bounded render set; it does not prove absence from the source under every renderer, crop, affine transform, or historical process.",
                   "Candidate positions and normalized projection deltas are measured evidence only; no active coordinates or metadata are updated.",
                   "No source/catalog/data/highlight/grade flags changed. The historical 726-member census remains unavailable."],
        "geometryInventory": records,
        "renderConfigs": render_records,
    }
    out = args.private_output.resolve()
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n")
    return {"privateOutput": str(out), "privateOutputSha256": file_sha(out), "privateOutputBytes": out.stat().st_size,
            "v6ToolSha256": tool_hash, "denominators": output["denominators"],
            "candidateRenderSummary": output["candidateRenderSummary"]}


def parse_args():
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=root)
    parser.add_argument("--sources", type=Path, default=Path("/workspace/vault-audit-private/sources"))
    parser.add_argument("--v1-tool", type=Path, default=Path("/workspace/vault-audit-private/pass8/root/source-frame-replay.py"))
    parser.add_argument("--v1-report", type=Path, default=Path("/workspace/vault-audit-private/pass8/root/source-frame-replay-before.json"))
    parser.add_argument("--v2-tool", type=Path, default=root / "tools/source-coordinate-replay.py")
    parser.add_argument("--v2-report", type=Path, default=Path("/workspace/vault-audit-private/pass8/site/source-frame-replay-v2.json"))
    parser.add_argument("--v2-public-report", type=Path, default=root / "research/source-audit-pass8-frame-replay.json")
    parser.add_argument("--v5-report", type=Path, default=Path("/workspace/vault-audit-private/pass8-independent-source-frame-review/v5-fresh-full.json"))
    parser.add_argument("--private-output", type=Path, default=Path("/workspace/vault-audit-private/pass8-independent-source-frame-review/v6-candidate-search.json"))
    parser.add_argument("--render-cache-dir", type=Path, default=None, help="optional private cache; every cache hit is source/render/pixel-hash validated")
    return parser.parse_args()


if __name__ == "__main__":
    print(json.dumps(run(parse_args()), indent=2))
