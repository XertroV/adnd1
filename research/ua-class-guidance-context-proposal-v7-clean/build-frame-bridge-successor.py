#!/usr/bin/env python3
"""Build a non-active, exact-hash successor candidate for the current 9x102 frame registry."""

from __future__ import annotations

import copy
import hashlib
import json
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
V7 = OUT / "proposal.json"
OWNER_LINKS = OUT / "owner-link-replay.json"
BRIDGE = ROOT / "research/source-frame-coordinate-bridge-phb-source-v1.json"
EXPECTED_BRIDGE_SHA = "a756ac336f14491aa6785615c869a6a9ed8b1cc1632773e468c72e327fa8b1bd"
OUT_BRIDGE = OUT / "source-frame-coordinate-bridge-v7-candidate.json"
OUT_DELTA = OUT / "frame-bridge-successor-delta.json"
ROW_CATALOGS = {
    "scans/verified/classes-fighter.json",
    "scans/verified/classes-ranger.json",
    "scans/verified/classes-ua-barbarian.json",
    "scans/verified/classes-ua-thief-acrobat.json",
}
CORE_FIELDS = (
    "owner", "ownerBindingKey", "catalog", "regionId", "book", "printedPage", "pdfPage",
    "sourcePdfSha256", "image", "imageSha256", "imageDimensionsPx", "normalizedPageRect",
    "coordinateSpace", "focusSha256", "contentSha256", "reviewHashBinding", "reviewAssessments",
    "sourceFrameId",
)


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def canonical(value) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def write(path: Path, value) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    if sha(BRIDGE) != EXPECTED_BRIDGE_SHA:
        raise SystemExit("active PHB-source bridge bytes differ from the reviewed base pin")
    proposal = json.loads(V7.read_text(encoding="utf-8"))
    link_receipt = json.loads(OWNER_LINKS.read_text(encoding="utf-8"))
    before = json.loads(BRIDGE.read_text(encoding="utf-8"))
    after = copy.deepcopy(before)

    new_catalog_hashes = {
        catalog["path"].removeprefix("dist/"): catalog["afterSha256"]
        for catalog in proposal["catalogs"]
    }
    old_hash_map = before["provenance"]["catalogHashes"]
    six_catalogs = sorted(set(new_catalog_hashes) & set(old_hash_map))
    if len(six_catalogs) != 6:
        raise SystemExit(f"expected exact six-catalog provenance intersection, got {len(six_catalogs)}")
    if any(old_hash_map[path] != next(c["beforeSha256"] for c in proposal["catalogs"] if c["path"].removeprefix("dist/") == path) for path in six_catalogs):
        raise SystemExit("current registry catalog hashes do not match v6 before pins")

    owner_links = {entry["ownerId"]: entry for entry in link_receipt["owners"]}
    by_path = {catalog["path"].removeprefix("dist/"): catalog for catalog in proposal["catalogs"]}
    map_changes = []
    for path in six_catalogs:
        old = old_hash_map[path]
        new = new_catalog_hashes[path]
        after["provenance"]["catalogHashes"][path] = new
        map_changes.append({"catalog": path, "oldSha256": old, "newSha256": new})

    changed_rows = []
    row_counts = Counter()
    for frame in after["frames"]:
        for row in frame["regions"]:
            if row["catalog"] not in ROW_CATALOGS:
                continue
            record = by_path[row["catalog"]]
            owner = owner_links[row["owner"]["itemId"]]
            if row["ownerSourceLinkSha256"] != owner["oldOwnerSourceLinkSha256"]:
                raise SystemExit(f"current bridge owner-link hash differs from current data: {row['owner']['itemId']}#{row['regionId']}")
            if row["catalogSha256"] != record["beforeSha256"]:
                raise SystemExit(f"current bridge catalog hash differs from v6 before pin: {row['catalog']}")
            old_link = row["ownerSourceLinkSha256"]
            old_catalog = row["catalogSha256"]
            row["ownerSourceLinkSha256"] = owner["newOwnerSourceLinkSha256"]
            row["catalogSha256"] = record["afterSha256"]
            row_counts[row["catalog"]] += 1
            changed_rows.append({
                "owner": row["owner"],
                "regionId": row["regionId"],
                "catalog": row["catalog"],
                "oldOwnerSourceLinkSha256": old_link,
                "newOwnerSourceLinkSha256": row["ownerSourceLinkSha256"],
                "oldCatalogSha256": old_catalog,
                "newCatalogSha256": row["catalogSha256"],
            })
    if len(changed_rows) != 8:
        raise SystemExit(f"expected eight row-bearing owner joins, got {len(changed_rows)}")
    expected_by_catalog = {
        "scans/verified/classes-fighter.json": 3,
        "scans/verified/classes-ranger.json": 3,
        "scans/verified/classes-ua-barbarian.json": 1,
        "scans/verified/classes-ua-thief-acrobat.json": 1,
    }
    if dict(row_counts) != expected_by_catalog:
        raise SystemExit(f"unexpected registry row intersection: {dict(row_counts)}")

    before_rows = [row for frame in before["frames"] for row in frame["regions"]]
    after_rows = [row for frame in after["frames"] for row in frame["regions"]]
    if len(before_rows) != 102 or len(after_rows) != 102:
        raise SystemExit("frame registry no longer contains 102 region/owner joins")
    for old, new in zip(before_rows, after_rows):
        if tuple(old[field] for field in CORE_FIELDS) != tuple(new[field] for field in CORE_FIELDS):
            raise SystemExit(f"core geometry/source/image/focus tuple changed: {old['catalog']}#{old['regionId']}")

    expected = copy.deepcopy(before)
    expected["provenance"]["catalogHashes"] = copy.deepcopy(after["provenance"]["catalogHashes"])
    lookup = {(row["catalog"], row["regionId"], row["ownerBindingKey"][-1]): row for row in after_rows}
    for frame in expected["frames"]:
        for row in frame["regions"]:
            key = (row["catalog"], row["regionId"], row["ownerBindingKey"][-1])
            if key in lookup and row["catalog"] in ROW_CATALOGS:
                row["ownerSourceLinkSha256"] = lookup[key]["ownerSourceLinkSha256"]
                row["catalogSha256"] = lookup[key]["catalogSha256"]
    if expected != after:
        raise SystemExit("bridge successor contains changes outside six catalog pins and eight owner joins")

    write(OUT_BRIDGE, after)
    output_hash = sha(OUT_BRIDGE)
    changed_owner_pairs = sorted({(row["owner"]["collection"], row["owner"]["itemId"], row["owner"]["binding"]) for row in changed_rows})
    companion_only = sorted(path for path in six_catalogs if not any(row["catalog"] == path for row in changed_rows))
    outside_candidate = sorted(set(new_catalog_hashes) - set(old_hash_map))
    delta = {
        "schemaVersion": 1,
        "artifactType": "ua-class-guidance-v7-frame-bridge-successor-delta",
        "status": "Non-active candidate only; current tools and bridge pins are unchanged",
        "baseBridge": {
            "path": "research/source-frame-coordinate-bridge-phb-source-v1.json",
            "sha256": EXPECTED_BRIDGE_SHA,
        },
        "candidateBridge": {
            "path": OUT_BRIDGE.relative_to(ROOT).as_posix(),
            "sha256": output_hash,
            "rows": len(after_rows),
        },
        "catalogPinDerivation": {
            "v7CatalogCandidates": len(new_catalog_hashes),
            "sixExistingRegistryHashPinsUpdated": map_changes,
            "twoHashOnlyCompanionCatalogs": companion_only,
            "candidateOutsideExistingRegistryHashMap": outside_candidate,
        },
        "ownerJoinDerivation": {
            "rowBearingCatalogs": dict(sorted(row_counts.items())),
            "changedRows": changed_rows,
            "changedOwnerBindingPairs": [list(pair) for pair in changed_owner_pairs],
            "changedOwnerJoinRows": len(changed_rows),
            "unchangedRows": len(after_rows) - len(changed_rows),
        },
        "exactness": {
            "all102CoreSourceImageFocusAndGeometryTuplesExact": True,
            "frameGroupsBoxesRenderTargetsAndOrderingExact": True,
            "allReviewHashBindingsAndAssessmentsExact": True,
            "onlySixCatalogHashMapEntriesAndTwoFieldsOnEightRowsChanged": True,
            "fullDataSha256NotRepinned": True,
            "booksJsHashUnchanged": True,
            "sourcePdfPinsUnchanged": True,
            "noActiveBridgeOrToolPinChanged": True,
        },
        "ownerLinkReplay": {
            "path": OWNER_LINKS.relative_to(ROOT).as_posix(),
            "sha256": sha(OWNER_LINKS),
            "owners": len(owner_links),
            "oldRegionReviewsAndGradeStatusesPreserved": True,
            "newRegionsRemainUnreviewed": True,
        },
        "candidateData": {
            "sourceExcerptRegionCountChanges": [
                {"ownerId": link["ownerId"], "old": link["oldRegionCount"], "new": link["newRegionCount"]}
                for link in link_receipt["owners"]
            ],
            "pageReferences": len(proposal["newCollectionScopedReferences"]),
            "catalogCandidates": len(proposal["catalogs"]),
            "regions": len(proposal["regions"]),
        },
        "activationBoundary": "The registry candidate still requires separate root review and a final assembled-data provenance update before any current pin change.",
    }
    write(OUT_DELTA, delta)
    print(json.dumps({"candidateBridgeSha256": output_hash, "deltaSha256": sha(OUT_DELTA), "updatedCatalogHashPins": len(map_changes), "updatedOwnerJoinRows": len(changed_rows), "unchangedCoreRows": len(after_rows)}, indent=2))


if __name__ == "__main__":
    main()
