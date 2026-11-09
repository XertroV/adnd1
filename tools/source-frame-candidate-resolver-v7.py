#!/usr/bin/env python3
"""Try a second finite DPI window for geometries left unresolved by v6.

The v7 pass examines target-size-derived scale candidates for every geometry
that had no v6 exact full-page template. It reuses no unvalidated raster and
does not alter active source coordinates or semantic approvals.
"""
from __future__ import annotations

import argparse
import collections
import hashlib
import importlib.util
import json
from pathlib import Path

import fitz
from PIL import Image

INPUT_COMMIT = "6d330af372ac809d11ed6029ed8695d0d8dc0909"
INPUT_DATA_SHA256 = "ceb7c8b9a8fe32b676e57c8d007f124a4490684d54558479e555d504075ba4f3"
V5_TOOL_SHA256 = "bcd0b251fc741af873d271a763f3d622c1980fe6f422b0472ecfc35d1f7919cb"
V5_PRIVATE_REPORT_SHA256 = "f5a0a2ba7c4328bcc3ff8bb6d2a7c77881417bcd9f50593285352783c20998c3"
V6_TOOL_SHA256 = "951fd1eeae184e1f572e2e64a08b2defcb0e926176235d6602af0371786d832b"
V6_PRIVATE_REPORT_SHA256 = "74614a307faa43c0eec676117be8aeeea836613d28e1047f01ade38175a6497d"
V6_PRE_FIX_HELPER_SHA256 = "a415d1fe4ac1f4d40a11c0f8ce4ea833b078b3617195c582738ed1b4f5f4ba6f"
V6_PRE_FIX_TEST_LOG_SHA256 = "7647b3bc88443241743727171ca975a14744a6d18458e1aa8aa342ba87b17e92"
V6_REAL_FIXTURE_SHA256 = "15d7c57809d55729d7370744f41a33b7ab4ed48bf9600581c6b573654ec6bad4"
V6_ANCHOR_HELPER_SHA256 = "34b375adc3e044b55ef050e8a826e7b235ffcee3eccb7462395499590ceff5f7"
SCALE_DPI_RADIUS = 2
MAX_DPI = 432
RENDERERS = ("pymupdf", "poppler-pdftoppm")


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def file_sha(path: Path) -> str:
    return sha256(path.read_bytes())


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    require(spec is not None and spec.loader is not None, f"cannot load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def candidate_plan(geometry_inventory: list[dict], old_tested_pairs: set[tuple[str, str]], v5, v6, docs: dict) -> tuple[dict, dict]:
    """Build dimension candidates; filter only already-tested (config,geometry) pairs."""
    configs: dict[str, dict] = {}
    windows: dict[str, dict] = {}
    for geometry in geometry_inventory:
        gkey = geometry["geometryKey"]
        existing = geometry["candidateSearch"]["status"]
        if existing.startswith("exact-full-page-template-found"):
            windows[gkey] = {"status": "skipped-v6-has-exact-template", "candidateDpis": [], "newRenderConfigs": []}
            continue
        page = docs[geometry["book"]][geometry["pdfPage"] - 1]
        rect = v5.normalized(geometry["rawDeclarations"].get("normalizedPageRect"))
        require(rect is not None, f"v6 geometry lacks normalized locator: {gkey}")
        window = v6.normalized_scale_dpis(page, rect, tuple(geometry["imageDimensions"]))
        added = []
        for dpi in window["candidateDpis"]:
            for renderer in RENDERERS:
                candidate_key = f"{geometry['book']}:{geometry['pdfPage']}:{renderer}:{dpi}"
                if (candidate_key, gkey) in old_tested_pairs:
                    continue
                config = configs.setdefault(candidate_key, {"candidateKey": candidate_key, "book": geometry["book"],
                                                             "pdfOrdinal": geometry["pdfPage"], "renderer": renderer,
                                                             "dpi": dpi, "geometryKeys": [],
                                                             "reason": "±2 DPI around width/height scale derived from target pixels and normalized page rectangle"})
                if gkey not in config["geometryKeys"]:
                    config["geometryKeys"].append(gkey)
                added.append(candidate_key)
        windows[gkey] = {**window, "status": "dimension-scale-window-planned", "newRenderConfigs": sorted(set(added))}
    return configs, windows


def run(args: argparse.Namespace) -> dict:
    repo, sources = args.repo.resolve(), args.sources.resolve()
    v5_tool_path = repo / "tools/source-frame-universe-v5.py"
    v5_report_path = args.v5_report.resolve()
    v6_tool_path = repo / "tools/source-frame-candidate-resolver-v6.py"
    v6_report_path = args.v6_report.resolve()
    require(file_sha(v5_tool_path) == V5_TOOL_SHA256, "v5 helper pin changed")
    require(file_sha(v5_report_path) == V5_PRIVATE_REPORT_SHA256, "v5 source report pin changed")
    require(file_sha(v6_tool_path) == V6_TOOL_SHA256, "v6 helper pin changed")
    require(file_sha(v6_report_path) == V6_PRIVATE_REPORT_SHA256, "v6 report pin changed")
    require(file_sha(args.v6_pre_fix_helper.resolve()) == V6_PRE_FIX_HELPER_SHA256, "v6 pre-fix helper evidence changed")
    require(file_sha(args.v6_pre_fix_test_log.resolve()) == V6_PRE_FIX_TEST_LOG_SHA256, "v6 pre-fix failure log changed")
    require(file_sha(args.v6_real_fixture.resolve()) == V6_REAL_FIXTURE_SHA256, "v6 real-source fixture changed")
    current_commit = __import__("subprocess").check_output(["git", "rev-parse", "HEAD"], cwd=repo, text=True).strip()
    data_path = repo / "dist/data.json"
    require(current_commit == INPUT_COMMIT and file_sha(data_path) == INPUT_DATA_SHA256, "pinned source/data input changed")

    v5 = load_module("source_frame_universe_v5_for_v7", v5_tool_path)
    # Make the v6 helper available to candidate_plan without duplicating its
    # tested geometry-scale logic. This module is pinned above before import.
    v6 = load_module("source_frame_candidate_resolver_v6_for_v7", v6_tool_path)
    v5_data = json.loads(v5_report_path.read_text())
    v6_data = json.loads(v6_report_path.read_text())
    require(v6_data["input"]["v6ToolSha256"] == V6_TOOL_SHA256, "v6 report/tool binding mismatch")
    require(v6_data["input"]["v5ToolSha256"] == V5_TOOL_SHA256, "v6 report source helper mismatch")
    require(v6_data["denominators"]["v5UnresolvedRows"] == 151 and v5_data["denominators"]["currentRegionRows"] == 3396,
            "source-frame denominators changed")

    docs, source_files = {}, {}
    for book, (filename, expected_sha) in v5.SOURCE_HASHES.items():
        path = sources / filename
        actual_sha = file_sha(path)
        require(actual_sha == expected_sha, f"source PDF identity mismatch: {book}")
        docs[book] = fitz.open(path)
        source_files[book] = {"filename": filename, "sha256": actual_sha}

    geometry_inventory = v6_data["geometryInventory"]
    require(len(geometry_inventory) == 56, "v6 geometry denominator drift")
    old_tested_pairs = {(render["candidateKey"], result["geometryKey"])
                        for render in v6_data["renderConfigs"] for result in render["templateResults"]}
    configs, windows = candidate_plan(geometry_inventory, old_tested_pairs, v5, v6, docs)
    target_images = {}
    for geometry in geometry_inventory:
        gkey = geometry["geometryKey"]
        if geometry["candidateSearch"]["status"].startswith("exact-full-page-template-found"):
            continue
        rowref = geometry["rowReferences"][0]
        catalog_path = repo / "dist" / rowref["catalog"]
        target_path = catalog_path.parent / rowref["imagePath"]
        require(file_sha(target_path) == geometry["imageSha256"], f"target image changed: {rowref['regionId']}")
        target = Image.open(target_path).convert("RGB").copy()
        require(list(target.size) == geometry["imageDimensions"], f"target image dimensions changed: {rowref['regionId']}")
        target_images[gkey] = target

    replay = v5.Replay(sources, docs, "RGB", args.render_cache_dir)
    render_results = []
    try:
        for index, candidate in enumerate(sorted(configs.values(), key=lambda x: x["candidateKey"]), 1):
            book, page_no = candidate["book"], candidate["pdfOrdinal"]
            try:
                full = replay.full_page(book, page_no, candidate["dpi"], candidate["renderer"])
                render_result = {**candidate,
                                 "rendererVersion": f"PyMuPDF {fitz.VersionBind}" if candidate["renderer"] == "pymupdf" else replay.poppler_version,
                                 "fullPageDimensions": list(full.size), "fullPageRawRgbSha256": sha256(full.tobytes()),
                                 "renderError": None, "templateResults": []}
                for gkey in candidate["geometryKeys"]:
                    geometry = next(g for g in geometry_inventory if g["geometryKey"] == gkey)
                    match = v6.exact_template_positions(full, target_images[gkey])
                    render_result["templateResults"].append({"geometryKey": gkey,
                                                               "targetImageSha256": geometry["imageSha256"],
                                                               "targetDimensions": geometry["imageDimensions"],
                                                               "exactRgbTemplateFound": match["exactRgbTemplateFound"],
                                                               "matchCount": match["matchCount"],
                                                               "matchesTruncated": match["matchesTruncated"],
                                                               "anchorRow": match.get("anchorRow"),
                                                               "matches": [{"pixelLTRBFullPage": [x, y, x + target_images[gkey].width, y + target_images[gkey].height],
                                                                            "exactCropRawRgbSha256": sha256(target_images[gkey].tobytes())}
                                                                           for x, y in match["matches"]],
                                                               "noMatchReason": match.get("reason")})
                render_results.append(render_result)
            except Exception as exc:
                render_results.append({**candidate, "rendererVersion": None, "fullPageDimensions": None,
                                       "fullPageRawRgbSha256": None, "renderError": f"{type(exc).__name__}: {exc}",
                                       "templateResults": []})
            if index % 10 == 0 or index == len(configs):
                print(f"v7CandidatePageRenders={index}/{len(configs)} geometries={len(geometry_inventory)}", flush=True)
    finally:
        replay.cleanup()
        for doc in docs.values():
            doc.close()

    v7_by_geometry = collections.defaultdict(list)
    for render in render_results:
        for result in render["templateResults"]:
            v7_by_geometry[result["geometryKey"]].append({"candidateKey": render["candidateKey"],
                                                            "renderer": render["renderer"], "dpi": render["dpi"],
                                                            "rendererVersion": render["rendererVersion"],
                                                            "fullPageDimensions": render["fullPageDimensions"],
                                                            "fullPageRawRgbSha256": render["fullPageRawRgbSha256"],
                                                            "exactRgbTemplateFound": result["exactRgbTemplateFound"],
                                                            "matchCount": result["matchCount"],
                                                            "matchesTruncated": result["matchesTruncated"],
                                                            "anchorRow": result["anchorRow"], "matches": result["matches"],
                                                            "targetImageSha256": result["targetImageSha256"],
                                                            "targetDimensions": result["targetDimensions"]})

    outcome_counts, matched_groups, row_refs_matched = collections.Counter(), [], 0
    for geometry in geometry_inventory:
        gkey = geometry["geometryKey"]
        prior = geometry["candidateSearch"]["status"]
        new_attempts = v7_by_geometry.get(gkey, [])
        new_matches = [x for x in new_attempts if x["exactRgbTemplateFound"]]
        if prior.startswith("exact-full-page-template-found"):
            cumulative_status = "exact-template-found-in-v6-prior-bounded-render-set"
        elif new_matches:
            cumulative_status = "exact-template-found-in-v7-dimension-scale-window"
            row_refs_matched += len(geometry["rowReferences"])
            matched_groups.append(geometry)
        elif new_attempts:
            cumulative_status = "no-exact-template-in-v6-or-v7-bounded-render-sets"
        else:
            cumulative_status = "no-new-compatible-render-configuration"
        geometry["v7DimensionScaleSearch"] = {"candidateDpiWindow": windows[gkey],
                                               "newRenderAttempts": new_attempts,
                                               "newExactTemplateRenderAttempts": sum(bool(x["exactRgbTemplateFound"]) for x in new_attempts),
                                               "newRenderAttemptCount": len(new_attempts),
                                               "newNoExactTemplateCount": sum(not x["exactRgbTemplateFound"] for x in new_attempts),
                                               "cumulativeBoundedStatus": cumulative_status}
        outcome_counts[cumulative_status] += 1

    total_exact_groups = sum(1 for g in geometry_inventory
                             if g["candidateSearch"]["status"].startswith("exact-full-page-template-found")) + len(matched_groups)
    total_exact_row_refs = sum(len(g["rowReferences"]) for g in geometry_inventory
                               if g["candidateSearch"]["status"].startswith("exact-full-page-template-found")) + row_refs_matched
    output = {
        "schemaVersion": 7,
        "artifactType": "private bounded target-size-derived exact full-page template search",
        "input": {"commit": current_commit, "rawDataSha256": file_sha(data_path),
                  "v5ToolSha256": V5_TOOL_SHA256, "v5PrivateReportSha256": V5_PRIVATE_REPORT_SHA256,
                  "v6ToolSha256": V6_TOOL_SHA256, "v6PrivateReportSha256": V6_PRIVATE_REPORT_SHA256,
                  "v6PreFixHelperSha256": V6_PRE_FIX_HELPER_SHA256,
                  "v6PreFixFailingTestLogSha256": V6_PRE_FIX_TEST_LOG_SHA256,
                  "v6AnchorHelperCalibrationSha256": V6_ANCHOR_HELPER_SHA256,
                  "v6RealSourceFixtureSha256": V6_REAL_FIXTURE_SHA256,
                  "v7ToolSha256": file_sha(Path(__file__).resolve())},
        "sourceFiles": source_files,
        "runtime": {"pymupdf": fitz.VersionBind, "pillow": __import__("PIL").__version__,
                    "poppler": replay.poppler_version,
                    "pixelMode": "exact decoded RGB subimage equality; no resampling or tolerance",
                    "renderStorePolicy": v5.MUPDF_STORE_POLICY},
        "denominators": {"currentCatalogRegionRows": 3396, "currentOwnerUses": 3399,
                         "v5UnresolvedRows": 151, "v5UnresolvedUniqueImageGeometries": 56,
                         "v6PreviouslyExactGeometries": 5, "v6PreviouslyUnmatchedGeometries": 51,
                         "v7UniquePageRenderConfigurations": len(configs),
                         "v7GeometryGroupsWithScaleSearch": sum(x.get("status") == "dimension-scale-window-planned" for x in windows.values()),
                         "v7NewPageRenderConfigurations": len(render_results),
                         "v7AdditionalExactGeometries": len(matched_groups),
                         "v7AdditionalExactRowReferences": row_refs_matched,
                         "CumulativeExactGeometries": total_exact_groups,
                         "CumulativeExactRowReferences": total_exact_row_refs,
                         "CumulativeStillUnresolvedGeometries": 56 - total_exact_groups,
                         "HistoricalUnknownFrameMemberCensus": {"denominator": 726, "status": "unavailable; not mapped to current rows"}},
        "method": {"candidateDpiRule": f"For each v6-unmatched geometry, take integer DPI values within ±{SCALE_DPI_RADIUS} of either width or height estimate from target pixel dimensions and the unchanged normalized page rectangle; bound DPI to 36..{MAX_DPI}.",
                   "renderers": list(RENDERERS),
                   "dedupRule": "Skip only a (render configuration, geometry) pair already tested in the pinned v6 report; a render already used for another geometry is not treated as a test of this target.",
                   "matchRule": "Every target RGB byte must equal a contiguous full-page subimage at its native dimensions. No resizing, approximate registration, rotations, or inferred source bounds.",
                   "provenanceLimit": "Exact current pixel identity is candidate frame evidence only. It does not establish historical authoring process, crop intent, semantic relevance, reading order, source completeness, or approval."},
        "summary": {"renderConfigurations": len(render_results),
                    "renderErrors": sum(x["renderError"] is not None for x in render_results),
                    "renderCacheMisses": replay.disk_cache_misses,
                    "renderCacheHits": replay.disk_cache_hits,
                    "cumulativeOutcomesByGeometry": dict(sorted(outcome_counts.items()))},
        "geometryInventory": geometry_inventory,
        "v7RenderConfigurations": render_results,
    }
    out = args.private_output.resolve()
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n")
    return {"privateOutput": str(out), "privateOutputSha256": file_sha(out), "privateOutputBytes": out.stat().st_size,
            "v7ToolSha256": output["input"]["v7ToolSha256"], "denominators": output["denominators"],
            "summary": output["summary"]}


def parse_args():
    root = Path(__file__).resolve().parents[1]
    private = Path("/workspace/vault-audit-private/pass8-independent-source-frame-review")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=root)
    parser.add_argument("--sources", type=Path, default=Path("/workspace/vault-audit-private/sources"))
    parser.add_argument("--v5-report", type=Path, default=private / "v5-fresh-full.json")
    parser.add_argument("--v6-report", type=Path, default=private / "v6-candidate-search.json")
    parser.add_argument("--v6-pre-fix-helper", type=Path, default=private / "v6-pre-fix-exact-template-helper.py")
    parser.add_argument("--v6-pre-fix-test-log", type=Path, default=private / "v6-pre-fix-tests.log")
    parser.add_argument("--v6-real-fixture", type=Path, default=private / "v6-real-small-fixture.json")
    parser.add_argument("--private-output", type=Path, default=private / "v7-scale-search.json")
    parser.add_argument("--render-cache-dir", type=Path, default=None)
    return parser.parse_args()


if __name__ == "__main__":
    print(json.dumps(run(parse_args()), indent=2))
