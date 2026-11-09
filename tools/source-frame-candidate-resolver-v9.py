#!/usr/bin/env python3
"""Bounded exact crop replay at fractional PyMuPDF matrix scales.

This is an additive source-frame probe over the 47 geometry / 49 reference
queue frozen in the pass-8 frame adjudication proposal. It reads canonical
PDFs and existing catalog images; it never edits catalogs or data.
"""
from __future__ import annotations

import argparse
import collections
import hashlib
import json
import subprocess
from pathlib import Path
from typing import Any

import fitz
from PIL import Image

INPUT_COMMIT = "6d330af372ac809d11ed6029ed8695d0d8dc0909"
INPUT_DATA_SHA256 = "ceb7c8b9a8fe32b676e57c8d007f124a4490684d54558479e555d504075ba4f3"
INPUT_PROPOSAL_SHA256 = "1a8078c14e1c73c2597bf837a8e2d8c9a2c28beea3f51aef4bda0484197449cc"
V8_REPORT_SHA256 = "7c709609da55b26c8d56e3745aac2741429cfb4bf29b18bbd6463e16c0f2951c"
MM_CALIBRATION_REPORT_SHA256 = "50992e1daba03884f1885231454cc3a341f86b4f6154cb9a3f34708c35035a96"
EXPECTED_SOURCE_HASHES = {
    "DMG": "7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669",
    "MM": "c586009f2e5231bf022cf9f593b0ee42fcb5bded3c957d90efc6cb8d1e54bd81",
    "MM2": "b49b64590a1e2d61aa4ded3af6c9abd598bd8fc142f1caa8f5d7bef4abc5ff24",
    "PHB": "e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095",
    "UA": "e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4",
}
# Explicit finite grid selected because native width/height estimates for this
# queue cluster near 2.0, 2.2, 2.3 and 2.4 px/pt. 2.2 is additionally pinned
# by the exact MM p.54/p.80 replay receipt. This is not a standard-DPI grid.
MATRIX_SCALES = (2.0, 2.1, 2.2, 2.3, 2.4, 2.5)
EXPECTED_GEOMETRIES = 47
EXPECTED_REFERENCES = 49


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def normalized_rect(value: Any) -> tuple[float, float, float, float]:
    """Read only the two normalized-rectangle schemas in this frozen queue."""
    if isinstance(value, list) and len(value) == 4:
        result = tuple(float(v) for v in value)
    elif isinstance(value, dict):
        x, y = value.get("x"), value.get("y")
        w = value.get("width", value.get("w"))
        h = value.get("height", value.get("h"))
        require(None not in (x, y, w, h), "unsupported normalized rectangle object")
        result = (float(x), float(y), float(w), float(h))
    else:
        raise ValueError("unsupported normalized rectangle schema")
    x, y, w, h = result
    require(w > 0 and h > 0 and x >= 0 and y >= 0 and x + w <= 1.000000000001 and y + h <= 1.000000000001,
            f"normalized rectangle is out of bounds: {result}")
    return result


def estimate_native_scales(image_dimensions: list[int], rect: tuple[float, float, float, float],
                           page_rect: fitz.Rect) -> dict[str, float]:
    x, y, w, h = rect
    target_w, target_h = image_dimensions
    return {
        "widthPxPerPoint": target_w / (w * page_rect.width),
        "heightPxPerPoint": target_h / (h * page_rect.height),
    }


def source_clip(page: fitz.Page, rect: tuple[float, float, float, float]) -> fitz.Rect:
    x, y, w, h = rect
    return fitz.Rect(x * page.rect.width, y * page.rect.height,
                     (x + w) * page.rect.width, (y + h) * page.rect.height)


def render_rgb(page: fitz.Page, rect: tuple[float, float, float, float], scale: float) -> fitz.Pixmap:
    require(scale > 0, "matrix scale must be positive")
    pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), clip=source_clip(page, rect),
                          alpha=False, annots=False)
    require(pix.n == 3 and not pix.alpha, f"expected RGB output, got n={pix.n}, alpha={pix.alpha}")
    return pix


def compare_candidate(pix: fitz.Pixmap, target_rgb: bytes, target_dimensions: tuple[int, int]) -> dict:
    candidate_rgb = pix.samples
    dimensions = (pix.width, pix.height)
    dimension_match = dimensions == target_dimensions
    exact_rgb = dimension_match and candidate_rgb == target_rgb
    return {
        "renderedDimensions": list(dimensions),
        "dimensionMatch": dimension_match,
        "renderedRgbPixelSha256": sha256_bytes(candidate_rgb),
        "exactRgbPixelMatch": exact_rgb,
        "pixelComparison": "exact-rgb-byte-comparison" if dimension_match else "not-compared-size-mismatch",
    }


def load_pinned_sources(repo: Path, sources: Path, proposal: dict) -> tuple[dict, dict]:
    pins = proposal["inputPins"]["sourcePdfs"]
    require(set(pins) == set(EXPECTED_SOURCE_HASHES), "source PDF pin set changed")
    docs, records = {}, {}
    for book, expected_sha in EXPECTED_SOURCE_HASHES.items():
        pin = pins[book]
        require(pin["sha256"] == expected_sha, f"proposal source hash differs from expected canonical hash: {book}")
        path = sources / pin["fileName"]
        actual_sha = sha256_file(path)
        require(actual_sha == expected_sha, f"canonical source PDF hash mismatch for {book}: {actual_sha}")
        doc = fitz.open(path)
        require(len(doc) == pin["pdfPages"], f"PDF page count mismatch for {book}")
        docs[book] = doc
        records[book] = {"fileName": pin["fileName"], "path": str(path), "sha256": actual_sha,
                         "pdfPages": len(doc), "bytes": path.stat().st_size}
    return docs, records


def load_target_image(repo: Path, reference: dict, catalog_hash_pins: dict,
                      catalog_cache: dict) -> tuple[Image.Image, dict, Path]:
    catalog_rel = reference["catalog"]
    require(catalog_rel in catalog_hash_pins, f"reference catalog lacks a pinned hash: {catalog_rel}")
    catalog_path = repo / "dist" / catalog_rel
    actual_catalog_sha = sha256_file(catalog_path)
    require(actual_catalog_sha == catalog_hash_pins[catalog_rel], f"catalog hash mismatch: {catalog_rel}")
    if catalog_rel not in catalog_cache:
        catalog = json.loads(catalog_path.read_text())
        catalog_cache[catalog_rel] = (catalog, actual_catalog_sha)
    catalog, _ = catalog_cache[catalog_rel]
    region = next((r for r in catalog.get("regions", []) if r.get("id") == reference["regionId"]), None)
    require(region is not None, f"catalog region missing: {catalog_rel}#{reference['regionId']}")
    require(region["book"] == reference["book"] and region["printedPage"] == reference["printedPage"]
            and region["pdfPage"] == reference["pdfOrdinal"], f"source locator mismatch: {reference['regionId']}")
    require(region["sha256"] == reference["imageSha256"], f"region image hash mismatch: {reference['regionId']}")
    require([region["width"], region["height"]] == reference["imageDimensions"],
            f"region image dimensions mismatch: {reference['regionId']}")
    require(normalized_rect(region["normalizedPageRect"]) == normalized_rect(reference["normalizedPageRect"]),
            f"region frame declaration mismatch: {reference['regionId']}")
    source_pin = catalog.get("sources", {}).get(reference["book"])
    require(source_pin is not None and source_pin.get("sha256") == EXPECTED_SOURCE_HASHES[reference["book"]],
            f"catalog source identity mismatch: {reference['regionId']}")
    image_path = catalog_path.parent / region["image"]
    image_bytes = image_path.read_bytes()
    require(sha256_bytes(image_bytes) == region["sha256"], f"target image hash mismatch: {reference['regionId']}")
    image = Image.open(image_path).convert("RGB").copy()
    require(list(image.size) == reference["imageDimensions"], f"target RGB dimensions mismatch: {reference['regionId']}")
    return image, region, image_path


def run(args: argparse.Namespace) -> dict:
    repo, sources, private_root = args.repo.resolve(), args.sources.resolve(), args.private_root.resolve()
    proposal_path = args.proposal.resolve()
    output_path = args.output.resolve()
    proposal_bytes = proposal_path.read_bytes()
    require(sha256_bytes(proposal_bytes) == INPUT_PROPOSAL_SHA256, "frozen v8 adjudication proposal changed")
    proposal = json.loads(proposal_bytes)
    require(proposal["inputCommit"] == INPUT_COMMIT, "proposal input commit differs")
    current_commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=repo, text=True).strip()
    require(current_commit == INPUT_COMMIT, f"repository HEAD changed: {current_commit}")
    data_path = repo / "dist/data.json"
    data_sha = sha256_file(data_path)
    require(data_sha == INPUT_DATA_SHA256, "raw data baseline changed")
    v8_path = repo / "research/source-audit-pass8-frame-candidate-v8.json"
    require(sha256_file(v8_path) == V8_REPORT_SHA256, "v8 report changed")
    calibration_path = repo / "research/source-audit-pass8-mm-familiar-frame-adjudication.json"
    require(sha256_file(calibration_path) == MM_CALIBRATION_REPORT_SHA256, "MM 2.2 calibration report changed")
    docs, source_records = load_pinned_sources(repo, sources, proposal)
    queue = proposal["remainingUnmatchedQueue"]
    geometries = [g for book in sorted(queue["byBook"]) for g in queue["byBook"][book]]
    ref_count = sum(len(g["references"]) for g in geometries)
    require(len(geometries) == EXPECTED_GEOMETRIES and ref_count == EXPECTED_REFERENCES,
            f"queue denominator drift: geometries={len(geometries)} references={ref_count}")
    require(queue["totalGeometryGroups"] == EXPECTED_GEOMETRIES and queue["totalRegionReferences"] == EXPECTED_REFERENCES,
            "proposal-reported queue denominator drift")
    require(all(g["currentV8Status"] == "no-exact-template-in-v6-v8-bounded-render-sets" for g in geometries),
            "queue now contains a geometry outside the requested v6-v8-unmatched cohort")

    catalog_hash_pins = proposal["inputPins"]["catalogFiles"]
    catalog_cache = {}
    private_pixels = private_root / "candidate-pixels"
    private_pixels.mkdir(parents=True, exist_ok=True)
    trial_count = 0
    exact_rgb_groups = exact_file_groups = exact_reference_count = 0
    dimension_matches = 0
    results = []
    by_book = collections.Counter()
    scale_counts = {str(scale): collections.Counter() for scale in MATRIX_SCALES}

    for geometry in geometries:
        book, pdf_ordinal = geometry["book"], geometry["pdfOrdinal"]
        page = docs[book][pdf_ordinal - 1]
        rect = normalized_rect(geometry["normalizedPageRect"])
        estimates = estimate_native_scales(geometry["imageDimensions"], rect, page.rect)
        reference_records = []
        target_images = []
        for reference in geometry["references"]:
            require(reference["normalizedPageRect"] == geometry["normalizedPageRect"],
                    f"reference frame differs from group: {reference['regionId']}")
            joined_reference = {**reference, "book": book, "printedPage": geometry["printedPage"],
                                "pdfOrdinal": pdf_ordinal}
            target_image, region, image_path = load_target_image(repo, joined_reference, catalog_hash_pins, catalog_cache)
            require(region["sha256"] == geometry["imageSha256"] and list(target_image.size) == geometry["imageDimensions"],
                    f"reference image diverges from grouped target: {reference['regionId']}")
            target_images.append(target_image)
            reference_records.append({
                "catalog": reference["catalog"], "catalogSha256": catalog_cache[reference["catalog"]][1],
                "regionId": reference["regionId"], "ownerBindings": reference["ownerBindings"],
                "imageSha256": reference["imageSha256"], "imageDimensions": reference["imageDimensions"],
                "normalizedPageRect": reference["normalizedPageRect"], "sourceIdentityMatchesBaseline": reference["sourceIdentityMatches"],
                "targetImagePath": str(image_path), "targetRgbPixelSha256": sha256_bytes(target_image.tobytes()),
            })
        target = target_images[0]
        target_rgb = target.tobytes()
        require(all(image.size == target.size and image.tobytes() == target_rgb for image in target_images),
                f"references sharing geometry do not share exact RGB pixels: {geometry['geometryKey']}")
        clip = source_clip(page, rect)
        trials = []
        positive = None
        for scale in MATRIX_SCALES:
            pix = render_rgb(page, rect, scale)
            compared = compare_candidate(pix, target_rgb, target.size)
            candidate_png_sha = sha256_bytes(pix.tobytes("png"))
            candidate_record = {
                "matrixScale": scale, "matrix": [scale, scale], "renderer": "PyMuPDF",
                "rendererVersion": fitz.VersionBind, "sourceClipPdfPoints": [clip.x0, clip.y0, clip.x1, clip.y1],
                **compared, "renderedPngSha256": candidate_png_sha,
                "exactFileShaMatch": candidate_png_sha == geometry["imageSha256"],
            }
            trial_count += 1
            by_book[book] += 1
            if compared["dimensionMatch"]:
                dimension_matches += 1
                scale_counts[str(scale)]["dimensionMatch"] += 1
            if compared["exactRgbPixelMatch"]:
                rgb_path = private_pixels / f"{geometry['geometryKey']}-{book}-pdf{pdf_ordinal}-scale-{scale:g}.png"
                pix.save(rgb_path)
                saved_bytes = rgb_path.read_bytes()
                candidate_record["candidatePixelPrivatePath"] = str(rgb_path)
                candidate_record["savedCandidatePngSha256"] = sha256_bytes(saved_bytes)
                candidate_record["savedPngBytesEqualSourceImage"] = saved_bytes == Path(reference_records[0]["targetImagePath"]).read_bytes()
                require(sha256_bytes(saved_bytes) == candidate_png_sha,
                        f"Pixmap.save and Pixmap.tobytes PNG differ for {geometry['geometryKey']} scale {scale}")
                scale_counts[str(scale)]["exactRgbMatch"] += 1
                if candidate_record["exactFileShaMatch"]:
                    scale_counts[str(scale)]["exactFileMatch"] += 1
                if positive is None:
                    positive = {"matrixScale": scale, "path": str(rgb_path), "pngSha256": candidate_png_sha,
                                "rgbPixelSha256": compared["renderedRgbPixelSha256"],
                                "exactFileShaMatch": candidate_record["exactFileShaMatch"]}
            trials.append(candidate_record)
        if positive:
            exact_rgb_groups += 1
            exact_reference_count += len(reference_records)
            if positive["exactFileShaMatch"]:
                exact_file_groups += 1
        results.append({
            "geometryKey": geometry["geometryKey"], "book": book,
            "printedPage": geometry["printedPage"], "pdfOrdinal": pdf_ordinal,
            "targetImageSha256": geometry["imageSha256"], "targetImageDimensions": geometry["imageDimensions"],
            "targetRgbPixelSha256": sha256_bytes(target_rgb),
            "normalizedPageRect": geometry["normalizedPageRect"], "normalizedRectSchema": geometry["normalizedRectSchema"],
            "pageRect": list(page.rect), "cropBox": list(page.cropbox), "mediaBox": list(page.mediabox),
            "rotation": page.rotation, "sourceClipPdfPoints": [clip.x0, clip.y0, clip.x1, clip.y1],
            "nativeScaleEstimatesPxPerPoint": estimates,
            "referenceCount": len(reference_records), "references": reference_records,
            "candidateScaleTrials": trials, "exactSourcePixelReplay": positive,
            "frameOutcome": "exact-rgb-replay-found" if positive else "no-exact-rgb-replay-in-pinned-fractional-grid",
        })

    output = {
        "schemaVersion": 9,
        "artifactType": "bounded fractional-Matrix exact source-frame candidate probe",
        "input": {
            "commit": current_commit, "rawDataSha256": data_sha,
            "proposalPath": str(proposal_path), "proposalSha256": sha256_bytes(proposal_bytes),
            "v8ReportPath": str(v8_path), "v8ReportSha256": sha256_file(v8_path),
            "mm22CalibrationReportPath": str(calibration_path), "mm22CalibrationReportSha256": sha256_file(calibration_path),
            "sourcePdfs": source_records,
            "toolPath": str(Path(__file__).resolve()), "toolSha256": sha256_file(Path(__file__).resolve()),
        },
        "scope": {
            "queueFrom": "proposal.remainingUnmatchedQueue.byBook",
            "geometryCount": len(results), "regionReferenceCount": sum(r["referenceCount"] for r in results),
            "previouslyUnmatchedV6V8": True,
            "books": {book: {"geometryGroups": sum(r["book"] == book for r in results),
                             "regionReferences": sum(r["book"] == book for r in results for _ in range(r["referenceCount"]))}
                      for book in sorted({r["book"] for r in results})},
            "notCovered": ["known nine other unmatched regions assigned to another worker",
                           "historical 726-reference membership not required for this frozen 49-reference queue"],
        },
        "candidatePlan": {
            "matrixScales": list(MATRIX_SCALES), "scaleCountPerGeometry": len(MATRIX_SCALES),
            "totalScaleGeometryTrials": trial_count,
            "selectionMethod": "Explicit finite fractional px-per-point grid from 2.0 to 2.5 in 0.1 increments. Observed width/height native estimates cluster around 2.0, 2.2, 2.3 and 2.4; 2.2 is independently calibrated by the exact MM p.54/p.80 replay report. The grid is bounded and is not claimed exhaustive.",
            "sourceClipMethod": "Read the frozen normalizedPageRect and map it directly through the canonical PDF Page.rect; render the actual source crop at the tested Matrix(scale, scale), with alpha=False and annots=False.",
            "acceptanceRule": "Exact RGB pixel equality and exact dimensions are required for a positive. When RGB pixels match, encode the crop as PNG and compare the file SHA/bytes to the public catalog image. No resize, padding, approximate pixel metric, or bounds-only match counts as positive.",
        },
        "trialSummary": {
            "candidateScaleGeometryTrials": trial_count, "dimensionMatchedTrials": dimension_matches,
            "exactRgbGeometryGroups": exact_rgb_groups, "exactRgbRegionReferences": exact_reference_count,
            "exactPngFileGeometryGroups": exact_file_groups,
            "byScale": {scale: dict(counts) for scale, counts in scale_counts.items()},
            "failedRecipeDenominator": trial_count,
            "failedRecipes": [{"geometryKey": r["geometryKey"], "book": r["book"], "pdfOrdinal": r["pdfOrdinal"],
                               "matrixScale": t["matrixScale"], "renderedDimensions": t["renderedDimensions"],
                               "dimensionMatch": t["dimensionMatch"], "exactRgbPixelMatch": t["exactRgbPixelMatch"],
                               "exactFileShaMatch": t["exactFileShaMatch"], "renderedRgbPixelSha256": t["renderedRgbPixelSha256"],
                               "renderedPngSha256": t["renderedPngSha256"],
                               "pixelComparison": t["pixelComparison"]}
                              for r in results for t in r["candidateScaleTrials"] if not t["exactRgbPixelMatch"]],
        },
        "manualSourceFrameReview": {
            "status": "pending-image-inspection",
            "reviewedPositiveGeometryKeys": [],
            "instruction": "Open each exact-positive candidate pixel file and its actual source page/crop individually at native resolution before upgrading the manual frame assessment. Do not infer semantic support, crop completeness, focus adequacy, or default suitability.",
        },
        "geometryResults": results,
        "limits": {
            "noSemanticAssessment": True, "noCropCompletenessAssessment": True,
            "noFocusAssessment": True, "noDefaultAssessment": True,
            "noCatalogOrDataMutation": True,
            "noClaimOfExhaustivenessBeyondPinnedGrid": True,
            "noClaimAboutHistorical726Membership": True,
        },
        "privateCandidatePixelsDirectory": str(private_pixels),
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
    parser.add_argument("--private-root", type=Path, default=Path("/workspace/vault-audit-private/pass8/frame-candidate-v9"))
    parser.add_argument("--proposal", type=Path, default=Path("research/source-audit-pass8-exact-frame-adjudication-proposal.json"))
    parser.add_argument("--output", type=Path, default=Path("research/source-audit-pass8-frame-candidate-v9.json"))
    args = parser.parse_args()
    result = run(args)
    print(json.dumps({"geometries": result["scope"]["geometryCount"],
                      "references": result["scope"]["regionReferenceCount"],
                      "trials": result["trialSummary"]["candidateScaleGeometryTrials"],
                      "exactRgbGroups": result["trialSummary"]["exactRgbGeometryGroups"],
                      "exactRgbRefs": result["trialSummary"]["exactRgbRegionReferences"],
                      "exactPngGroups": result["trialSummary"]["exactPngFileGeometryGroups"],
                      "output": str(args.output.resolve())}, indent=2))


if __name__ == "__main__":
    main()
