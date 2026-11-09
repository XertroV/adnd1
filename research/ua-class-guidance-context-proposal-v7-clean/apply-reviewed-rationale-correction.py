#!/usr/bin/env python3
"""Apply the exact v6 reviewer's requested rationale phrase in the unsealed v7 candidate."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
OLD_PROPOSAL_SHA = "b1505436a91cc8d2f1f36e575792bdeb37aeac41c4d9e86982c0d33416f92b5d"
OLD_PACKET_SHA = "c52edca23e0e769224bb8db0344e53168f7d22e0cf71608a8a2a37ac9052ce7f"
OLD_DELTA_SHA = "4f30219c4baf273a205d4643b15636d563e3140bef31f7b4d422e4f68156a37a"
OLD_REASON = (
    "Complete supporting procedure separates body-associated weight, additional tightrope weight, "
    "and the 14th-level example's limits on movement and wall climbing with an extra 100-pound load, "
    "then the passenger example. Preserve the 'cannot expect' wording rather than turning it into an "
    "absolute impossibility."
)
NEW_REASON = (
    "Complete supporting procedure separates body-associated weight, additional tightrope weight, "
    "the separate extra-100-pound-load wall-climbing example, and passenger cases. Preserve the 'cannot "
    "expect' wording rather than treating it as an absolute impossibility."
)
REGION_ID = "pass8-ua-guidance-ua-thief-acrobat-weight-procedure"
PRIVATE_ARCHIVE_MANIFEST_SHA = "13fada72e7bb12ea2a7cdffa753ce813077b9d65e3a53faab0fb595d18de40c4"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read(name: str) -> dict:
    return json.loads((OUT / name).read_text(encoding="utf-8"))


def write(name: str, value: dict) -> None:
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    proposal_path, packet_path, delta_path = (OUT / name for name in ("proposal.json", "review-packet.json", "delta-receipt.json"))
    if (sha(proposal_path), sha(packet_path), sha(delta_path)) != (OLD_PROPOSAL_SHA, OLD_PACKET_SHA, OLD_DELTA_SHA):
        raise SystemExit("v7 pre-correction bytes differ from the explicitly preserved pre-rationale pins")

    proposal = read("proposal.json")
    matches = [entry for entry in proposal["regions"] if entry["region"]["id"] == REGION_ID]
    if len(matches) != 1 or matches[0].get("focusReason") != OLD_REASON:
        raise SystemExit("bounded rationale target does not match expected pre-correction text")
    matches[0]["focusReason"] = NEW_REASON
    write("proposal.json", proposal)
    new_proposal_sha = sha(proposal_path)

    packet = read("review-packet.json")
    if packet["proposal"]["sha256"] != OLD_PROPOSAL_SHA:
        raise SystemExit("review packet did not bind the pinned pre-correction proposal")
    packet["proposal"]["sha256"] = new_proposal_sha
    write("review-packet.json", packet)
    new_packet_sha = sha(packet_path)

    delta = read("delta-receipt.json")
    focus = delta["boundedCorrections"]["focusReason"]
    if focus["after"] != OLD_REASON:
        raise SystemExit("delta receipt rationale differs from the preserved pre-correction artifact")
    focus["after"] = NEW_REASON
    delta["materializedCandidate"]["proposal"]["sha256"] = new_proposal_sha
    delta["materializedCandidate"]["reviewPacket"]["sha256"] = new_packet_sha
    delta["rationaleCorrectionHistory"] = {
        "previousProposalSha256": OLD_PROPOSAL_SHA,
        "previousReviewPacketSha256": OLD_PACKET_SHA,
        "previousDeltaReceiptSha256": OLD_DELTA_SHA,
        "privateBeforeSnapshotManifestSha256": PRIVATE_ARCHIVE_MANIFEST_SHA,
        "requestedPhraseApplied": "the separate extra-100-pound-load wall-climbing example",
        "onlyFocusReasonAndProposalHashLinksChanged": True,
        "sourcePixelsGeometryFocusRectsAndRegionIdentityChanged": False,
    }
    write("delta-receipt.json", delta)
    print(json.dumps({
        "proposalSha256": new_proposal_sha,
        "reviewPacketSha256": new_packet_sha,
        "deltaReceiptSha256": sha(delta_path),
        "regionId": REGION_ID,
        "onlyRationaleAndDependentProposalHashLinksChanged": True,
    }, indent=2))


if __name__ == "__main__":
    main()
