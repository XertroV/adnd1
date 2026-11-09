#!/usr/bin/env python3
"""Verify v7 exact deltas, materialized assets, and the proposed frame-registry migration."""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
FINAL_REASON = (
    "Complete supporting procedure separates body-associated weight, additional tightrope weight, "
    "the separate extra-100-pound-load wall-climbing example, and passenger cases. Preserve the 'cannot "
    "expect' wording rather than treating it as an absolute impossibility."
)
CLASS_GROUP_IDS = {
    "pass8-ua-guidance-fighter-specialization",
    "pass8-ua-guidance-ranger-specialization",
    "pass8-ua-guidance-ua-barbarian-class-opening",
    "pass8-ua-guidance-ua-barbarian-abilities",
    "pass8-ua-guidance-ranger-tracking",
}
RECEIPT_REL = "research/source-audit-pass8-ua-class-context-v6-independent-review-v1.json"
RECEIPT_SHA = "439aaf8b6ade94c1dfe78c8a2b0f85b235e17bc482eac4ff9794880f759bc302"
BASE_BRIDGE_REL = "research/source-frame-coordinate-bridge-phb-source-v1.json"
BASE_BRIDGE_SHA = "a756ac336f14491aa6785615c869a6a9ed8b1cc1632773e468c72e327fa8b1bd"
BRIDGE_ROW_CATALOGS = {
    "scans/verified/classes-fighter.json": 3,
    "scans/verified/classes-ranger.json": 3,
    "scans/verified/classes-ua-barbarian.json": 1,
    "scans/verified/classes-ua-thief-acrobat.json": 1,
}
CORE_FIELDS = (
    "owner", "ownerBindingKey", "catalog", "regionId", "book", "printedPage", "pdfPage",
    "sourcePdfSha256", "image", "imageSha256", "imageDimensionsPx", "normalizedPageRect",
    "coordinateSpace", "focusSha256", "contentSha256", "reviewHashBinding", "reviewAssessments",
    "sourceFrameId",
)


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def deep_find_groups(obj: dict, group_ids: set[str]) -> list[dict]:
    found = []

    def walk(value):
        if isinstance(value, dict):
            if value.get("id") in group_ids:
                found.append(value)
            for child in value.values():
                walk(child)
        elif isinstance(value, list):
            for child in value:
                walk(child)

    walk(obj)
    return found


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--v6-dir", required=True, type=Path)
    parser.add_argument("--receipt", required=True, type=Path)
    args = parser.parse_args()
    v6 = args.v6_dir.resolve()
    receipt = args.receipt.resolve()
    assert sha(receipt) == RECEIPT_SHA
    assert sha(ROOT / RECEIPT_REL) == RECEIPT_SHA

    old_proposal = read(v6 / "proposal.json")
    old_packet = read(v6 / "review-packet.json")
    old_cont = read(v6 / "prospective-citation-continuations.json")
    proposal = read(OUT / "proposal.json")
    packet = read(OUT / "review-packet.json")
    cont = read(OUT / "prospective-citation-continuations.json")
    proposal_rel = (OUT / "proposal.json").relative_to(ROOT).as_posix()
    packet_rel = (OUT / "review-packet.json").relative_to(ROOT).as_posix()
    cont_rel = (OUT / "prospective-citation-continuations.json").relative_to(ROOT).as_posix()
    proposal_sha = sha(OUT / "proposal.json")
    cont_sha = sha(OUT / "prospective-citation-continuations.json")
    assert proposal["baseCommit"] == "cc9509047746d5e27a71cb5b1e0cfcb739a688c9"
    assert sha(ROOT / "classes.json") == proposal["frozenRawSourceSha256"]["classes.json"]
    assert sha(ROOT / "ua-spells.json") == proposal["frozenRawSourceSha256"]["ua-spells.json"]

    expected_proposal = copy.deepcopy(old_proposal)
    target = [region for region in expected_proposal["regions"] if region["region"]["id"] == "pass8-ua-guidance-ua-thief-acrobat-weight-procedure"]
    assert len(target) == 1
    target[0]["focusReason"] = FINAL_REASON
    for item in expected_proposal["catalogs"]:
        item["prospectivePath"] = f"{OUT.relative_to(ROOT).as_posix()}/catalogs/{Path(item['prospectivePath']).name}"
    expected_proposal["prospectiveOverride"]["path"] = f"{OUT.relative_to(ROOT).as_posix()}/prospective-citation-overrides.json"
    for region in expected_proposal["regions"]:
        overlay = region.get("overlay")
        if overlay and overlay.get("path"):
            overlay["path"] = f"{OUT.relative_to(ROOT).as_posix()}/assets/overlays/{Path(overlay['path']).name}"
    assert expected_proposal == proposal

    expected_packet = copy.deepcopy(old_packet)
    expected_packet["proposal"] = {"path": proposal_rel, "sha256": proposal_sha}
    expected_packet["actualBeforeFixture"] = {
        "path": f"{OUT.relative_to(ROOT).as_posix()}/fixtures/actual-class-context-before-v1.json.gz",
        "sha256": old_packet["actualBeforeFixture"]["sha256"],
    }
    expected_packet["continuations"]["path"] = cont_rel
    expected_packet["continuations"]["sha256"] = cont_sha
    for evidence in expected_packet["newRegionEvidence"]:
        evidence["overlay"]["path"] = f"{OUT.relative_to(ROOT).as_posix()}/assets/overlays/{Path(evidence['overlay']['path']).name}"
    for group in expected_packet["continuations"]["newGroups"]:
        if group.get("id") in CLASS_GROUP_IDS:
            group["sourceComparison"]["evidence"] = RECEIPT_REL
            group["sourceComparison"]["evidenceSha256"] = RECEIPT_SHA
    assert expected_packet == packet

    expected_cont = copy.deepcopy(old_cont)
    class_continuations = [group for group in expected_cont["groups"] if group.get("id") in CLASS_GROUP_IDS]
    assert len(class_continuations) == 5
    for group in class_continuations:
        group["sourceComparison"]["evidence"] = RECEIPT_REL
        group["sourceComparison"]["evidenceSha256"] = RECEIPT_SHA
    assert expected_cont == cont
    assert len(deep_find_groups(packet, CLASS_GROUP_IDS)) == 5
    for group in class_continuations + deep_find_groups(packet, CLASS_GROUP_IDS):
        evidence = ROOT / group["sourceComparison"]["evidence"]
        assert evidence.is_file() and sha(evidence) == group["sourceComparison"]["evidenceSha256"]

    for catalog in proposal["catalogs"]:
        target_path = ROOT / catalog["prospectivePath"]
        assert sha(target_path) == catalog["afterSha256"]
        original = Path(next(old["prospectivePath"] for old in old_proposal["catalogs"] if old["path"] == catalog["path"]))
        assert sha(target_path) == sha(original)
    for image in proposal["images"]:
        assert sha(OUT / "assets" / "images" / image["image"]) == image["sha256"]
    for evidence in packet["newRegionEvidence"]:
        overlay_path = ROOT / evidence["overlay"]["path"]
        assert sha(overlay_path) == evidence["overlay"]["sha256"]
    assert sha(OUT / "prospective-citation-overrides.json") == sha(v6 / "prospective-citation-overrides.json")
    assert sha(OUT / "fixtures/actual-class-context-before-v1.json.gz") == sha(v6 / "actual-class-context-before-v1.json.gz")

    # Pin all explicitly changed sourceExcerpt counts and confirm the active catalog files were not edited.
    counts = read(OUT / "owner-link-replay.json")
    expected_counts = {
        "fighter": (25, 29), "ranger": (28, 36), "ua-cavalier": (39, 42),
        "ua-paladin": (24, 26), "ua-barbarian": (18, 25),
        "ua-thief-acrobat": (19, 25), "ua-druid": (21, 23),
    }
    assert {row["ownerId"]: (row["oldRegionCount"], row["newRegionCount"]) for row in counts["owners"]} == expected_counts
    for catalog in proposal["catalogs"]:
        active = ROOT / catalog["path"]
        assert sha(active) == catalog["beforeSha256"]

    base_bridge = read(ROOT / BASE_BRIDGE_REL)
    assert sha(ROOT / BASE_BRIDGE_REL) == BASE_BRIDGE_SHA
    candidate_bridge = read(OUT / "source-frame-coordinate-bridge-v7-candidate.json")
    frame_delta = read(OUT / "frame-bridge-successor-delta.json")
    replay = read(OUT / "owner-link-replay.json")
    expected_bridge = copy.deepcopy(base_bridge)
    candidate_hashes = {catalog["path"].removeprefix("dist/"): catalog["afterSha256"] for catalog in proposal["catalogs"]}
    existing_hash_paths = sorted(set(candidate_hashes) & set(base_bridge["provenance"]["catalogHashes"]))
    assert len(existing_hash_paths) == 6
    for path in existing_hash_paths:
        expected_bridge["provenance"]["catalogHashes"][path] = candidate_hashes[path]
    owner_replay = {row["ownerId"]: row for row in replay["owners"]}
    for frame in expected_bridge["frames"]:
        for row in frame["regions"]:
            if row["catalog"] in BRIDGE_ROW_CATALOGS:
                replay_owner = owner_replay[row["owner"]["itemId"]]
                row["catalogSha256"] = candidate_hashes[row["catalog"]]
                row["ownerSourceLinkSha256"] = replay_owner["newOwnerSourceLinkSha256"]
    assert expected_bridge == candidate_bridge
    before_rows = [row for frame in base_bridge["frames"] for row in frame["regions"]]
    after_rows = [row for frame in candidate_bridge["frames"] for row in frame["regions"]]
    assert len(before_rows) == len(after_rows) == 102
    for before, after in zip(before_rows, after_rows):
        assert tuple(before[key] for key in CORE_FIELDS) == tuple(after[key] for key in CORE_FIELDS)
    changed_rows = [
        (before, after) for before, after in zip(before_rows, after_rows)
        if before["catalogSha256"] != after["catalogSha256"] or before["ownerSourceLinkSha256"] != after["ownerSourceLinkSha256"]
    ]
    assert len(changed_rows) == 8
    assert Counter(before["catalog"] for before, _after in changed_rows) == BRIDGE_ROW_CATALOGS
    assert len(frame_delta["catalogPinDerivation"]["sixExistingRegistryHashPinsUpdated"]) == 6
    assert len(frame_delta["ownerJoinDerivation"]["changedRows"]) == 8
    assert frame_delta["exactness"]["all102CoreSourceImageFocusAndGeometryTuplesExact"] is True
    assert sha(OUT / "source-frame-coordinate-bridge-v7-candidate.json") == frame_delta["candidateBridge"]["sha256"]

    for name in ("proposal.json", "review-packet.json", "prospective-citation-continuations.json", "prospective-citation-overrides.json", "source-frame-coordinate-bridge-v7-candidate.json"):
        assert "/workspace/vault-audit-private/" not in (OUT / name).read_text(encoding="utf-8")

    print(json.dumps({
        "result": "PASS",
        "v6InputsPinned": True,
        "independentReceiptPinned": RECEIPT_SHA,
        "candidateRegions": len(proposal["regions"]),
        "sourceCrops": len(proposal["images"]),
        "ownerPageReferences": len(proposal["newCollectionScopedReferences"]),
        "candidateCatalogs": len(proposal["catalogs"]),
        "regionCountChanges": 7,
        "bridgeCatalogHashPinsUpdated": 6,
        "bridgeRowBearingCatalogs": 4,
        "bridgeOwnerJoinRowsUpdated": 8,
        "bridgeCoreTuplesUnchanged": 102,
        "oldActiveCatalogsRemainExact": True,
        "privatePathBearingProposalCopiesInCleanPackage": False,
        "activationAssemblyOrGradesChanged": False,
    }, indent=2))


if __name__ == "__main__":
    main()
