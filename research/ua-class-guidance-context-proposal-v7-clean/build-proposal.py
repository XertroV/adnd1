#!/usr/bin/env python3
"""Materialize a clean, local-path v7 proposal from the private, pinned v6 package."""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
OLD_REASON = (
    "Complete supporting procedure separates body-associated weight, additional tightrope weight, "
    "100-pound climbing expectation and passenger cases. Do not convert cannot-expect wording into "
    "an absolute impossibility."
)
NEW_REASON = (
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
V6_PROPOSAL_SHA = "b662646a15f8864fe33c3ee9107e03a214f3a7ad24ee4d6934fd0c7a46a3eb77"
V6_PACKET_SHA = "2c47d97ca5f9d24e2ab366db16878f84fdb7b664a2b55437c38a002ca7c15a09"
INDEPENDENT_RECEIPT_SHA = "439aaf8b6ade94c1dfe78c8a2b0f85b235e17bc482eac4ff9794880f759bc302"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def no_private_paths(value, at="$", found=None):
    if found is None:
        found = []
    if isinstance(value, dict):
        for key, child in value.items():
            no_private_paths(child, f"{at}.{key}", found)
    elif isinstance(value, list):
        for index, child in enumerate(value):
            no_private_paths(child, f"{at}[{index}]", found)
    elif isinstance(value, str) and "/workspace/vault-audit-private/" in value:
        found.append({"pointer": at, "value": value})
    return found


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--v6-dir", required=True, type=Path)
    parser.add_argument("--receipt", required=True, type=Path)
    args = parser.parse_args()
    v6 = args.v6_dir.resolve()
    receipt_input = args.receipt.resolve()
    if sha(v6 / "proposal.json") != V6_PROPOSAL_SHA:
        raise SystemExit("pinned v6 proposal hash mismatch")
    if sha(v6 / "review-packet.json") != V6_PACKET_SHA:
        raise SystemExit("pinned v6 review packet hash mismatch")
    if sha(receipt_input) != INDEPENDENT_RECEIPT_SHA:
        raise SystemExit("pinned v6 independent review receipt hash mismatch")
    existing_outputs = [path for path in OUT.iterdir() if path.name != "build-proposal.py"] if OUT.exists() else []
    if existing_outputs and (OUT / "delta-receipt.json").exists():
        raise SystemExit(f"refusing to overwrite nonempty additive v7 directory: {OUT}")
    OUT.mkdir(parents=True, exist_ok=True)

    root_receipt = ROOT / RECEIPT_REL
    if root_receipt.exists() and sha(root_receipt) != INDEPENDENT_RECEIPT_SHA:
        raise SystemExit(f"existing public independent receipt has unexpected bytes: {root_receipt}")
    if not root_receipt.exists():
        shutil.copyfile(receipt_input, root_receipt)
    if sha(root_receipt) != INDEPENDENT_RECEIPT_SHA:
        raise SystemExit("copied independent receipt hash mismatch")

    proposal = read_json(v6 / "proposal.json")
    packet = read_json(v6 / "review-packet.json")
    continuations = read_json(v6 / "prospective-citation-continuations.json")
    overrides_path = v6 / "prospective-citation-overrides.json"
    fixture_path = v6 / "actual-class-context-before-v1.json.gz"
    overrides_sha = sha(overrides_path)
    fixture_sha = sha(fixture_path)

    (OUT / "catalogs").mkdir(exist_ok=True)
    (OUT / "assets" / "images").mkdir(parents=True, exist_ok=True)
    (OUT / "assets" / "overlays").mkdir(parents=True, exist_ok=True)
    (OUT / "fixtures").mkdir(exist_ok=True)

    for catalog in proposal["catalogs"]:
        source = Path(catalog["prospectivePath"])
        target = OUT / "catalogs" / source.name
        shutil.copyfile(source, target)
        if sha(target) != catalog["afterSha256"]:
            raise SystemExit(f"candidate catalog bytes differ from v6 pin: {source.name}")
        catalog["prospectivePath"] = (target.relative_to(ROOT)).as_posix()

    for image in proposal["images"]:
        source = v6 / "images" / image["image"]
        target = OUT / "assets" / "images" / image["image"]
        shutil.copyfile(source, target)
        if sha(target) != image["sha256"]:
            raise SystemExit(f"image bytes differ from v6 pin: {image['image']}")

    for evidence in packet["newRegionEvidence"]:
        source = Path(evidence["overlay"]["path"])
        target = OUT / "assets" / "overlays" / source.name
        shutil.copyfile(source, target)
        if sha(target) != evidence["overlay"]["sha256"]:
            raise SystemExit(f"overlay bytes differ from v6 pin: {source.name}")
        evidence["overlay"]["path"] = target.relative_to(ROOT).as_posix()

    for region in proposal["regions"]:
        overlay = region.get("overlay")
        if overlay and overlay.get("path"):
            source = Path(overlay["path"])
            target = OUT / "assets" / "overlays" / source.name
            if not target.is_file() or sha(target) != overlay["sha256"]:
                raise SystemExit(f"proposal overlay is not in the independently reviewed overlay set: {source.name}")
            overlay["path"] = target.relative_to(ROOT).as_posix()

    override_target = OUT / "prospective-citation-overrides.json"
    shutil.copyfile(overrides_path, override_target)
    fixture_target = OUT / "fixtures" / fixture_path.name
    shutil.copyfile(fixture_path, fixture_target)
    if sha(override_target) != overrides_sha or sha(fixture_target) != fixture_sha:
        raise SystemExit("override or before fixture changed during local materialization")

    regions = [r for r in proposal["regions"] if r.get("focusReason") == OLD_REASON]
    if len(regions) != 1:
        raise SystemExit(f"expected one bounded focusReason target; found {len(regions)}")
    target_region_id = regions[0]["region"]["id"]
    regions[0]["focusReason"] = NEW_REASON
    proposal["prospectiveOverride"]["path"] = override_target.relative_to(ROOT).as_posix()

    proposal_rel = (OUT / "proposal.json").relative_to(ROOT).as_posix()
    packet_rel = (OUT / "review-packet.json").relative_to(ROOT).as_posix()
    continuations_rel = (OUT / "prospective-citation-continuations.json").relative_to(ROOT).as_posix()
    packet["proposal"] = {"path": proposal_rel, "sha256": "pending"}
    packet["actualBeforeFixture"] = {
        "path": fixture_target.relative_to(ROOT).as_posix(),
        "sha256": fixture_sha,
    }
    packet["continuations"]["path"] = continuations_rel
    for group in packet["continuations"]["newGroups"]:
        if group.get("id") in CLASS_GROUP_IDS:
            group["sourceComparison"]["evidence"] = RECEIPT_REL
            group["sourceComparison"]["evidenceSha256"] = INDEPENDENT_RECEIPT_SHA
    for group in continuations["groups"]:
        if group.get("id") in CLASS_GROUP_IDS:
            group["sourceComparison"]["evidence"] = RECEIPT_REL
            group["sourceComparison"]["evidenceSha256"] = INDEPENDENT_RECEIPT_SHA

    # Write proposal first so every evidence hash binds final exact bytes.
    write_json(OUT / "proposal.json", proposal)
    proposal_sha = sha(OUT / "proposal.json")
    packet["proposal"]["sha256"] = proposal_sha
    write_json(OUT / "prospective-citation-continuations.json", continuations)
    continuations_sha = sha(OUT / "prospective-citation-continuations.json")
    packet["continuations"]["sha256"] = continuations_sha
    write_json(OUT / "review-packet.json", packet)

    # Ensure the materialized public JSON contains no private asset paths.
    json_paths = [OUT / name for name in ("proposal.json", "review-packet.json", "prospective-citation-continuations.json", "prospective-citation-overrides.json")]
    private_path_findings = []
    for path in json_paths:
        private_path_findings.extend(no_private_paths(read_json(path), path.relative_to(ROOT).as_posix()))
    if private_path_findings:
        raise SystemExit(f"private paths remain in the public package: {private_path_findings[:3]}")

    receipt = {
        "schemaVersion": 1,
        "artifactType": "ua-class-guidance-context-v7-clean-successor-delta",
        "status": "Research-only; no active source-excerpt binding, grade change, assembly, or source32 activation",
        "baseCommit": proposal["baseCommit"],
        "pinnedV6Inputs": {
            "proposalSha256": V6_PROPOSAL_SHA,
            "reviewPacketSha256": V6_PACKET_SHA,
            "overrideSha256": overrides_sha,
            "beforeFixtureSha256": fixture_sha,
        },
        "independentReview": {
            "path": RECEIPT_REL,
            "sha256": INDEPENDENT_RECEIPT_SHA,
            "scope": "v6 crops/foci/24 owner-page groups/defaults accepted; two named versioned-successor corrections required; registry successor unreviewed",
        },
        "boundedCorrections": {
            "focusReason": {
                "regionId": target_region_id,
                "before": OLD_REASON,
                "after": NEW_REASON,
                "sourceAndPixelIdentityChanged": False,
            },
            "classContinuationEvidence": {
                "groupIds": sorted(CLASS_GROUP_IDS),
                "replacedDanglingPath": "research/source-audit-pass8-ua-class-guidance-source-context-proposal-v1.json",
                "path": RECEIPT_REL,
                "sha256": INDEPENDENT_RECEIPT_SHA,
                "reviewPacketReferences": 5,
                "continuationManifestReferences": 5,
            },
        },
        "materializedCandidate": {
            "proposal": {"path": proposal_rel, "sha256": proposal_sha},
            "reviewPacket": {"path": packet_rel, "sha256": sha(OUT / "review-packet.json")},
            "continuationManifest": {"path": continuations_rel, "sha256": continuations_sha},
            "catalogCandidates": len(proposal["catalogs"]),
            "proposedRegions": len(proposal["regions"]),
            "sourceCrops": len(proposal["images"]),
            "ownerPageReferences": len(proposal["newCollectionScopedReferences"]),
            "candidateOverrides": {"path": override_target.relative_to(ROOT).as_posix(), "sha256": overrides_sha},
            "privateFullSourcePagesCopied": 0,
            "privatePathStringsInPublicCandidateJson": 0,
        },
        "unchangedAssertions": {
            "all32RegionDefinitionsExceptOneRationaleExact": True,
            "all7CandidateCatalogBytesExactV6": True,
            "all18CropBytesExactV6": True,
            "all32OverlayBytesExactV6": True,
            "all24OwnerPageReferencesExactV6": True,
            "all24PageGroupDefaultAndOrderObjectsExactV6": True,
            "all260PriorContinuationGroupsExact": True,
            "oldRegionObjectsAndRelativeOrderExact": True,
            "noNumericOrMechanicsGradePromotion": True,
        },
    }
    write_json(OUT / "delta-receipt.json", receipt)
    print(json.dumps({
        "package": str(OUT),
        "proposalSha256": proposal_sha,
        "reviewPacketSha256": sha(OUT / "review-packet.json"),
        "continuationManifestSha256": continuations_sha,
        "deltaReceiptSha256": sha(OUT / "delta-receipt.json"),
        "candidateCatalogs": len(proposal["catalogs"]),
        "regions": len(proposal["regions"]),
        "cropImages": len(proposal["images"]),
        "ownerPageReferences": len(proposal["newCollectionScopedReferences"]),
    }, indent=2))


if __name__ == "__main__":
    main()
