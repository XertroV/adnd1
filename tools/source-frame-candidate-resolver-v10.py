#!/usr/bin/env python3
"""Finite scale-interval follow-up for the six v9 unresolved frames.

The interval is derived from the stored crop extent and raster dimensions with
the floor/ceil edge-quantization allowance made explicit.  Candidate scales
are a finite rational set inside that interval; only exact pixel and file
matches are positive.  No catalog or data file is edited.
"""
from __future__ import annotations

import argparse
import collections
import hashlib
import json
import math
import subprocess
from fractions import Fraction
from pathlib import Path
from typing import Any

import fitz
from PIL import Image

INPUT_COMMIT = "6d330af372ac809d11ed6029ed8695d0d8dc0909"
INPUT_DATA_SHA256 = "ceb7c8b9a8fe32b676e57c8d007f124a4490684d54558479e555d504075ba4f3"
V9_REPORT_SHA256 = "204a1d1eb12157df235a1bccf9534d7e115a9e2c132c92115b6532e7d4322489"
V9_TOOL_SHA256 = "c63d301c8a866472c05f4437b0c1652b1984b9c6ffdb37d03af35e037c2e646e"
EXPECTED_SOURCE_HASHES = {
    "DMG": "7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669",
    "MM": "c586009f2e5231bf022cf9f593b0ee42fcb5bded3c957d90efc6cb8d1e54bd81",
    "MM2": "b49b64590a1e2d61aa4ded3af6c9abd598bd8fc142f1caa8f5d7bef4abc5ff24",
    "PHB": "e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095",
    "UA": "e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4",
}
QUANTIZATION_WINDOW_PX = 2
RATIONAL_DENOMINATORS = (1, 2, 3, 4, 5, 8, 10, 20, 25, 50, 100, 1000)
MIN_CANDIDATE_SCALE = Fraction(1, 2)
MAX_CANDIDATE_SCALE = Fraction(4, 1)
EXPECTED_UNRESOLVED_GEOMETRIES = 6
EXPECTED_UNRESOLVED_REFERENCES = 7


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def normalized_rect(value: Any) -> tuple[float, float, float, float]:
    if isinstance(value, list) and len(value) == 4:
        result = tuple(float(x) for x in value)
    elif isinstance(value, dict):
        x, y = value.get("x"), value.get("y")
        w, h = value.get("width", value.get("w")), value.get("height", value.get("h"))
        require(None not in (x, y, w, h), "invalid normalized rectangle object")
        result = (float(x), float(y), float(w), float(h))
    else:
        raise ValueError("unsupported normalized rectangle schema")
    x, y, w, h = result
    require(w > 0 and h > 0 and x >= 0 and y >= 0 and x + w <= 1.000000000001 and y + h <= 1.000000000001,
            f"normalized rectangle out of bounds: {result}")
    return result


def frame_hypotheses(page: fitz.Page, norm: tuple[float, float, float, float]) -> list[dict]:
    """Map Page.rect and distinct MediaBox-normalized hypotheses into Page.rect coordinates."""
    x, y, w, h = norm
    page_box = page.rect
    page_clip = fitz.Rect(x * page_box.width, y * page_box.height,
                          (x + w) * page_box.width, (y + h) * page_box.height)
    frames = [{
        "frameName": "Page.rect/CropBox",
        "normalizationBox": list(page_box),
        "sourceFrameBounds": list(page_clip),
        "pageCoordinateBounds": list(page_clip),
        "mapping": "normalized x/y/width/height multiplied by Page.rect width/height; origin at Page.rect top-left",
        "isDistinctHypothesis": True,
    }]
    media = page.mediabox
    crop = page.cropbox
    if (abs(media.width - page_box.width) > 1e-7 or abs(media.height - page_box.height) > 1e-7
            or abs(crop.x0) > 1e-7 or abs(crop.y0) > 1e-7):
        media_x0 = media.x0 + x * media.width
        media_x1 = media.x0 + (x + w) * media.width
        media_y_top = media.y1 - y * media.height
        media_y_bottom = media.y1 - (y + h) * media.height
        # PyMuPDF's clip is in Page.rect (CropBox) coordinates with top-left origin.
        page_bounds = fitz.Rect(media_x0 - crop.x0,
                                crop.y1 - media_y_top,
                                media_x1 - crop.x0,
                                crop.y1 - media_y_bottom)
        frames.append({
            "frameName": "MediaBox-normalized, transformed into Page.rect/CropBox coordinates",
            "normalizationBox": list(media),
            "sourceFrameBounds": [media_x0, media_y_bottom, media_x1, media_y_top],
            "pageCoordinateBounds": list(page_bounds),
            "mapping": "Normalize from MediaBox top-left; translate x by -CropBox.x0 and y by CropBox.y1-MediaBox.y1 into Page.rect coordinates",
            "isDistinctHypothesis": True,
        })
    return frames


def intersect_page_clip(bounds: list[float], page_rect: fitz.Rect) -> fitz.Rect:
    rect = fitz.Rect(*bounds)
    return rect & page_rect


def axis_scale_interval(target_pixels: int, physical_length_pt: float,
                        quantization_px: int = QUANTIZATION_WINDOW_PX) -> dict:
    """Necessary scale interval when ceil(right*s)-floor(left*s) adds <2 pixels."""
    if physical_length_pt <= 0:
        return {"status": "invalid-zero-length", "lowerExclusive": None, "upperInclusive": None}
    lower = max(0.0, (target_pixels - quantization_px) / physical_length_pt)
    upper = target_pixels / physical_length_pt
    if lower >= upper:
        return {"status": "empty", "lowerExclusive": lower, "upperInclusive": upper}
    return {"status": "nonempty", "lowerExclusive": lower, "upperInclusive": upper}


def scale_interval(width_px: int, height_px: int, effective_clip: fitz.Rect) -> dict:
    x = axis_scale_interval(width_px, effective_clip.width)
    y = axis_scale_interval(height_px, effective_clip.height)
    if x["status"] != "nonempty" or y["status"] != "nonempty":
        return {"status": "empty-axis-interval", "x": x, "y": y,
                "lowerExclusive": None, "upperInclusive": None}
    low = max(x["lowerExclusive"], y["lowerExclusive"])
    high = min(x["upperInclusive"], y["upperInclusive"])
    if low >= high:
        return {"status": "empty-width-height-intersection", "x": x, "y": y,
                "lowerExclusive": low, "upperInclusive": high}
    return {"status": "nonempty-width-height-intersection", "x": x, "y": y,
            "lowerExclusive": low, "upperInclusive": high}


def rational_candidates(interval: dict) -> list[dict]:
    if interval["status"] != "nonempty-width-height-intersection":
        return []
    lower, upper = interval["lowerExclusive"], interval["upperInclusive"]
    candidates: set[Fraction] = set()
    for denominator in RATIONAL_DENOMINATORS:
        first = math.floor(float(MIN_CANDIDATE_SCALE) * denominator)
        last = math.ceil(float(MAX_CANDIDATE_SCALE) * denominator)
        for numerator in range(first, last + 1):
            value = Fraction(numerator, denominator)
            f = float(value)
            if MIN_CANDIDATE_SCALE <= value <= MAX_CANDIDATE_SCALE and f > lower and f <= upper:
                candidates.add(value)
    return [{"numerator": value.numerator, "denominator": value.denominator,
             "fraction": f"{value.numerator}/{value.denominator}", "scale": float(value),
             "isCommonTenth": (value * 10).denominator == 1}
            for value in sorted(candidates)]


def render_candidate(page: fitz.Page, effective_clip: fitz.Rect, scale: float) -> fitz.Pixmap:
    require(scale > 0, "matrix scale must be positive")
    pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), clip=effective_clip,
                          alpha=False, annots=False)
    require(pix.n == 3 and not pix.alpha, f"expected RGB output, got n={pix.n}, alpha={pix.alpha}")
    return pix


def load_targets(repo: Path, geometry: dict, catalog_hash_cache: dict) -> tuple[Image.Image, list[dict]]:
    targets, references = [], []
    for reference in geometry["references"]:
        cat_rel = reference["catalog"]
        cat_path = repo / "dist" / cat_rel
        expected_cat_sha = reference["catalogSha256"]
        if cat_rel not in catalog_hash_cache:
            catalog_hash_cache[cat_rel] = sha256_file(cat_path)
        require(catalog_hash_cache[cat_rel] == expected_cat_sha, f"pinned catalog changed: {cat_rel}")
        catalog = json.loads(cat_path.read_text())
        region = next((r for r in catalog.get("regions", []) if r.get("id") == reference["regionId"]), None)
        require(region is not None, f"missing current region: {reference['regionId']}")
        require(region["book"] == geometry["book"] and region["printedPage"] == geometry["printedPage"]
                and region["pdfPage"] == geometry["pdfOrdinal"], f"source locator changed: {reference['regionId']}")
        require(region["sha256"] == reference["imageSha256"] and [region["width"], region["height"]] == reference["imageDimensions"],
                f"source image identity changed: {reference['regionId']}")
        require(catalog.get("sources", {}).get(geometry["book"], {}).get("sha256") == EXPECTED_SOURCE_HASHES[geometry["book"]],
                f"catalog source identity mismatch: {reference['regionId']}")
        image_path = cat_path.parent / region["image"]
        image_bytes = image_path.read_bytes()
        require(sha256_bytes(image_bytes) == region["sha256"], f"current image file hash mismatch: {reference['regionId']}")
        image = Image.open(image_path).convert("RGB").copy()
        require(list(image.size) == reference["imageDimensions"], f"target RGB dimensions changed: {reference['regionId']}")
        targets.append(image)
        references.append({**reference, "currentImagePath": str(image_path), "currentImageBytesSha256": sha256_bytes(image_bytes),
                           "currentRgbPixelSha256": sha256_bytes(image.tobytes())})
    require(targets and all(im.size == targets[0].size and im.tobytes() == targets[0].tobytes() for im in targets),
            f"references sharing geometry have different pixels: {geometry['geometryKey']}")
    return targets[0], references


def run(args: argparse.Namespace) -> dict:
    repo, sources, private_root = args.repo.resolve(), args.sources.resolve(), args.private_root.resolve()
    v9_path, output_path = args.v9_report.resolve(), args.output.resolve()
    v9_bytes = v9_path.read_bytes()
    require(sha256_bytes(v9_bytes) == V9_REPORT_SHA256, "frozen v9 report changed")
    v9 = json.loads(v9_bytes)
    require(v9["input"]["commit"] == INPUT_COMMIT and v9["input"]["rawDataSha256"] == INPUT_DATA_SHA256,
            "v9 input identity changed")
    require(v9["input"]["toolSha256"] == V9_TOOL_SHA256, "frozen v9 tool identity changed")
    current_commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=repo, text=True).strip()
    require(current_commit == INPUT_COMMIT, f"repository HEAD changed: {current_commit}")
    data_sha = sha256_file(repo / "dist/data.json")
    require(data_sha == INPUT_DATA_SHA256, "raw data baseline changed")
    v9_tool_path = repo / "tools/source-frame-candidate-resolver-v9.py"
    require(sha256_file(v9_tool_path) == V9_TOOL_SHA256, "v9 tool file changed")

    source_records, docs = {}, {}
    for book, source in v9["input"]["sourcePdfs"].items():
        path = sources / source["fileName"]
        actual = sha256_file(path)
        require(actual == EXPECTED_SOURCE_HASHES[book] == source["sha256"], f"canonical PDF hash mismatch: {book}")
        doc = fitz.open(path)
        require(len(doc) == source["pdfPages"], f"source page count mismatch: {book}")
        docs[book] = doc
        source_records[book] = {"fileName": source["fileName"], "sha256": actual, "pdfPages": len(doc), "bytes": path.stat().st_size}

    unresolved = [g for g in v9["geometryResults"] if g["frameOutcome"] != "exact-rgb-replay-found"]
    unresolved_refs = sum(g["referenceCount"] for g in unresolved)
    require(len(unresolved) == EXPECTED_UNRESOLVED_GEOMETRIES and unresolved_refs == EXPECTED_UNRESOLVED_REFERENCES,
            f"v9 unresolved denominator drift: groups={len(unresolved)}, refs={unresolved_refs}")
    catalog_hash_cache = {}
    candidate_dir = private_root / "candidate-pixels"
    candidate_dir.mkdir(parents=True, exist_ok=True)
    results, scale_counts = [], collections.Counter()
    trial_count = exact_rgb_count = exact_file_count = dimension_match_count = 0

    for geometry in unresolved:
        book, pdf_ordinal = geometry["book"], geometry["pdfOrdinal"]
        page = docs[book][pdf_ordinal - 1]
        norm = normalized_rect(geometry["normalizedPageRect"])
        target, references = load_targets(repo, geometry, catalog_hash_cache)
        target_rgb, target_size = target.tobytes(), target.size
        hypotheses = frame_hypotheses(page, norm)
        frame_records = []
        for hypothesis in hypotheses:
            declared_bounds = hypothesis["pageCoordinateBounds"]
            effective = intersect_page_clip(declared_bounds, page.rect)
            clipped = list(effective) != list(fitz.Rect(*declared_bounds))
            interval = scale_interval(target_size[0], target_size[1], effective)
            candidates = rational_candidates(interval)
            common_tenths = [c for c in candidates if c["isCommonTenth"]]
            trials = []
            best = None
            for candidate in candidates:
                scale = candidate["scale"]
                pix = render_candidate(page, effective, scale)
                dims = (pix.width, pix.height)
                dimension_match = dims == target_size
                rgb_sha = sha256_bytes(pix.samples)
                exact_rgb = dimension_match and pix.samples == target_rgb
                png_bytes = pix.tobytes("png")
                png_sha = sha256_bytes(png_bytes)
                record = {
                    "scaleFraction": candidate["fraction"], "numerator": candidate["numerator"],
                    "denominator": candidate["denominator"], "matrixScale": scale, "matrix": [scale, scale],
                    "renderedDimensions": list(dims), "dimensionMatch": dimension_match,
                    "renderedRgbPixelSha256": rgb_sha, "renderedPngSha256": png_sha,
                    "exactRgbPixelMatch": exact_rgb,
                    "exactPngFileMatch": png_sha == geometry["targetImageSha256"],
                    "pixelComparison": "exact-rgb-byte-comparison" if dimension_match else "not-compared-size-mismatch",
                }
                trial_count += 1
                if dimension_match:
                    dimension_match_count += 1
                    scale_counts[candidate["fraction"] + ":dimension"] += 1
                if exact_rgb:
                    exact_rgb_count += 1
                    if record["exactPngFileMatch"]:
                        exact_file_count += 1
                    scale_counts[candidate["fraction"] + ":exact"] += 1
                    name = f"{geometry['geometryKey']}-{book}-pdf{pdf_ordinal}-{hypothesis['frameName'].replace('/', '_').replace(' ', '-')}-{candidate['fraction'].replace('/', 'of')}.png"
                    path = candidate_dir / name
                    pix.save(path)
                    saved = path.read_bytes()
                    require(saved == png_bytes, f"saved Pixmap PNG differs from PNG bytes for {geometry['geometryKey']}")
                    record["candidatePrivatePath"] = str(path)
                    record["savedCandidatePngSha256"] = sha256_bytes(saved)
                    record["savedPngBytesEqualTarget"] = saved == Path(references[0]["currentImagePath"]).read_bytes()
                    best = best or {"scaleFraction": candidate["fraction"], "scale": scale, "path": str(path),
                                    "pngSha256": png_sha, "rgbPixelSha256": rgb_sha,
                                    "exactPngFileMatch": record["exactPngFileMatch"]}
                trials.append(record)
            frame_records.append({
                "frameName": hypothesis["frameName"], "normalizationBox": hypothesis["normalizationBox"],
                "sourceFrameBounds": hypothesis["sourceFrameBounds"], "pageCoordinateBounds": declared_bounds,
                "effectivePageClipBounds": list(effective), "effectiveClipWasPageClipped": clipped,
                "coordinateMapping": hypothesis["mapping"],
                "physicalClipSizePoints": {"width": effective.width, "height": effective.height},
                "scaleIntervalFromTwoPixelEdgeQuantization": interval,
                "rationalDenominatorsTested": list(RATIONAL_DENOMINATORS),
                "commonTenthGridScalesWithinInterval": [c["fraction"] for c in common_tenths],
                "finiteRationalCandidatesWithinInterval": candidates,
                "candidateCount": len(candidates), "renderTrials": trials,
                "exactSourcePixelReplay": best,
                "frameStatus": "exact-source-pixel-replay-found" if best else (
                    "no-scale-interval" if interval["status"] != "nonempty-width-height-intersection" else
                    "no-rational-candidate-in-interval" if not candidates else
                    "no-exact-rgb-replay-in-derived-rational-set"),
            })
        frame_positive = [f for f in frame_records if f["exactSourcePixelReplay"]]
        results.append({
            "geometryKey": geometry["geometryKey"], "book": book, "printedPage": geometry["printedPage"],
            "pdfOrdinal": pdf_ordinal, "targetImageSha256": geometry["targetImageSha256"],
            "targetImageDimensions": geometry["targetImageDimensions"],
            "targetRgbPixelSha256": geometry["targetRgbPixelSha256"],
            "normalizedPageRect": geometry["normalizedPageRect"], "normalizedRectSchema": geometry["normalizedRectSchema"],
            "pageRect": geometry["pageRect"], "cropBox": geometry["cropBox"], "mediaBox": geometry["mediaBox"],
            "rotation": geometry["rotation"], "referenceCount": geometry["referenceCount"], "references": references,
            "v9TriedScales": [2.0, 2.1, 2.2, 2.3, 2.4, 2.5],
            "frameHypotheses": frame_records,
            "geometryOutcome": "exact-replay-found" if frame_positive else "unresolved-after-finite-interval-probe",
        })

    output = {
        "schemaVersion": 10,
        "artifactType": "bounded quantization-interval and rational-scale follow-up for v9 unresolved frames",
        "input": {
            "commit": current_commit, "rawDataSha256": data_sha,
            "v9ReportPath": str(v9_path), "v9ReportSha256": sha256_bytes(v9_bytes),
            "v9ToolPath": str(v9_tool_path), "v9ToolSha256": sha256_file(v9_tool_path),
            "sourcePdfs": source_records,
        },
        "scope": {
            "inheritedV9UnresolvedGeometryGroups": len(unresolved),
            "inheritedV9UnresolvedRegionReferences": unresolved_refs,
            "geometryGroupsProbed": len(results),
            "regionReferencesProbed": sum(r["referenceCount"] for r in results),
            "bookCounts": {book: {"geometryGroups": sum(g["book"] == book for g in results),
                                  "regionReferences": sum(g["referenceCount"] for g in results if g["book"] == book)}
                           for book in sorted({g["book"] for g in results})},
            "onlyV9UnresolvedQueue": True,
        },
        "candidateMethod": {
            "quantizationModel": "For a normalized interval of physical length L, integer crop-edge floor/ceil can add a total of less than 2 pixels to s*L. Necessary scale range per axis is (max(0,(N-2)/L), N/L], where N is the stored native raster dimension. Intersect width and height ranges; empty intersections are retained as metadata/aspect incompatibility within this explicit model.",
            "frameHypotheses": ["Page.rect/CropBox normalized top-left frame", "MediaBox-normalized top-left frame translated through CropBox into Page.rect coordinates only when MediaBox and Page.rect/CropBox differ"],
            "rationalCandidateDenominators": list(RATIONAL_DENOMINATORS),
            "candidateRange": [float(MIN_CANDIDATE_SCALE), float(MAX_CANDIDATE_SCALE)],
            "commonTenthGrid": "Scales k/10 from 0.5 to 4.0 are included only when inside the derived interval.",
            "positiveRequirement": "Exact dimensions, exact complete RGB pixel bytes, and exact PNG SHA must all match. No resizing, padding, changed bounds, approximate RGB, or interval-only result counts as recovered.",
            "sourceIdentity": "Canonical source PDF hashes and page counts were checked before rendering; catalog source identity, catalog hash, region id, image file hash and dimensions were also checked.",
        },
        "trialSummary": {
            "renderTrials": trial_count, "dimensionMatchedTrials": dimension_match_count,
            "exactRgbMatches": exact_rgb_count, "exactPngMatches": exact_file_count,
            "geometryGroupsRecovered": sum(g["geometryOutcome"] == "exact-replay-found" for g in results),
            "regionReferencesRecovered": sum(g["referenceCount"] for g in results if g["geometryOutcome"] == "exact-replay-found"),
            "statusCounts": dict(collections.Counter(f["frameStatus"] for g in results for f in g["frameHypotheses"])),
        },
        "geometryResults": results,
        "manualSourceImageReview": {
            "status": "pending-positive-review-and-unresolved-source-inspection",
            "instruction": "If any exact positives are found, open each positive source-derived candidate crop individually before documenting frame assessment. For any geometry still unresolved, inspect its current target image and full canonical source page separately, then classify only the frame boundary (metadata mismatch, source-edge/glyph limit, or renderer/frame not established). Do not assess semantics, completeness, focus, defaults or catalog scope.",
        },
        "remainingAxes": [
            {"axis": "source semantics and citation purpose", "status": "not assessed"},
            {"axis": "crop completeness, context, highlight/focus and default", "status": "not assessed"},
            {"axis": "historical renderer intent", "status": "not established by exact or interval replay"},
        ],
        "privateCandidatePixelsDirectory": str(candidate_dir),
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n")
    for doc in docs.values():
        doc.close()
    return output


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--sources", type=Path, default=Path("/workspace/vault-audit-private/sources"))
    parser.add_argument("--private-root", type=Path, default=Path("/workspace/vault-audit-private/pass8/frame-candidate-v10"))
    parser.add_argument("--v9-report", type=Path, default=Path("research/source-audit-pass8-frame-candidate-v9.json"))
    parser.add_argument("--output", type=Path, default=Path("research/source-audit-pass8-frame-candidate-v10.json"))
    args = parser.parse_args()
    result = run(args)
    print(json.dumps({"geometries": result["scope"]["geometryGroupsProbed"],
                      "references": result["scope"]["regionReferencesProbed"],
                      "trials": result["trialSummary"]["renderTrials"],
                      "dimensionMatches": result["trialSummary"]["dimensionMatchedTrials"],
                      "exactRgb": result["trialSummary"]["exactRgbMatches"],
                      "exactPng": result["trialSummary"]["exactPngMatches"],
                      "recoveredGroups": result["trialSummary"]["geometryGroupsRecovered"],
                      "output": str(args.output.resolve())}, indent=2))


if __name__ == "__main__":
    main()
