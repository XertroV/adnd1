#!/usr/bin/env python3
"""Finite standard-DPI exact-template pass for v7-unresolved frames."""
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
V7_TOOL_SHA256 = "1ab113988f6b58fde981fff4b12a5427754968be9eb796f1fcfc3e1655451546"
V7_PRIVATE_REPORT_SHA256 = "991f8ec4f80c8f0c5e9a216f05f611729e89beb9941c6795ee89abf6fc1810a8"
V6_PRE_FIX_HELPER_SHA256 = "a415d1fe4ac1f4d40a11c0f8ce4ea833b078b3617195c582738ed1b4f5f4ba6f"
V6_PRE_FIX_TEST_LOG_SHA256 = "7647b3bc88443241743727171ca975a14744a6d18458e1aa8aa342ba87b17e92"
V6_REAL_FIXTURE_SHA256 = "15d7c57809d55729d7370744f41a33b7ab4ed48bf9600581c6b573654ec6bad4"
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


def nearest_standard_dpis(estimates: dict[str, float], common_dpis: set[int]) -> dict:
    """Choose each axis's two closest entries from the pinned finite DPI grid."""
    by_axis = {axis: sorted(common_dpis, key=lambda dpi: (abs(dpi - estimate), dpi))[:2]
               for axis, estimate in estimates.items()}
    return {"nearestCommonDpisByAxis": by_axis,
            "candidateDpis": sorted({dpi for values in by_axis.values() for dpi in values}),
            "candidateRule": "two closest values per width/height estimate from the pinned v5 COMMON_DPI set"}


def plan_candidates(geometries: list[dict], old_pairs: set[tuple[str, str]], v5, v6, docs: dict) -> tuple[dict, dict]:
    configs: dict[str, dict] = {}
    plans: dict[str, dict] = {}
    for geometry in geometries:
        gkey = geometry["geometryKey"]
        prior = geometry["v7DimensionScaleSearch"]["cumulativeBoundedStatus"]
        if prior.startswith("exact-template-found"):
            plans[gkey] = {"status": "skipped-prior-exact-template", "candidateDpis": [], "newRenderConfigs": []}
            continue
        page = docs[geometry["book"]][geometry["pdfPage"] - 1]
        rect = v5.normalized(geometry["rawDeclarations"].get("normalizedPageRect"))
        require(rect is not None, f"unresolved geometry lacks normalized page rectangle: {gkey}")
        x, y, w, h = rect
        target_w, target_h = geometry["imageDimensions"]
        estimates = {"width": target_w * 72 / (w * page.rect.width),
                     "height": target_h * 72 / (h * page.rect.height)}
        scale = nearest_standard_dpis(estimates, set(v5.COMMON_DPI))
        new_configs = []
        for dpi in scale["candidateDpis"]:
            for renderer in RENDERERS:
                candidate_key = f"{geometry['book']}:{geometry['pdfPage']}:{renderer}:{dpi}"
                if (candidate_key, gkey) in old_pairs:
                    continue
                item = configs.setdefault(candidate_key, {"candidateKey": candidate_key, "book": geometry["book"],
                                                           "pdfOrdinal": geometry["pdfPage"], "renderer": renderer,
                                                           "dpi": dpi, "geometryKeys": [],
                                                           "reason": "nearest standard DPI values from pinned v5 COMMON_DPI grid"})
                if gkey not in item["geometryKeys"]:
                    item["geometryKeys"].append(gkey)
                new_configs.append(candidate_key)
        plans[gkey] = {"status": "standard-dpi-window-planned", "perAxisScaleEstimates": estimates,
                       **scale, "newRenderConfigs": sorted(set(new_configs))}
    return configs, plans


def run(args: argparse.Namespace) -> dict:
    repo, sources = args.repo.resolve(), args.sources.resolve()
    private = args.private_root.resolve()
    v5_tool_path = repo / "tools/source-frame-universe-v5.py"
    v6_tool_path = repo / "tools/source-frame-candidate-resolver-v6.py"
    v7_tool_path = repo / "tools/source-frame-candidate-resolver-v7.py"
    v5_report_path = args.v5_report.resolve()
    v6_report_path = args.v6_report.resolve()
    v7_report_path = args.v7_report.resolve()
    require(file_sha(v5_tool_path) == V5_TOOL_SHA256 and file_sha(v5_report_path) == V5_PRIVATE_REPORT_SHA256,
            "pinned v5 evidence changed")
    require(file_sha(v6_tool_path) == V6_TOOL_SHA256 and file_sha(v6_report_path) == V6_PRIVATE_REPORT_SHA256,
            "pinned v6 evidence changed")
    require(file_sha(v7_tool_path) == V7_TOOL_SHA256 and file_sha(v7_report_path) == V7_PRIVATE_REPORT_SHA256,
            "pinned v7 evidence changed")
    require(file_sha(args.v6_pre_fix_helper.resolve()) == V6_PRE_FIX_HELPER_SHA256, "v6 pre-fix helper changed")
    require(file_sha(args.v6_pre_fix_test_log.resolve()) == V6_PRE_FIX_TEST_LOG_SHA256, "v6 failing test control changed")
    require(file_sha(args.v6_real_fixture.resolve()) == V6_REAL_FIXTURE_SHA256, "v6 real-source fixture changed")
    current_commit = __import__("subprocess").check_output(["git", "rev-parse", "HEAD"], cwd=repo, text=True).strip()
    data_path = repo / "dist/data.json"
    require(current_commit == INPUT_COMMIT and file_sha(data_path) == INPUT_DATA_SHA256, "pinned source/data input changed")

    v5 = load_module("source_frame_universe_v5_for_v8", v5_tool_path)
    v6 = load_module("source_frame_candidate_resolver_v6_for_v8", v6_tool_path)
    v5_report = json.loads(v5_report_path.read_text())
    v6_report = json.loads(v6_report_path.read_text())
    v7_report = json.loads(v7_report_path.read_text())
    require(len(v7_report["geometryInventory"]) == 56, "v7 geometry denominator drift")

    docs, source_files = {}, {}
    for book, (filename, expected_sha) in v5.SOURCE_HASHES.items():
        path = sources / filename
        actual = file_sha(path)
        require(actual == expected_sha, f"source PDF identity mismatch: {book}")
        docs[book] = fitz.open(path)
        source_files[book] = {"filename": filename, "sha256": actual}

    # Pair-level history prevents treating a page render tested for another crop
    # as if it tested this image. Preserve V6 and V7 attempted pair identities.
    old_pairs = set()
    for geometry in v7_report["geometryInventory"]:
        gkey = geometry["geometryKey"]
        old_pairs.update((attempt["candidateKey"], gkey)
                         for attempt in geometry["candidateSearch"]["renderAttempts"])
        old_pairs.update((attempt["candidateKey"], gkey)
                         for attempt in geometry["v7DimensionScaleSearch"]["newRenderAttempts"])
    geometries = v7_report["geometryInventory"]
    configs, plans = plan_candidates(geometries, old_pairs, v5, v6, docs)
    targets = {}
    for geometry in geometries:
        gkey = geometry["geometryKey"]
        if plans[gkey]["status"] == "skipped-prior-exact-template":
            continue
        rowref = geometry["rowReferences"][0]
        catalog_path = repo / "dist" / rowref["catalog"]
        target_path = catalog_path.parent / rowref["imagePath"]
        require(file_sha(target_path) == geometry["imageSha256"], f"target image changed: {rowref['regionId']}")
        image = Image.open(target_path).convert("RGB").copy()
        require(list(image.size) == geometry["imageDimensions"], f"target image dimension changed: {rowref['regionId']}")
        targets[gkey] = image

    replay = v5.Replay(sources, docs, "RGB", args.render_cache_dir)
    render_results = []
    try:
        ordered_configs = sorted(configs.values(), key=lambda x: x["candidateKey"])
        for index, candidate in enumerate(ordered_configs, 1):
            try:
                full = replay.full_page(candidate["book"], candidate["pdfOrdinal"], candidate["dpi"], candidate["renderer"])
                record = {**candidate,
                          "rendererVersion": f"PyMuPDF {fitz.VersionBind}" if candidate["renderer"] == "pymupdf" else replay.poppler_version,
                          "fullPageDimensions": list(full.size), "fullPageRawRgbSha256": sha256(full.tobytes()),
                          "renderError": None, "templateResults": []}
                for gkey in candidate["geometryKeys"]:
                    geometry = next(g for g in geometries if g["geometryKey"] == gkey)
                    match = v6.exact_template_positions(full, targets[gkey])
                    record["templateResults"].append({"geometryKey": gkey,
                                                       "targetImageSha256": geometry["imageSha256"],
                                                       "targetDimensions": geometry["imageDimensions"],
                                                       "exactRgbTemplateFound": match["exactRgbTemplateFound"],
                                                       "matchCount": match["matchCount"],
                                                       "matchesTruncated": match["matchesTruncated"],
                                                       "anchorRow": match.get("anchorRow"),
                                                       "matches": [{"pixelLTRBFullPage": [x, y, x + targets[gkey].width, y + targets[gkey].height],
                                                                    "exactCropRawRgbSha256": sha256(targets[gkey].tobytes())}
                                                                   for x, y in match["matches"]],
                                                       "noMatchReason": match.get("reason")})
                render_results.append(record)
            except Exception as exc:
                render_results.append({**candidate, "rendererVersion": None, "fullPageDimensions": None,
                                       "fullPageRawRgbSha256": None, "renderError": f"{type(exc).__name__}: {exc}",
                                       "templateResults": []})
            if index % 10 == 0 or index == len(ordered_configs):
                print(f"v8CandidatePageRenders={index}/{len(ordered_configs)} geometries={len(geometries)}", flush=True)
    finally:
        replay.cleanup()
        for doc in docs.values():
            doc.close()

    results_by_geometry = collections.defaultdict(list)
    for render in render_results:
        for result in render["templateResults"]:
            results_by_geometry[result["geometryKey"]].append({"candidateKey": render["candidateKey"],
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

    cumulative_counts = collections.Counter()
    additional_exact_groups, additional_exact_refs = 0, 0
    for geometry in geometries:
        gkey = geometry["geometryKey"]
        prior = geometry["v7DimensionScaleSearch"]["cumulativeBoundedStatus"]
        new_attempts = results_by_geometry.get(gkey, [])
        found = any(x["exactRgbTemplateFound"] for x in new_attempts)
        if prior.startswith("exact-template-found"):
            status = "exact-template-found-in-v6-v7-prior-bounded-sets"
        elif found:
            status = "exact-template-found-in-v8-standard-dpi-window"
            additional_exact_groups += 1
            additional_exact_refs += len(geometry["rowReferences"])
        elif new_attempts:
            status = "no-exact-template-in-v6-v8-bounded-render-sets"
        else:
            status = "no-new-compatible-render-configuration-through-v8"
        geometry["v8StandardDpiSearch"] = {"candidatePlan": plans[gkey], "newRenderAttempts": new_attempts,
                                           "newExactTemplateRenderAttempts": sum(bool(x["exactRgbTemplateFound"]) for x in new_attempts),
                                           "newRenderAttemptCount": len(new_attempts),
                                           "newNoExactTemplateCount": sum(not x["exactRgbTemplateFound"] for x in new_attempts),
                                           "cumulativeBoundedStatus": status}
        cumulative_counts[status] += 1

    v6_exact = [g for g in geometries if g["candidateSearch"]["status"].startswith("exact-full-page-template-found")]
    v7_exact = [g for g in geometries if g["v7DimensionScaleSearch"]["cumulativeBoundedStatus"] == "exact-template-found-in-v7-dimension-scale-window"]
    cumulative_exact_groups = len(v6_exact) + len(v7_exact) + additional_exact_groups
    cumulative_exact_refs = sum(len(g["rowReferences"]) for g in v6_exact + v7_exact) + additional_exact_refs
    output = {
        "schemaVersion": 8,
        "artifactType": "private finite standard-DPI exact full-page template search",
        "input": {"commit": current_commit, "rawDataSha256": file_sha(data_path),
                  "v5ToolSha256": V5_TOOL_SHA256, "v5PrivateReportSha256": V5_PRIVATE_REPORT_SHA256,
                  "v6ToolSha256": V6_TOOL_SHA256, "v6PrivateReportSha256": V6_PRIVATE_REPORT_SHA256,
                  "v7ToolSha256": V7_TOOL_SHA256, "v7PrivateReportSha256": V7_PRIVATE_REPORT_SHA256,
                  "v6PreFixHelperSha256": V6_PRE_FIX_HELPER_SHA256,
                  "v6PreFixFailingTestLogSha256": V6_PRE_FIX_TEST_LOG_SHA256,
                  "v6RealSourceFixtureSha256": V6_REAL_FIXTURE_SHA256,
                  "v8ToolSha256": file_sha(Path(__file__).resolve())},
        "sourceFiles": source_files,
        "runtime": {"pymupdf": fitz.VersionBind, "pillow": __import__("PIL").__version__,
                    "poppler": replay.poppler_version,
                    "pixelMode": "exact decoded RGB subimage equality; no resampling or tolerance",
                    "renderStorePolicy": v5.MUPDF_STORE_POLICY},
        "denominators": {"currentCatalogRegionRows": 3396, "currentOwnerUses": 3399,
                         "v5UnresolvedRows": 151, "v5UnresolvedUniqueImageGeometries": 56,
                         "v6ExactGeometries": len(v6_exact),
                         "v7AdditionalExactGeometries": len(v7_exact),
                         "v7AdditionalExactRowReferences": sum(len(g["rowReferences"]) for g in v7_exact),
                         "v8StandardDpiSearchGeometries": sum(x["status"] == "standard-dpi-window-planned" for x in plans.values()),
                         "v8UniquePageRenderConfigurations": len(configs),
                         "v8NewPageRenderConfigurations": len(render_results),
                         "v8AdditionalExactGeometries": additional_exact_groups,
                         "v8AdditionalExactRowReferences": additional_exact_refs,
                         "CumulativeExactGeometries": cumulative_exact_groups,
                         "CumulativeExactRowReferences": cumulative_exact_refs,
                         "CumulativeStillUnresolvedGeometries": 56 - cumulative_exact_groups,
                         "CumulativeStillUnresolvedRowReferences": 151 - cumulative_exact_refs,
                         "HistoricalUnknownFrameMemberCensus": {"denominator": 726, "status": "unavailable; not mapped to current rows"}},
        "method": {"standardDpiGrid": sorted(v5.COMMON_DPI),
                   "candidateRule": "For each geometry still unresolved after v7, choose the two nearest values from the pinned standard DPI grid separately for target-width and target-height scale estimates; render both PyMuPDF and Poppler.",
                   "dedupRule": "Skip only (render configuration, geometry) pairs already attempted in v6 or v7. A configuration tested against another geometry does not count as this target's test.",
                   "matchRule": "A match requires every decoded target RGB byte to equal a contiguous full-page subimage at original dimensions. No resizing, approximate registration, rotation, or speculative crop coordinate is accepted.",
                   "provenanceLimit": "An exact current template match is candidate pixel-frame evidence only. It does not establish historical authoring process, crop intent, semantic relevance, reading order, source completeness, or approval."},
        "summary": {"renderConfigurations": len(render_results),
                    "renderErrors": sum(x["renderError"] is not None for x in render_results),
                    "renderCacheMisses": replay.disk_cache_misses,
                    "renderCacheHits": replay.disk_cache_hits,
                    "cumulativeOutcomesByGeometry": dict(sorted(cumulative_counts.items()))},
        "geometryInventory": geometries,
        "v8RenderConfigurations": render_results,
    }
    out = args.private_output.resolve()
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n")
    return {"privateOutput": str(out), "privateOutputSha256": file_sha(out), "privateOutputBytes": out.stat().st_size,
            "v8ToolSha256": output["input"]["v8ToolSha256"], "denominators": output["denominators"],
            "summary": output["summary"]}


def parse_args():
    root = Path(__file__).resolve().parents[1]
    private = Path("/workspace/vault-audit-private/pass8-independent-source-frame-review")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=root)
    parser.add_argument("--sources", type=Path, default=Path("/workspace/vault-audit-private/sources"))
    parser.add_argument("--private-root", type=Path, default=private)
    parser.add_argument("--v5-report", type=Path, default=private / "v5-fresh-full.json")
    parser.add_argument("--v6-report", type=Path, default=private / "v6-candidate-search.json")
    parser.add_argument("--v7-report", type=Path, default=private / "v7-scale-search.json")
    parser.add_argument("--v6-pre-fix-helper", type=Path, default=private / "v6-pre-fix-exact-template-helper.py")
    parser.add_argument("--v6-pre-fix-test-log", type=Path, default=private / "v6-pre-fix-tests.log")
    parser.add_argument("--v6-real-fixture", type=Path, default=private / "v6-real-small-fixture.json")
    parser.add_argument("--private-output", type=Path, default=private / "v8-standard-dpi-search.json")
    parser.add_argument("--render-cache-dir", type=Path, default=None)
    return parser.parse_args()


if __name__ == "__main__":
    print(json.dumps(run(parse_args()), indent=2))
