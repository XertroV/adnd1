#!/usr/bin/env python3
"""Reproduce current source-frame locator matches; never assess meaning or review flags.

Private inputs: the pinned repository distribution, authorized private PDFs/JPEG,
and the sealed v1 capture. The JSON output contains catalog metadata and pixel
hashes only; it never embeds page or excerpt pixels.
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

INPUT_COMMIT = "6d330af372ac809d11ed6029ed8695d0d8dc0909"
INPUT_DATA_SHA256 = "ceb7c8b9a8fe32b676e57c8d007f124a4490684d54558479e555d504075ba4f3"
V1_TOOL_SHA256 = "27ad7dfd1b12de1fb5ad2843f2a1b8bae2f9d5193768843a2d576d98a30c0cf0"
V1_REPORT_SHA256 = "8747f5ad0100ad3337f0e8240687e5eb4bcea5404237f3ac36dbc1e684198b11"
USAGE_REPORT_SHA256 = "7171680357c28984fedd09e27adda685f6b51615473e600f3e5f0690d4e7eb32"
SOURCE_HASHES = {
    "PHB": ("tsr2010-players-handbook.pdf", "e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095"),
    "DMG": ("DMG_1stEd.pdf", "7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669"),
    "UA": ("Unearthed Arcana.pdf", "e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4"),
    "MM": ("Monster_Manual.pdf", "c586009f2e5231bf022cf9f593b0ee42fcb5bded3c957d90efc6cb8d1e54bd81"),
    "MM2": ("Monster Manual II.pdf", "b49b64590a1e2d61aa4ded3af6c9abd598bd8fc142f1caa8f5d7bef4abc5ff24"),
}
SUPPLEMENT_SOURCE = ("dmg175.jpg", "e4acdde4a9fed34ae4c60945db53a37e9e7d1b3682f967bc83ccc481e63e5ba7")
LOCATOR_FIELDS = (
    "normalizedPageRect", "boundsPdfPoints", "sourcePdfPointsLTRB", "cropProvenance",
    "sourcePageCoordinate", "sourceRowImagePixels", "sourcePixelFrame",
    "sourcePageCropPixelsOnRender", "sourceRenderDpi", "sourceCropFrame",
    "renderFrame", "cropRecipe", "sourceCropBoundsPx", "focusSourcePdfPointsLTRB",
    "approvedCropProposal", "sourceCoordinateSpace",
)
V1_DECLARATION_FIELDS = (
    "normalizedPageRect", "boundsPdfPoints", "sourcePdfPointsLTRB", "cropProvenance",
    "sourcePageCoordinate", "sourceRowImagePixels", "sourcePixelFrame",
    "sourcePageCropPixelsOnRender", "sourceRenderDpi", "sourceCropFrame", "renderFrame",
    "cropRecipe", "sourceCropBoundsPx",
)
BASELINE_EXCLUDED_FIELDS = {"sourceRenderDpi", "sourceCropFrame", "renderFrame", "cropRecipe"}
COMMON_DPI = {72, 96, 100, 120, 144, 150, 180, 200, 216, 240, 288, 300, 360, 400, 432, 450, 500, 600}


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


def normalized(value: object) -> list[float] | None:
    if isinstance(value, dict) and all(k in value for k in ("x", "y", "width", "height")):
        value = [value[k] for k in ("x", "y", "width", "height")]
    if isinstance(value, list) and len(value) == 1:
        return normalized(value[0])
    return list(value) if numeric4(value) else None


def region_declarations(region: dict) -> dict:
    return {k: region[k] for k in LOCATOR_FIELDS if k in region}


def is_v1_candidate(declarations: dict) -> bool:
    return len(set(declarations) - BASELINE_EXCLUDED_FIELDS) > 1


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
        value = region.get(field)
        if numeric4(value):
            recipes.append((field + "-as-canonical-CropBox-points", list(value)))
    return recipes


def direct_replay(page: fitz.Page, clip: list[float], target_rgb: bytes, image_size: tuple[int, int], cache: dict) -> dict:
    if not numeric4(clip) or clip[2] <= clip[0] or clip[3] <= clip[1]:
        return {"state": "unsupported-or-empty-clip", "tested": []}
    key = (page.number, tuple(clip), sha256(target_rgb), image_size)
    if key in cache:
        return cache[key]
    width, height = clip[2] - clip[0], clip[3] - clip[1]
    candidates = set(COMMON_DPI)
    lower = max(36, math.floor(max((image_size[0] - 2) * 72 / width, (image_size[1] - 2) * 72 / height)))
    upper = min(1200, math.ceil(min((image_size[0] + 2) * 72 / width, (image_size[1] + 2) * 72 / height)))
    if upper - lower < 50:
        candidates.update(range(lower, upper + 1))
    tested = []
    for dpi in sorted(candidates):
        device_rect = fitz.Rect(clip) * fitz.Matrix(dpi / 72, dpi / 72)
        if (device_rect.irect.width, device_rect.irect.height) != image_size:
            continue
        pix = page.get_pixmap(dpi=dpi, clip=fitz.Rect(clip), alpha=False, colorspace=fitz.csRGB)
        exact = (pix.width, pix.height) == image_size and pix.samples == target_rgb
        tested.append({
            "dpi": dpi, "dimensions": [pix.width, pix.height],
            "rawRgbSha256": sha256(pix.samples), "exactPixels": exact,
            "rasterOrigin": [pix.x, pix.y],
        })
    matches = [x for x in tested if x["exactPixels"]]
    answer = {"state": "exact-pixel-replay" if matches else "no-exact-pixel-match-in-tested-recipes", "tested": tested, "matches": matches}
    cache[key] = answer
    return answer


def image_comparison(actual: Image.Image, target: Image.Image) -> dict:
    a = actual.convert("RGB")
    b = target.convert("RGB")
    same_size = a.size == b.size
    same_pixels = same_size and a.tobytes() == b.tobytes()
    diff_channels = None
    if same_size and not same_pixels:
        aa = memoryview(a.tobytes())
        bb = memoryview(b.tobytes())
        diff_channels = sum(x != y for x, y in zip(aa, bb))
    return {
        "dimensions": list(a.size), "targetDimensions": list(b.size),
        "rawRgbSha256": sha256(a.tobytes()), "targetRawRgbSha256": sha256(b.tobytes()),
        "exactPixels": same_pixels, "differingRgbChannels": diff_channels,
    }


def run(args: argparse.Namespace) -> dict:
    repo = args.repo.resolve()
    sources = args.sources.resolve()
    private_output = args.private_output.resolve()
    base_before = args.v1_report.resolve()
    usage_file = args.usage_report.resolve()

    commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=repo, text=True).strip()
    data_path = repo / "dist/data.json"
    data_hash = file_sha(data_path)
    require(commit == INPUT_COMMIT, f"input commit drift: {commit}")
    require(data_hash == INPUT_DATA_SHA256, f"input dist/data.json drift: {data_hash}")
    require(file_sha(base_before) == V1_REPORT_SHA256, "sealed v1 frame report hash drift")
    require(file_sha(usage_file) == USAGE_REPORT_SHA256, "source-visual usage input hash drift")

    old = json.loads(base_before.read_text())
    usage_report = json.loads(usage_file.read_text())
    require(old["inputCommit"] == INPUT_COMMIT and old["inputDataSha256"] == data_hash, "v1 input pin mismatch")
    # The source-visual report pins a canonical parsed-data object hash, while this
    # verifier also pins raw dist/data.json bytes. Preserve both axes and derive the
    # current owner-use multiset from the pinned current dist/data.json.
    expected_sources = {}
    docs = {}
    for book, (filename, expected_hash) in SOURCE_HASHES.items():
        path = sources / filename
        actual_hash = file_sha(path)
        require(actual_hash == expected_hash, f"private source hash mismatch for {book}: {actual_hash}")
        expected_sources[book] = {"filename": filename, "sha256": actual_hash}
        docs[book] = fitz.open(path)
    supplement_path = sources / SUPPLEMENT_SOURCE[0]
    supplement_hash = file_sha(supplement_path)
    require(supplement_hash == SUPPLEMENT_SOURCE[1], f"DMG p.175 supplement source hash mismatch: {supplement_hash}")
    expected_sources["DMG-175-supplement-image"] = {"filename": SUPPLEMENT_SOURCE[0], "sha256": supplement_hash, "notPdf": True}

    tool_path = Path(__file__).resolve()
    tool_hash = file_sha(tool_path)
    current_data = json.loads(data_path.read_text())
    canonical_data_hash = sha256(json.dumps(current_data, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
    require(usage_report["inputDataSha256"] == canonical_data_hash, "source-visual report canonical data-object hash mismatch")
    usages = []
    for collection, records in current_data.items():
        if not isinstance(records, list):
            continue
        for item in records:
            for binding in ("sourceExcerpts", "scanVerification"):
                owner = item.get(binding)
                if not isinstance(owner, dict) or not owner.get("catalog"):
                    continue
                for review in owner.get("regionReviews", []):
                    usages.append({
                        "collection": collection, "itemId": item.get("id"), "binding": binding,
                        "catalog": owner["catalog"], "regionId": review.get("regionId"),
                        "imageSha256": review.get("imageSha256"), "sourceSha256": review.get("sourceSha256"),
                    })
    explainer = current_data.get("progressionExplainer")
    if isinstance(explainer, dict):
        for binding in ("sourceExcerpts", "scanVerification"):
            owner = explainer.get(binding)
            if isinstance(owner, dict) and owner.get("catalog"):
                for review in owner.get("regionReviews", []):
                    usages.append({
                        "collection": "progressionExplainer", "itemId": explainer.get("id"), "binding": binding,
                        "catalog": owner["catalog"], "regionId": review.get("regionId"),
                        "imageSha256": review.get("imageSha256"), "sourceSha256": review.get("sourceSha256"),
                    })
    require(len(usages) == 3399, f"current owner-use denominator drift: {len(usages)}")
    use_map: dict[tuple[str, str], list[dict]] = collections.defaultdict(list)
    for use in usages:
        use_map[(use["catalog"], use["regionId"])].append({k: use.get(k) for k in ("collection", "itemId", "binding", "imageSha256", "sourceSha256")})

    all_catalogs = sorted((repo / "dist/scans").rglob("*.json"))
    all_regions: list[dict] = []
    candidates: list[dict] = []
    all_field_counts: collections.Counter = collections.Counter()
    candidate_field_counts: collections.Counter = collections.Counter()
    v1_lookup = {(r["catalog"], r["regionId"]): r for r in old["records"]}
    current_lookup = {}
    for path in all_catalogs:
        catalog = json.loads(path.read_text())
        relative = str(path.relative_to(repo / "dist"))
        catalog_sha = file_sha(path)
        for ordinal, region in enumerate(catalog.get("regions", [])):
            declarations = region_declarations(region)
            all_field_counts.update(k for k in declarations)
            image_path = path.parent / region["image"]
            image_bytes = image_path.read_bytes()
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            row = {
                "catalog": relative, "catalogSha256": catalog_sha, "regionOrdinal": ordinal,
                "regionId": region["id"], "book": region["book"], "printedPage": region["printedPage"],
                "pdfPage": region.get("pdfPage"), "image": region["image"],
                "imageSha256": sha256(image_bytes), "declaredImageSha256": region.get("sha256"),
                "imageHashMatches": sha256(image_bytes) == region.get("sha256"),
                "imageDimensions": list(image.size), "imageRawRgbSha256": sha256(image.tobytes()),
                "declarations": declarations, "uses": use_map.get((relative, region["id"]), []),
            }
            all_regions.append(row)
            current_lookup[(relative, region["id"])] = (row, region, image)
            if is_v1_candidate(declarations):
                candidates.append(row)
                candidate_field_counts.update(declarations.keys())
    require(len(all_catalogs) == 1020, f"catalog count drift: {len(all_catalogs)}")
    require(len(all_regions) == 3396, f"region count drift: {len(all_regions)}")
    require(len(candidates) == 740, f"v1 candidate universe drift: {len(candidates)}")
    require(sum(len(r["uses"]) for r in candidates) == 743, "v1 candidate owner-use count drift")
    require(set(v1_lookup) == {k for k in current_lookup if is_v1_candidate(current_lookup[k][0]["declarations"])}, "current candidate IDs differ from sealed v1 universe")
    def owner_use_tuple(use: dict) -> tuple:
        return tuple(use.get(k) for k in ("catalog", "regionId", "collection", "itemId", "binding", "imageSha256", "sourceSha256"))
    old_candidate_uses = [owner_use_tuple({**use, "catalog": key[0], "regionId": key[1]}) for key, old_row in v1_lookup.items() for use in old_row["usages"]]
    current_candidate_uses = [owner_use_tuple(use) for use in usages if (use["catalog"], use["regionId"]) in v1_lookup]
    require(collections.Counter(old_candidate_uses) == collections.Counter(current_candidate_uses), "current dist/data owner uses differ from sealed v1 candidate-use census")

    identity_mismatches = []
    image_hash_mismatches = []
    for row in candidates:
        key = (row["catalog"], row["regionId"])
        _, region, image = current_lookup[key]
        if not row["imageHashMatches"]:
            image_hash_mismatches.append(key)
        if row["catalogSha256"] != v1_lookup[key]["catalogSha256"]:
            identity_mismatches.append({"kind": "catalog-bytes", "key": key})
        if row["imageSha256"] != v1_lookup[key]["imageSha256"]:
            identity_mismatches.append({"kind": "image-bytes", "key": key})
        v1_projection = {k: row["declarations"][k] for k in V1_DECLARATION_FIELDS if k in row["declarations"]}
        if v1_projection != v1_lookup[key]["declarations"]:
            identity_mismatches.append({"kind": "locator-declarations", "key": key})
        expected_source_hash = supplement_hash if region.get("sourceCoordinateSpace", "").startswith("supplement-image") else SOURCE_HASHES[region["book"]][1]
        for use in row["uses"]:
            if use.get("imageSha256") != row["imageSha256"] or use.get("sourceSha256") != expected_source_hash:
                identity_mismatches.append({"kind": "owner-use-source-or-image-hash", "key": key, "use": use})
    require(not image_hash_mismatches, f"candidate image identity failures: {len(image_hash_mismatches)}")
    require(not identity_mismatches, f"candidate source/catalog/use identity failures: {len(identity_mismatches)}")

    direct_cache = {}
    direct_records = []
    old_direct_exact = 0
    old_all_decl_replayed = 0
    recipe_field_results: dict[str, collections.Counter] = collections.defaultdict(collections.Counter)
    for row in candidates:
        key = (row["catalog"], row["regionId"])
        _, region, image = current_lookup[key]
        book = region["book"]
        pdf_page = region.get("pdfPage")
        direct_results = []
        if book in docs and isinstance(pdf_page, int) and 1 <= pdf_page <= len(docs[book]):
            page = docs[book][pdf_page - 1]
            for label, clip in pdf_clips(region, page):
                result = direct_replay(page, clip, image.tobytes(), image.size, direct_cache)
                direct_results.append({"interpretation": label, "clipLTRB": clip, **result})
                field = label.split("-as-", 1)[0] if "-as-" in label else "normalizedPageRect"
                recipe_field_results[field]["testedRows"] += 1
                if result["state"] == "exact-pixel-replay":
                    recipe_field_results[field]["exactRows"] += 1
            exact = [r for r in direct_results if r["state"] == "exact-pixel-replay"]
            all_replayed = bool(direct_results) and len(exact) == len(direct_results)
            if exact:
                old_direct_exact += 1
            if all_replayed:
                old_all_decl_replayed += 1
            old_row = v1_lookup[key]
            old_claim_exact = old_row["frameAssessment"] == "at-least-one-coordinate-declaration-exactly-replayed"
            require(bool(exact) == old_claim_exact, f"sealed v1 replay disposition does not reproduce for {key}")
            require(all_replayed == bool(old_row.get("allComparedDeclarationsReplayed")), f"sealed v1 all-declarations result does not reproduce for {key}")
        else:
            page = None
            all_replayed = False
        direct_records.append({"key": [row["catalog"], row["regionId"]], "directRecipes": direct_results, "allDirectDeclarationsReplayed": all_replayed})
    require(old_direct_exact == 654 and old_all_decl_replayed == 654, f"654 v1 direct matches did not reproduce: {old_direct_exact}/{old_all_decl_replayed}")

    # Generate a full page only for explicitly declared frame recipes. Full-page renders
    # are held in memory/temp locations and never copied into the repository.
    fullpage_cache: dict[tuple[str, int, int, str], Image.Image] = {}
    poppler_exe = shutil.which("pdftoppm")
    require(poppler_exe is not None, "pdftoppm is required for the recorded UA p.27 frame")
    poppler_version = subprocess.run([poppler_exe, "-v"], text=True, capture_output=True, check=False)
    poppler_version_text = (poppler_version.stderr or poppler_version.stdout).strip()

    def full_page(book: str, page_no: int, dpi: int, renderer: str) -> Image.Image:
        cache_key = (book, page_no, dpi, renderer)
        if cache_key in fullpage_cache:
            return fullpage_cache[cache_key]
        source = sources / SOURCE_HASHES[book][0]
        if renderer == "pymupdf":
            pix = docs[book][page_no - 1].get_pixmap(dpi=dpi, alpha=False, colorspace=fitz.csRGB)
            result = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        elif renderer == "poppler-pdftoppm":
            with tempfile.TemporaryDirectory(prefix="source-frame-p8-") as temp_dir:
                prefix = Path(temp_dir) / "page"
                subprocess.run([
                    poppler_exe, "-f", str(page_no), "-l", str(page_no), "-r", str(dpi),
                    "-png", "-singlefile", str(source), str(prefix),
                ], check=True, capture_output=True)
                rendered = Image.open(prefix.with_suffix(".png"))
                result = rendered.convert("RGB").copy()
        else:
            raise AssertionError(f"unsupported renderer {renderer}")
        fullpage_cache[cache_key] = result
        return result

    augmented_rows = []
    family_counts = collections.Counter()
    armor_target_sha = "21bd9cfa05b68f320eeb52d937f6923834e999977671ec9131bbada73ef2f45c"
    notes_target_sha = "19783dde2e5c0bb3c31c0e5b0417af2444cc8ecc22d3a411bf7df99e8c8f5db4"
    for row in candidates:
        key = (row["catalog"], row["regionId"])
        _, region, image = current_lookup[key]
        declarations = row["declarations"]
        extra = None
        if region.get("sourcePixelFrame"):
            frame = region["sourcePixelFrame"]
            source_digest = frame.get("sourcePdfSha256")
            require(source_digest == SOURCE_HASHES[region["book"]][1], f"sourcePixelFrame source hash mismatch for {key}")
            page_no = frame.get("pdfPage")
            dpi = frame.get("renderDpi")
            full = full_page(region["book"], page_no, dpi, "pymupdf")
            require(list(full.size) == frame.get("fullPagePixels"), f"full-page dimensions differ from sourcePixelFrame for {key}")
            l, t, r, b = frame["actualPixelLTRB"]
            crop = full.crop((l, t, r, b))
            comparison = image_comparison(crop, image)
            nominal = frame.get("nominalPdfClipPoints")
            effective = frame.get("effectivePdfBoundsFromPixelEdges")
            px_to_pt = 72 / dpi
            computed_effective = [l * px_to_pt, t * px_to_pt, r * px_to_pt, b * px_to_pt]
            require(all(abs(a - b) < 1e-7 for a, b in zip(computed_effective, effective)), f"sourcePixelFrame quantized edges mismatch for {key}")
            n = normalized(region.get("normalizedPageRect"))
            page = docs[region["book"]][page_no - 1]
            projected_pixels = [n[0] * full.width, n[1] * full.height, (n[0] + n[2]) * full.width, (n[1] + n[3]) * full.height]
            extra = {
                "recipeFamily": "full-page-pymupdf-raster-crop",
                "renderer": f"PyMuPDF {fitz.VersionBind}", "pageNo": page_no, "dpi": dpi,
                "fullPagePixels": list(full.size), "cropLTRBPixels": [l, t, r, b],
                "nominalPdfClipPoints": nominal, "effectivePdfBoundsFromPixelEdges": effective,
                "normalizedPageRectProjectedPixels": projected_pixels,
                "imageComparison": comparison,
                "boundsPdfPointsInterpretation": "Nominal clip coordinates; full-page raster crop lands on integer device edges. Effective pixel-edge bounds remain separately recorded as quantization, not a coordinate conflict.",
            }
            family_counts["sourcePixelFrame-full-page-pymupdf"] += int(comparison["exactPixels"])
        elif declarations.get("sourcePageCropPixelsOnRender"):
            frame = region["sourcePageCropPixelsOnRender"]
            page_no = region["pdfPage"]
            dpi = region.get("sourceRenderDpi", 160)
            require(region["book"] == "UA" and region["printedPage"] == 27 and page_no == 28 and row["imageSha256"] == notes_target_sha, f"unrecognized sourcePageCropPixelsOnRender row: {key}")
            full = full_page(region["book"], page_no, dpi, "poppler-pdftoppm")
            l, t, w, h = frame["x"], frame["y"], frame["width"], frame["height"]
            crop = full.crop((l, t, l + w, t + h))
            comparison = image_comparison(crop, image)
            n = normalized(region["normalizedPageRect"])
            projected_pixels = [n[0] * full.width, n[1] * full.height, (n[0] + n[2]) * full.width, (n[1] + n[3]) * full.height]
            require(all(abs(a - b) < 1e-6 for a, b in zip(projected_pixels, [l, t, l + w, t + h])), f"UA p.27 normalized/pixel crop declarations disagree for {key}")
            extra = {
                "recipeFamily": "full-page-poppler-raster-then-PIL-crop",
                "renderer": poppler_version_text, "pageNo": page_no, "dpi": dpi,
                "fullPagePixels": list(full.size), "cropLTRBPixels": [l, t, l + w, t + h],
                "normalizedPageRectProjectedPixels": projected_pixels,
                "imageComparison": comparison,
                "pymupdfSameDimensionsButDifferentPixels": True,
            }
            # Keep the failed alternate renderer outcome visible; it is not used as a pass.
            fitz_full = full_page(region["book"], page_no, dpi, "pymupdf")
            fitz_crop = fitz_full.crop((l, t, l + w, t + h))
            extra["pymupdfAlternateComparison"] = image_comparison(fitz_crop, image)
            family_counts["sourcePageCropPixelsOnRender-poppler"] += int(comparison["exactPixels"])
        elif declarations.get("sourceCropBoundsPx"):
            coordinate_space = region.get("sourceCoordinateSpace", "")
            require(coordinate_space.startswith("supplement-image"), f"sourceCropBoundsPx without typed source image coordinate space: {key}")
            require(region.get("pdfPage") is None, f"supplement-image crop assigned a PDF page: {key}")
            l, t, r, b = region["sourceCropBoundsPx"]
            source = Image.open(supplement_path).convert("RGB")
            crop = source.crop((l, t, r, b))
            comparison = image_comparison(crop, image)
            n = normalized(region["normalizedPageRect"])
            projected = [n[0] * source.width, n[1] * source.height, (n[0] + n[2]) * source.width, (n[1] + n[3]) * source.height]
            require(all(abs(a - b) < 1e-6 for a, b in zip(projected, [l, t, r, b])), f"supplement normalized/page crop declarations disagree for {key}")
            extra = {
                "recipeFamily": "supplement-source-jpeg-pil-crop-not-pdf",
                "sourceImageSha256": supplement_hash, "sourceImageDimensions": list(source.size),
                "cropLTRBPixels": [l, t, r, b], "coordinateSpace": coordinate_space,
                "normalizedPageRectProjectedPixels": projected,
                "imageComparison": comparison,
                "pdfOrdinal": None,
            }
            family_counts["sourceCropBoundsPx-private-jpeg"] += int(comparison["exactPixels"])
        direct_exact_count = sum(
            r["state"] == "exact-pixel-replay"
            for r in next(x for x in direct_records if tuple(x["key"]) == key)["directRecipes"]
        )
        if extra and extra["imageComparison"]["exactPixels"]:
            frame_status = extra["recipeFamily"]
        elif direct_exact_count:
            frame_status = "direct-exact-pdf-clip"
        else:
            frame_status = "unresolved"
        augmented_rows.append({
            "key": [row["catalog"], row["regionId"]],
            "book": row["book"], "printedPage": row["printedPage"], "pdfPage": row["pdfPage"],
            "imageSha256": row["imageSha256"], "imageDimensions": row["imageDimensions"],
            "declarations": declarations, "currentOwnerUses": row["uses"],
            "oldDirectFrameAssessment": v1_lookup[key]["frameAssessment"],
            "directRecipeExactCount": direct_exact_count,
            "directRecipes": next(x for x in direct_records if tuple(x["key"]) == key)["directRecipes"],
            "augmentedFrameStatus": frame_status,
            "augmentedRecipe": extra,
            "semanticSourceApproval": False,
        })

    # Verify all current records carrying explicit rendered-frame metadata outside the
    # original redundant-locator candidate set, without changing that frozen denominator.
    extension_records = []
    for row in all_regions:
        key = (row["catalog"], row["regionId"])
        _, region, image = current_lookup[key]
        if is_v1_candidate(row["declarations"]):
            continue
        if "sourceRenderDpi" in region and "sourceCropFrame" in region:
            page = docs[region["book"]][region["pdfPage"] - 1]
            require(row["imageHashMatches"], f"explicit DPI frame image hash mismatch for {key}")
            expected_source_hash = SOURCE_HASHES[region["book"]][1]
            require(all(u.get("imageSha256") == row["imageSha256"] and u.get("sourceSha256") == expected_source_hash for u in row["uses"]), f"explicit DPI frame owner source hash mismatch for {key}")
            clips = pdf_clips(region, page)
            require(clips, f"explicit DPI frame lacks a numeric source clip: {key}")
            # These records carry a recorded render DPI; compare every currently declared
            # numeric clip at that exact DPI and RGB mode.
            outcomes = []
            for label, clip in clips:
                pix = page.get_pixmap(dpi=region["sourceRenderDpi"], clip=fitz.Rect(clip), alpha=False, colorspace=fitz.csRGB)
                outcomes.append({"interpretation": label, "dpi": region["sourceRenderDpi"], "dimensions": [pix.width, pix.height], "exactPixels": (pix.width, pix.height) == image.size and pix.samples == image.tobytes()})
            require(any(x["exactPixels"] for x in outcomes), f"explicit DPI frame recipe failed for {key}")
            extension_records.append({"key": [row["catalog"], row["regionId"]], "book": row["book"], "printedPage": row["printedPage"], "pdfPage": row["pdfPage"], "imageSha256": row["imageSha256"], "declarations": row["declarations"], "type": "sourceRenderDpi+sourceCropFrame", "exact": True, "testedRecipes": outcomes})
        if "cropRecipe" in region:
            recipe = region["cropRecipe"]
            require(row["imageHashMatches"], f"cropRecipe image hash mismatch for {key}")
            expected_source_hash = SOURCE_HASHES[region["book"]][1]
            require(all(u.get("imageSha256") == row["imageSha256"] and u.get("sourceSha256") == expected_source_hash for u in row["uses"]), f"cropRecipe owner source hash mismatch for {key}")
            require(recipe["sourceSha256"] == SOURCE_HASHES[region["book"]][1], f"cropRecipe source hash mismatch for {key}")
            page = docs[region["book"]][region["pdfPage"] - 1]
            full_pix = page.get_pixmap(dpi=recipe["renderDpi"], alpha=False, colorspace=fitz.csRGB)
            require((full_pix.width, full_pix.height) == (recipe["sourceRenderWidth"], recipe["sourceRenderHeight"]), f"cropRecipe full-page dimensions mismatch for {key}")
            require(sha256(full_pix.samples) == recipe["sourceRenderRgbSha256"], f"cropRecipe full-page RGB hash mismatch for {key}")
            full_image = Image.frombytes("RGB", (full_pix.width, full_pix.height), full_pix.samples)
            crop = full_image.crop(tuple(recipe["sourceCropBoundsPixelsXYXY"]))
            comparison = image_comparison(crop, image)
            require(comparison["exactPixels"], f"cropRecipe pixel recipe failed for {key}")
            extension_records.append({"key": [row["catalog"], row["regionId"]], "book": row["book"], "printedPage": row["printedPage"], "pdfPage": row["pdfPage"], "imageSha256": row["imageSha256"], "declarations": row["declarations"], "type": "cropRecipe-full-page-raster-crop", "exact": True, "dpi": recipe["renderDpi"], "fullPagePixels": [full_pix.width, full_pix.height], "cropLTRBPixels": recipe["sourceCropBoundsPixelsXYXY"], "sourceRenderRgbSha256": recipe["sourceRenderRgbSha256"], "imageComparison": comparison})

    # The source-page normalized row rectangle and image-local integer row bounds are
    # independently declared. Check their affine mapping for every such current row.
    row_locator_checks = []
    for row in candidates:
        _, region, image = current_lookup[(row["catalog"], row["regionId"])]
        source_coord = region.get("sourcePageCoordinate")
        local = region.get("sourceRowImagePixels")
        if source_coord is None and local is None:
            continue
        require(source_coord is not None and local is not None, f"one-sided row locator for {row['regionId']}")
        require(source_coord.get("printedPage") == region["printedPage"] and source_coord.get("pdfPage") == region.get("pdfPage"), f"row locator page identity mismatch for {row['regionId']}")
        require(source_coord.get("space") == "original-printed-page-render" and source_coord.get("origin") == "top-left" and source_coord.get("units") == "normalized" and source_coord.get("format") == "xywh", f"row locator coordinate space drift for {row['regionId']}")
        n = normalized(region.get("normalizedPageRect"))
        q = source_coord["rect"]
        w, h = image.size
        projected = {
            "x": (q["x"] - n[0]) / n[2] * w,
            "y": (q["y"] - n[1]) / n[3] * h,
            "width": q["width"] / n[2] * w,
            "height": q["height"] / n[3] * h,
        }
        deltas = {k: projected[k] - local[k] for k in projected}
        in_bounds = local["x"] >= 0 and local["y"] >= 0 and local["width"] > 0 and local["height"] > 0 and local["x"] + local["width"] <= w and local["y"] + local["height"] <= h
        exact = in_bounds and all(abs(v) < 1e-6 for v in deltas.values())
        row_locator_checks.append({"key": [row["catalog"], row["regionId"]], "projectedImagePixels": projected, "recordedSourceRowImagePixels": local, "delta": deltas, "exactAffineAgreement": exact})
    require(len(row_locator_checks) == 91 and all(x["exactAffineAgreement"] for x in row_locator_checks), "sourcePageCoordinate/sourceRowImagePixels affine check not exact for all 91 rows")

    # Validate declared PDF page frames used by the three matrix records independently
    # from their image clip and region-level source geometry.
    render_frame_results = []
    for row in candidates:
        key = (row["catalog"], row["regionId"])
        _, region, image = current_lookup[key]
        frame = region.get("renderFrame")
        if frame is None:
            continue
        page = docs[region["book"]][region["pdfPage"] - 1]
        expected = {
            "mediaBoxPoints": list(page.mediabox), "cropBoxPoints": list(page.cropbox),
            "pageRectPoints": list(page.rect), "pageRotation": page.rotation,
        }
        matches = all(frame.get(field) == value for field, value in expected.items())
        expected_matrix = [frame["renderDpi"] / 72, frame["renderDpi"] / 72]
        matches = matches and frame.get("renderMatrix") == expected_matrix
        require(matches, f"renderFrame source page metadata mismatch for {key}")
        render_frame_results.append({"key": [row["catalog"], row["regionId"]], "declared": frame, "currentPdfPageBoxesMatch": True, "matrixMatchesDpi": True})
    require(len(render_frame_results) == 3, "expected 3 renderFrame records")

    # Reproduce typed crop provenance: the 5 records with an explicit sourcePixelReplay
    # declaration name a direct clip, a source PDF hash, DPI, and actual device bounds.
    crop_provenance_results = []
    for row in candidates:
        key = (row["catalog"], row["regionId"])
        _, region, image = current_lookup[key]
        provenance = region.get("cropProvenance")
        if provenance is None:
            continue
        require(provenance["sourcePdfSha256"] == SOURCE_HASHES[region["book"]][1], f"cropProvenance source hash mismatch for {key}")
        page = docs[region["book"]][region["pdfPage"] - 1]
        clip = provenance["requestedPdfClipLTRB"]
        dpi = provenance["renderDpi"]
        pix = page.get_pixmap(dpi=dpi, clip=fitz.Rect(clip), alpha=False, colorspace=fitz.csRGB)
        rect = fitz.Rect(clip) * fitz.Matrix(dpi / 72, dpi / 72)
        bounds = [rect.irect.x0, rect.irect.y0, rect.irect.x1, rect.irect.y1]
        result = {
            "key": [row["catalog"], row["regionId"]], "requestedPdfClipLTRB": clip,
            "dpi": dpi, "computedDeviceBoundsLTRB": bounds,
            "declaredDeviceBoundsLTRB": provenance["actualDeviceBoundsPixelsLTRB"],
            "dimensions": [pix.width, pix.height], "declaredDimensions": provenance["imageDimensionsPx"],
            "exactPixels": (pix.width, pix.height) == image.size and pix.samples == image.tobytes(),
            "rendererVersionMatches": provenance.get("renderer") == f"PyMuPDF {fitz.VersionBind}",
        }
        require(bounds == provenance["actualDeviceBoundsPixelsLTRB"] and [pix.width, pix.height] == provenance["imageDimensionsPx"] and result["exactPixels"] and result["rendererVersionMatches"], f"cropProvenance replay failed for {key}")
        crop_provenance_results.append(result)
    require(len(crop_provenance_results) == 5, "expected 5 cropProvenance rows")

    # Negative controls exercise the detector gates against known exact recipes.
    armor_rows = [r for r in candidates if r["imageSha256"] == armor_target_sha]
    note_rows = [r for r in candidates if r["imageSha256"] == notes_target_sha]
    require(len(armor_rows) == 16 and len(note_rows) == 68, "targeted full-page crop cohort changed")
    _, armor_region, armor_target = current_lookup[(armor_rows[0]["catalog"], armor_rows[0]["regionId"])]
    armor_frame = armor_region["sourcePixelFrame"]
    armor_full = full_page("UA", 76, 300, "pymupdf")
    l, t, r, b = armor_frame["actualPixelLTRB"]
    shifted_crop = armor_full.crop((l + 1, t, r + 1, b))
    shifted = image_comparison(shifted_crop, armor_target)
    require(not shifted["exactPixels"], "negative control failed to detect a one-pixel-shifted crop")
    wrong_book_pix = docs["PHB"][75].get_pixmap(dpi=300, alpha=False, colorspace=fitz.csRGB)
    wrong_book_full = Image.frombytes("RGB", (wrong_book_pix.width, wrong_book_pix.height), wrong_book_pix.samples)
    wrong_book_crop = wrong_book_full.crop((l, t, r, b))
    wrong_book = image_comparison(wrong_book_crop, armor_target)
    require(not wrong_book["exactPixels"], "negative control failed to detect the wrong-book source")

    def identity_gate(actual_image_sha: str, declared_image_sha: str, actual_source_sha: str, declared_source_sha: str) -> bool:
        return actual_image_sha == declared_image_sha and actual_source_sha == declared_source_sha

    wrong_image_hash_gate = identity_gate(armor_rows[0]["imageSha256"], "0" * 64, SOURCE_HASHES["UA"][1], SOURCE_HASHES["UA"][1])
    wrong_source_hash_gate = identity_gate(armor_rows[0]["imageSha256"], armor_rows[0]["imageSha256"], SOURCE_HASHES["UA"][1], "0" * 64)
    require(not wrong_image_hash_gate and not wrong_source_hash_gate, "identity-hash negative control failed")

    current_status = collections.Counter(x["augmentedFrameStatus"] for x in augmented_rows)
    require(current_status == collections.Counter({
        "direct-exact-pdf-clip": 654,
        "full-page-pymupdf-raster-crop": 16,
        "full-page-poppler-raster-then-PIL-crop": 68,
        "supplement-source-jpeg-pil-crop-not-pdf": 2,
    }), f"current frame result totals unexpected: {current_status}")
    require(all(x["augmentedFrameStatus"] != "unresolved" for x in augmented_rows), "current candidate frame rows remain unresolved")
    extension_keys = {tuple(x["key"]) for x in extension_records}
    candidate_keys = {(x["catalog"], x["regionId"]) for x in candidates}
    require(not (extension_keys & candidate_keys), "extended frame rows overlap the frozen candidate denominator")

    full_frame_field_counts = collections.Counter(k for row in all_regions for k in row["declarations"])
    # Focus rectangles are image-local focus geometry, not source-frame replay inputs.
    focus_rect_regions = 0
    for path in all_catalogs:
        for region in json.loads(path.read_text()).get("regions", []):
            if "focusRects" in region:
                focus_rect_regions += 1
    require(focus_rect_regions == 3396, f"focusRects structural denominator drift: {focus_rect_regions}")

    report = {
        "schemaVersion": 2,
        "artifactType": "current source-frame locator replay; structural pixel identity only, not semantic source approval",
        "input": {
            "commit": commit, "distDataSha256": data_hash,
            "distDataCanonicalObjectSha256": canonical_data_hash,
            "v1ToolSha256": V1_TOOL_SHA256, "v1ReportSha256": V1_REPORT_SHA256,
            "v2ToolSha256": tool_hash,
            "usageInputSha256": USAGE_REPORT_SHA256,
            "usageReportInputDataSha256": usage_report.get("inputDataSha256"),
            "usageReportDataHashMeaning": "canonical parsed-data object hash; distinct from raw dist/data.json byte hash",
            "currentOwnerUsesDerivedFrom": "pinned dist/data.json; candidate multiset exactly matches v1 captured uses",
            "repositoryRoot": str(repo),
        },
        "privateSources": expected_sources,
        "runtime": {
            "pymupdf": fitz.VersionBind,
            "pillow": Image.__version__ if hasattr(Image, "__version__") else __import__("PIL").__version__,
            "pdftoppm": poppler_version_text,
            "pixelMode": "RGB, alpha false; PIL crop compares raw RGB bytes",
            "instrumentation": "Read-only Python verifier; no application instrumentation or catalog/data mutations.",
        },
        "denominators": {
            "catalogs": len(all_catalogs), "allCurrentRegionRows": len(all_regions),
            "v1RedundantLocatorCandidateRows": len(candidates),
            "candidateLinkedOwnerUses": sum(len(r["uses"]) for r in candidates),
            "allCurrentOwnerUses": len(usages),
            "sourceRenderDpiSourceCropFrameRowsOutsideV1CandidateSet": sum("sourceRenderDpi" in current_lookup[(r["catalog"], r["regionId"])][1] and "sourceCropFrame" in current_lookup[(r["catalog"], r["regionId"])][1] and not is_v1_candidate(r["declarations"]) for r in all_regions),
            "cropRecipeRowsOutsideV1CandidateSet": sum("cropRecipe" in current_lookup[(r["catalog"], r["regionId"])][1] and not is_v1_candidate(r["declarations"]) for r in all_regions),
            "historicalUnknownFrameFullMemberCensus": {"denominator": 726, "status": "unavailable-in-current-archival-path; no individual closure claim"},
            "otherCurrentRegionRowsOutsideReplayCohorts": len(all_regions) - len(candidates) - len(extension_records),
        },
        "fieldCoverage": {
            "allCurrentRegions": dict(sorted(full_frame_field_counts.items())),
            "v1RedundantLocatorCandidateRows": dict(sorted(candidate_field_counts.items())),
            "focusRects": {"allCurrentRegionRows": focus_rect_regions, "meaning": "image-local highlight geometry; relevance, precision and semantic scope not assessed here"},
        },
        "identityValidation": {
            "candidateRowsWithCatalogImageShaMatch": sum(bool(r["imageHashMatches"]) for r in candidates),
            "candidateRows": len(candidates),
            "currentCandidateOwnerUseRecords": sum(len(r["uses"]) for r in candidates),
            "candidateOwnerUseImageAndSourceHashMatches": sum(
                use.get("imageSha256") == row["imageSha256"]
                and use.get("sourceSha256") == (supplement_hash if current_lookup[(row["catalog"], row["regionId"])][1].get("sourceCoordinateSpace", "").startswith("supplement-image") else SOURCE_HASHES[row["book"]][1])
                for row in candidates for use in row["uses"]
            ),
            "candidateUsesExactlyMatchSealedV1Multiset": True,
            "allCurrentOwnerUseRecords": len(usages),
            "sourceIdentityFilesHashChecked": {k: v["sha256"] for k, v in expected_sources.items()},
        },
        "replay": {
            "v1DirectRgbReplayReproduced": {
                "rowsWithAtLeastOneExactDirectPdfClip": old_direct_exact,
                "rowsWithEveryV1ComparedCoordinateDeclarationExact": old_all_decl_replayed,
                "failureRowsPreserved": 86,
                "historicalStatus": "replayed-from-sealed-v1-capture; now reproduced by current runner; not reconstructed from altered active data",
            },
            "augmentedCurrentCandidates": {
                "rowsByExactRecipeFamily": dict(sorted(current_status.items())),
                "unresolvedCoordinateFrameRows": current_status.get("unresolved", 0),
                "semanticsApproved": False,
                "recipeFieldExactCounts": {k: dict(v) for k, v in sorted(recipe_field_results.items())},
            },
            "additionalExplicitFrameRowsOutsideV1CandidateUniverse": {
                "sourceRenderDpiPlusSourceCropFrameRows": sum(x["type"] == "sourceRenderDpi+sourceCropFrame" for x in extension_records),
                "cropRecipeRows": sum(x["type"] == "cropRecipe-full-page-raster-crop" for x in extension_records),
                "exactRows": len(extension_records),
                "unresolvedRows": 0,
            },
            "sourcePageCoordinateToSourceRowImagePixels": {
                "rows": len(row_locator_checks), "exactAffineAgreementRows": sum(x["exactAffineAgreement"] for x in row_locator_checks),
                "interpretation": "stored normalized source-page row rectangles map exactly into stored integer image-local row rectangles; no reading or focus relevance inferred",
            },
            "cropProvenance": {"rows": len(crop_provenance_results), "exactDirectClipReplays": sum(x["exactPixels"] for x in crop_provenance_results)},
            "renderFrame": {"rows": len(render_frame_results), "sourcePdfPageBoxAndMatrixMatches": sum(x["currentPdfPageBoxesMatch"] and x["matrixMatchesDpi"] for x in render_frame_results)},
        },
        "negativeControls": {
            "onePixelShiftedArmorCrop": {"exactPixels": shifted["exactPixels"], "differingRgbChannels": shifted["differingRgbChannels"], "detected": not shifted["exactPixels"]},
            "wrongBookSamePageNumberAndPixelBounds": {"sourceBook": "PHB", "wrongSourceSha256": SOURCE_HASHES["PHB"][1], "exactPixels": wrong_book["exactPixels"], "differingRgbChannels": wrong_book["differingRgbChannels"], "detected": not wrong_book["exactPixels"]},
            "wrongImageHash": {"declaredImageSha256": "0" * 64, "detected": not wrong_image_hash_gate},
            "wrongSourceHash": {"declaredSourceSha256": "0" * 64, "detected": not wrong_source_hash_gate},
        },
        "typedSupplementalImageCrops": [
            {
                "regionId": "dmg-175-party-table-context-78c4c383c38c7d10",
                "sourceCoordinateSpace": "supplement-image pixels; top-left origin; LTRB half-open",
                "pdfOrdinal": None, "sourceImage": "dmg175.jpg", "sourceImageSha256": supplement_hash,
                "sourceCropBoundsPixels": [0, 1145, 635, 1635], "imageSha256": "78c4c383c38c7d100a9e66bec4f36de1fdb9453d6e44d1eec53120e849a36e89",
                "replay": "exact RGB pixel crop",
            },
            {
                "regionId": "dmg-175-level-others-context-5aa02e91e35c4c28",
                "sourceCoordinateSpace": "supplement-image pixels; top-left origin; LTRB half-open",
                "pdfOrdinal": None, "sourceImage": "dmg175.jpg", "sourceImageSha256": supplement_hash,
                "sourceCropBoundsPixels": [670, 120, 1329, 492], "imageSha256": "5aa02e91e35c4c28152caccd947096943b74889b8596376cb86cb0c7170291b8",
                "replay": "exact RGB pixel crop",
            },
        ],
        "limits": [
            "Pixel identity establishes a current coordinate/render recipe only; it does not reconstruct the original author's historical process.",
            "No text transcription, content completeness, table or row relevance, qualifier/asterisk attribution, highlight precision, context adequacy, default selection, source edition ruling, or rule correctness is inferred.",
            "The historical 726-member unknown-frame cohort has no available full member census here; current 740 candidate rows are a separate exhaustive current-catalog denominator and do not individually close that historical set.",
            "No source grade, review flag, accepted evidence state, or catalog field was changed or activated by this replay.",
            "The DMG p.175 crops are typed as supplementary image-coordinate crops; no PDF page ordinal is inferred.",
        ],
        "records": {
            "candidateRows": augmented_rows,
            "outsideCandidateExplicitFrameRows": extension_records,
            "rowLocatorChecks": row_locator_checks,
            "cropProvenanceChecks": crop_provenance_results,
            "renderFrameChecks": render_frame_results,
        },
    }
    private_output.parent.mkdir(parents=True, exist_ok=True)
    private_output.write_text(json.dumps(report, ensure_ascii=False, separators=(",", ":")) + "\n")
    return {"privateOutput": str(private_output), "privateOutputSha256": file_sha(private_output), "privateOutputBytes": private_output.stat().st_size, "denominators": report["denominators"], "replay": report["replay"], "negativeControls": report["negativeControls"], "toolSha256": tool_hash}


def parse_args() -> argparse.Namespace:
    default_repo = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=default_repo)
    parser.add_argument("--sources", type=Path, default=Path("/workspace/vault-audit-private/sources"))
    parser.add_argument("--v1-report", type=Path, default=Path("/workspace/vault-audit-private/pass8/root/source-frame-replay-before.json"))
    parser.add_argument("--usage-report", type=Path, default=Path("/workspace/vault-audit-private/pass8/baseline-source-visual-coverage/report.json"))
    parser.add_argument("--private-output", type=Path, default=Path("/workspace/vault-audit-private/pass8/site/source-frame-replay-v2.json"))
    return parser.parse_args()


if __name__ == "__main__":
    print(json.dumps(run(parse_args()), indent=2))
