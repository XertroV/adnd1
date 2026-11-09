#!/usr/bin/env python3
"""Build and validate the additive Pass 8 original-559 unit-join v2 report.

The v1 join is a pinned historical input and is never rewritten. This builder
adds exact, hash-pinned closure links for the 28 MM table queue candidates and
the Elemental/Elephant joins, supplies missing report hashes from the pinned
registry, and keeps source-reading and public-search states in separate fields.
"""

from __future__ import annotations

import argparse
import copy
import gzip
import hashlib
import json
import os
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
V1_PATH = "research/source-audit-pass8-original-unit-join-review.json"
V1_SHA256 = "425bcf69ce1d44da3ffaecdc8da2993432251f51a36d2245011ae704e2de4865"
LAST14_PATH = "research/source-audit-pass8-mm-table-last14-assessments.json"
LAST14_SHA256 = "c16645e347a2e28de3d9c564734706accfb7f1dfc5cc92784ea5d8be693b686d"
FIRST14_PATH = "research/source-audit-pass8-mm-table-candidate-first14-assessments.json"
FIRST14_SHA256 = "244211c1231e143d30b749b8fe1d585f7ee1ef6efb4bbc7c21469ad2bd590fd3"
QUEUE_PATH = "research/source-audit-pass8-mm-table-candidate-pending-queue.json"
QUEUE_SHA256 = "bc9cfdbb1c8a59cf528a33c9ca9884985cbcd948225c569c7a679f373de12aec"
NEIGHBOR_PATH = "research/source-audit-pass8-mm-elemental-elephant-site-join-closure.json"
NEIGHBOR_SHA256 = "3eeff5f5f9ff33a9758d9b489c3ff33f446d2df950c0dda3e8e190678d1a5482"
PHB_ABILITY_RACE_PATH = "research/source-audit-pass8-phb-ability-race-assessments.json"
PHB_ABILITY_RACE_SHA256 = "2bfde34e48a8a85ffc67d2381affeb255c28f21ff95227451f372ce0c3d4c191"
PHB_SPELL_GUIDANCE_PATH = "research/source-audit-pass8-phb-spell-guidance-author-proposal-v2.json"
PHB_SPELL_GUIDANCE_SHA256 = "228890f8e00385f9145d2e853579755745f3ec511ad8c8afe095bd1faefd60e7"
PHB_SPELL_FOCUS_PATH = "research/phb-spell-focus-page52-independent-review.json"
PHB_SPELL_FOCUS_SHA256 = "87d826d82a653fcbc9ef052e6b2dda2ccec227688379f45a3eae49f4fd9a2b9c"
MIXED_CORRECTION_PATH = "research/source-audit-pass8-mm-first14-mixed-scope-independent-review-correction.json"
MIXED_CORRECTION_SHA256 = "94ec57094f21ca42a6877c4c185868b99a86986f16ec495bd9e6e4d2f7687082"
MIXED_PRIOR_REVIEW_PATH = "research/source-audit-pass8-mm-first14-mixed-scope-independent-review.json"
MIXED_PRIOR_REVIEW_SHA256 = "006e3774146f4eca43a0ef3ec338a3d9b99203a43ad097c21a9e0845ba619f85"
SNAPSHOT_PATH = Path("/workspace/vault-audit-private/pass8-site-snapshot-projection-663ea470af5c.json.gz")
SNAPSHOT_GZIP_SHA256 = "663ea470af5cdd272674b264ba96f5a74231d3525143c907596ba41da21194d2"
SNAPSHOT_RAW_SHA256 = "7f8f9eeab2140619e4078614b5458c44f18c7e3f1922c375051a0a5720d79d39"
SNAPSHOT_GZIP_SIZE = 4_391_595
SNAPSHOT_RAW_SIZE = 89_009_882
OUTPUT_PATH = "research/source-audit-pass8-original-unit-join-review-v2.json"
LEGACY_PUBLIC_REPORT_PATH_ALIASES = {
    "/workspace/adnd1-phb-spell-guidance-repair/research/source-audit-pass8-phb-spell-guidance-author-proposal.json":
        ("research/source-audit-pass8-phb-spell-guidance-author-proposal.json", "1a3ed99095ff9d93c0f1f84d89c27cd239f02430ffb6db81c10b7ac126af423d"),
}
PUBLIC_INPUT_LOCATORS = {
    **LEGACY_PUBLIC_REPORT_PATH_ALIASES,
    "research/source-completeness-coverage.json": (
        "research/source-audit-pass8-unit-census-input-ae36f43b.json",
        "ae36f43b2e6ba63643d2c4a5a4fea34ddc494f3f10337a28a53040dfe8a9401d",
    ),
}

BOOK_COUNTS = {"PHB": 105, "DMG": 60, "UA": 36, "MM": 317, "MM2": 41}
CATEGORY_ORDER = ("missing", "partial", "present", "citationonly", "excluded", "unassessable")
QUEUE_SIZE = 28


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def file_bytes(root: Path, path: str) -> bytes:
    p = Path(path)
    locator = PUBLIC_INPUT_LOCATORS.get(str(p))
    if locator is not None:
        relative_path, expected_sha256 = locator
        p = root / relative_path
        payload = p.read_bytes()
        if sha256(payload) != expected_sha256:
            raise ValueError(f"portable public input locator bytes differ: {relative_path}")
        return payload
    if p.is_absolute():
        if str(p) not in PUBLIC_INPUT_LOCATORS:
            raise ValueError(f"unrecognized absolute public report path: {path}")
    p = root / p
    return p.read_bytes()


def public_input_locator_receipts(root: Path) -> list[dict[str, Any]]:
    receipts = []
    for requested_path, (relative_path, expected_sha256) in PUBLIC_INPUT_LOCATORS.items():
        payload = (root / relative_path).read_bytes()
        actual_sha256 = sha256(payload)
        if actual_sha256 != expected_sha256:
            raise ValueError(f"portable public input locator bytes differ: {relative_path}")
        receipts.append({
            "requestedPath": requested_path,
            "resolvedPath": relative_path,
            "sha256": actual_sha256,
            "sizeBytes": len(payload),
            "status": "verified",
        })
    return receipts


def registry_map(registry: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {item["id"]: item for item in registry}


def report_registry_hash(report: dict[str, Any], report_id: str) -> str:
    try:
        return registry_map(report["reportRegistry"])[report_id]["sha256"]
    except KeyError as exc:
        raise ValueError(f"missing pinned report registry entry: {report_id}") from exc


def resolve_json_pointer(document: Any, pointer: str) -> Any:
    if pointer == "#":
        return document
    if not pointer.startswith("#/"):
        raise ValueError("not a JSON pointer")
    current = document
    for raw_token in pointer[2:].split("/"):
        token = raw_token.replace("~1", "/").replace("~0", "~")
        current = current[int(token)] if isinstance(current, list) else current[token]
    return current


def verify_private_snapshot(path: Path = SNAPSHOT_PATH) -> dict[str, Any]:
    """Explicit offline verification of private snapshot gzip and decoded JSON bytes."""
    payload = path.read_bytes()
    if len(payload) != SNAPSHOT_GZIP_SIZE or sha256(payload) != SNAPSHOT_GZIP_SHA256:
        raise ValueError(f"private snapshot gzip bytes do not match the pinned size/hash: {path}")
    decoded = gzip.decompress(payload)
    if len(decoded) != SNAPSHOT_RAW_SIZE or sha256(decoded) != SNAPSHOT_RAW_SHA256:
        raise ValueError(f"private snapshot decompressed JSON does not match the pinned size/hash: {path}")
    json.loads(decoded)
    return {
        "status": "verified",
        "path": str(path),
        "gzipSizeBytes": len(payload),
        "gzipSha256": SNAPSHOT_GZIP_SHA256,
        "decompressedSizeBytes": len(decoded),
        "decompressedJsonSha256": SNAPSHOT_RAW_SHA256,
        "scope": "Exact private snapshot gzip and decompressed JSON bytes only; this does not read private PDFs or rerun source review.",
    }


def raw_to_category(value: str) -> str:
    return {
        "absent": "missing",
        "missing": "missing",
        "citation-only": "citationonly",
        "citationonly": "citationonly",
        "explicitly-excluded": "excluded",
        "excluded": "excluded",
        "partial": "partial",
        "present": "present",
        "unassessable": "unassessable",
    }.get(value, value)


def add_registry_entry(registry: list[dict[str, Any]], item: dict[str, Any]) -> None:
    existing = registry_map(registry).get(item["id"])
    if existing:
        if existing.get("path") != item.get("path") or existing.get("sha256") != item.get("sha256"):
            raise ValueError(f"report registry collision for {item['id']}")
        return
    registry.append(item)


def recursively_fill_report_hashes(value: Any, hashes: dict[str, str]) -> None:
    if isinstance(value, dict):
        report_id = value.get("reportId")
        if report_id in hashes and "reportPath" in value:
            value["reportSha256"] = hashes[report_id]
        for child in value.values():
            recursively_fill_report_hashes(child, hashes)
    elif isinstance(value, list):
        for child in value:
            recursively_fill_report_hashes(child, hashes)


def report_ref(report_id: str, report_path: str, report_sha: str, relationship: str, **extra: Any) -> dict[str, Any]:
    return {
        "reportId": report_id,
        "reportPath": report_path,
        "reportSha256": report_sha,
        "relationship": relationship,
        **extra,
    }


def queue_status(disposition: str) -> str:
    return "missing" if disposition == "absent" else disposition


def add_scoped_disposition(unit: dict[str, Any], report_id: str, report_path: str,
                           report_sha: str, status: str, scope: str,
                           original_unit_id: str, role: str = "supplemental") -> None:
    unit.setdefault("dispositionEvidence", []).append({
        "reportId": report_id,
        "reportPath": report_path,
        "reportSha256": report_sha,
        "field": "siteDispositionOverall" if report_path.endswith("siteDispositionOverall") else "status",
        "rawStatus": status,
        "normalizedDisposition": status,
        "scope": scope,
        "role": role,
        "originalUnitId": original_unit_id,
    })


def build_report(root: Path = ROOT) -> dict[str, Any]:
    v1_path = root / V1_PATH
    v1_bytes = v1_path.read_bytes()
    if sha256(v1_bytes) != V1_SHA256:
        raise ValueError(f"pinned v1 SHA mismatch: {sha256(v1_bytes)}")
    v1 = json.loads(v1_bytes)

    first14 = load_json(root / FIRST14_PATH)
    last14 = load_json(root / LAST14_PATH)
    queue = load_json(root / QUEUE_PATH)
    neighbors = load_json(root / NEIGHBOR_PATH)
    phb_ability_race = load_json(root / PHB_ABILITY_RACE_PATH)
    phb_spell_proposal = load_json(root / PHB_SPELL_GUIDANCE_PATH)
    phb_spell_focus = load_json(root / PHB_SPELL_FOCUS_PATH)
    mixed_correction = load_json(root / MIXED_CORRECTION_PATH)
    first14_sha = sha256((root / FIRST14_PATH).read_bytes())
    last14_sha = sha256((root / LAST14_PATH).read_bytes())
    queue_sha = sha256((root / QUEUE_PATH).read_bytes())
    neighbor_sha = sha256((root / NEIGHBOR_PATH).read_bytes())
    phb_sha = sha256((root / PHB_ABILITY_RACE_PATH).read_bytes())
    phb_spell_focus_sha = sha256((root / PHB_SPELL_FOCUS_PATH).read_bytes())
    phb_spell_guidance_sha = sha256((root / PHB_SPELL_GUIDANCE_PATH).read_bytes())
    mixed_correction_sha = sha256((root / MIXED_CORRECTION_PATH).read_bytes())
    mixed_prior_sha = sha256((root / MIXED_PRIOR_REVIEW_PATH).read_bytes())
    if (first14_sha, last14_sha, queue_sha, neighbor_sha, phb_sha) != (
        FIRST14_SHA256, LAST14_SHA256, QUEUE_SHA256, NEIGHBOR_SHA256, PHB_ABILITY_RACE_SHA256
    ):
        raise ValueError("one or more bounded source report hashes differ from the pinned inputs")
    if mixed_correction_sha != MIXED_CORRECTION_SHA256 or mixed_prior_sha != MIXED_PRIOR_REVIEW_SHA256:
        raise ValueError("mixed-scope correction or preserved predecessor hash differs from the pinned inputs")
    if phb_spell_focus_sha != PHB_SPELL_FOCUS_SHA256:
        raise ValueError("PHB p.52 independent excerpt review hash differs from the pinned input")
    if phb_spell_guidance_sha != PHB_SPELL_GUIDANCE_SHA256:
        raise ValueError("PHB spell guidance proposal v2 hash differs from the pinned input")

    report = copy.deepcopy(v1)
    report["schemaVersion"] = 2
    report["artifactType"] = "source-audit-pass8-original-unit-join-review-v2"
    report["createdAtUtc"] = "2026-11-08"
    report["purpose"] = (
        "Additive, reproducible exact-pointer join for the 559 named broad source units across PHB, DMG, UA, MM and MM2. "
        "The broad unit denominator overlaps by section, table, profile heading, procedure and page; this report makes no "
        "all-book or whole-unit semantic completeness claim."
    )
    report["priorReport"] = {
        "path": V1_PATH,
        "sha256": V1_SHA256,
        "preservation": "v1 remains byte-for-byte unchanged; v2 is a separate additive artifact.",
    }
    report["builder"] = {
        "path": "tools/source-audit-pass8-original-unit-join-v2.py",
        "method": "Load hash-pinned v1 and source reports; add scoped closure references; fill evidence hashes from the pinned report registry; validate all joins and dimensions before output.",
        "outputPath": OUTPUT_PATH,
    }

    new_entries = [
        {
            "id": "mm-last14",
            "path": LAST14_PATH,
            "sha256": last14_sha,
            "sizeBytes": len((root / LAST14_PATH).read_bytes()),
            "scope": "MM original-unit queue ordinals 15–28: 14 source-table/list candidate IDs",
            "role": "current bounded source assessment",
            "inputCommit": last14.get("inputCommit"),
            "artifactType": last14.get("artifactType"),
            "book": "MM",
            "authorityNote": "Closes the assigned physical table and structured-list review scope only; numeric profile values and broader unit prose may remain unassessed.",
        },
        {
            "id": "mm-elemental-elephant-closure",
            "path": NEIGHBOR_PATH,
            "sha256": neighbor_sha,
            "sizeBytes": len((root / NEIGHBOR_PATH).read_bytes()),
            "scope": "Two MM source-partial/site-owner-map-pending neighbor joins: Elemental and Elephant types",
            "role": "current source/site join closure",
            "inputCommit": neighbors.get("inputCommit"),
            "artifactType": neighbors.get("artifactType"),
            "book": "MM",
            "authorityNote": "Exact owner mapping is closed; scoped dispositions remain partial, excluded or absent as recorded in the closure.",
        },
        {
            "id": "mm-first14-mixed-scope-correction",
            "path": MIXED_CORRECTION_PATH,
            "sha256": mixed_correction_sha,
            "sizeBytes": len((root / MIXED_CORRECTION_PATH).read_bytes()),
            "scope": "Independent scope-policy correction for Horse, Dragon, Elf weapon composition and classic Golem construction children",
            "role": "current independent mixed-scope correction",
            "inputCommit": mixed_correction.get("inputCommit"),
            "artifactType": mixed_correction.get("artifactType"),
            "book": "MM",
            "authorityNote": "Keeps full creature profiles excluded while resolving bounded operative/reference children as in-scope; source reports and the historical repair register are not rewritten.",
        },
        {
            "id": "mm-first14-mixed-scope-prior-review",
            "path": MIXED_PRIOR_REVIEW_PATH,
            "sha256": mixed_prior_sha,
            "sizeBytes": len((root / MIXED_PRIOR_REVIEW_PATH).read_bytes()),
            "scope": "Preserved independent predecessor review for the mixed-scope correction",
            "role": "historical independent review, superseded only on stated scope questions",
            "artifactType": "source-audit-pass8-mm-first14-mixed-scope-independent-review",
            "book": "MM",
            "authorityNote": "Exact predecessor bytes are pinned; this predecessor was not replaced by the correction receipt.",
        },
        {
            "id": "phb-spell-focus-page52-review",
            "path": PHB_SPELL_FOCUS_PATH,
            "sha256": phb_spell_focus_sha,
            "sizeBytes": len((root / PHB_SPELL_FOCUS_PATH).read_bytes()),
            "scope": "Independent source-region review of seven direct PHB p.52 spell excerpts; Word of Recall passage boundary",
            "role": "independent excerpt-boundary review",
            "artifactType": "phb-spell-focus-page52-independent-review",
            "book": "PHB",
            "authorityNote": "Supports the complete passage/region boundary only; it is not treated as an independent arithmetic or source-wording adjudication.",
        },
    ]
    for item in new_entries:
        add_registry_entry(report["reportRegistry"], item)

    report["pinnedSiteSnapshotProjection"] = {
        "path": str(SNAPSHOT_PATH),
        "gzipSha256": SNAPSHOT_GZIP_SHA256,
        "gzipSizeBytes": SNAPSHOT_GZIP_SIZE,
        "decompressedJsonSha256": SNAPSHOT_RAW_SHA256,
        "decompressedSizeBytes": SNAPSHOT_RAW_SIZE,
        "meaning": "Frozen owner/detail/search/source projection used as the site evidence boundary. Snapshot presence does not prove live public-search ranking or findability.",
    }
    report["evidenceInputs"] = [
        {"path": V1_PATH, "sha256": V1_SHA256, "role": "preserved v1 exact-pointer join"},
        {"path": FIRST14_PATH, "sha256": first14_sha, "role": "source review for MM table queue ordinals 1–14"},
        {"path": QUEUE_PATH, "sha256": queue_sha, "role": "28-candidate queue and two separate source-partial neighbor records"},
        {"path": LAST14_PATH, "sha256": last14_sha, "role": "source review for MM table queue ordinals 15–28"},
        {"path": NEIGHBOR_PATH, "sha256": neighbor_sha, "role": "Elemental/Elephant exact owner-join closure"},
        {"path": PHB_ABILITY_RACE_PATH, "sha256": phb_sha, "role": "PHB ability/race source assertions and three separate surface dimensions"},
        {"path": PHB_SPELL_GUIDANCE_PATH, "sha256": phb_spell_guidance_sha, "role": "finite PHB spell guidance proposal set, Word of Recall false-positive correction, and new Druid rule proposal"},
        {"path": PHB_SPELL_FOCUS_PATH, "sha256": phb_spell_focus_sha, "role": "independent p.52 passage-boundary review; no claim of source-value adjudication"},
        {"path": MIXED_PRIOR_REVIEW_PATH, "sha256": mixed_prior_sha, "role": "preserved independent predecessor review; exact bytes retained"},
        {"path": MIXED_CORRECTION_PATH, "sha256": mixed_correction_sha, "role": "current independent mixed-scope correction and exact owner/source findings"},
        {"path": str(SNAPSHOT_PATH), "gzipSha256": SNAPSHOT_GZIP_SHA256, "decompressedJsonSha256": SNAPSHOT_RAW_SHA256, "role": "frozen site snapshot projection"},
    ]

    hashes = {item["id"]: item["sha256"] for item in report["reportRegistry"] if "sha256" in item}
    recursively_fill_report_hashes(report, hashes)

    unit_by_key = {unit["unitKey"]: unit for unit in report["unitJoins"]}
    if len(unit_by_key) != len(report["unitJoins"]):
        raise ValueError("v1 contains duplicate qualified unit keys")

    # Queue ordinals 1–14 have exact source-first review pointers. Their broad
    # v1 status is retained only when the new bounded report agrees.
    first14_units = first14["sourceUnitAssessments"]
    if len(first14_units) != 14:
        raise ValueError("first14 report does not contain exactly 14 source-unit assessments")
    queue_by_id = {item["sourceUnitId"]: item for item in queue["pendingTableCandidates"]}
    if len(queue_by_id) != QUEUE_SIZE:
        raise ValueError("queue candidate IDs are not unique or the expected 28-item queue changed")
    for index, assessment in enumerate(first14_units):
        unit_id = assessment["sourceUnitId"]
        unit = unit_by_key.get(f"MM:{unit_id}")
        if not unit:
            raise ValueError(f"unqualified or missing MM original-unit join for first14 source id {unit_id}")
        q = queue_by_id.get(unit_id)
        if not q or q.get("queueOrdinal") != index + 1:
            raise ValueError(f"first14 assessment does not match queue ordinal {index + 1}: {unit_id}")
        observed = assessment["siteDispositionOverall"]
        if unit["disposition"] != observed:
            raise ValueError(f"first14 disposition changed without source evidence for {unit['unitKey']}: {unit['disposition']} != {observed}")
        ref = report_ref(
            "mm-first14", f"#/sourceUnitAssessments/{index}", FIRST14_SHA256,
            "source-first review for assigned MM queue candidate",
            queueOrdinal=index + 1,
            scopedSiteDisposition=observed,
        )
        unit.setdefault("latestClosureEvidenceRefs", []).append(ref)
        unit.setdefault("sourceSubscopeEvidence", []).append({
            "reportId": "mm-first14",
            "reportPath": f"#/sourceUnitAssessments/{index}",
            "reportSha256": FIRST14_SHA256,
            "sourceReview": assessment.get("sourceReview", {}),
            "scopedDispositions": [
                {
                    "scope": item.get("scope"),
                    "disposition": item.get("disposition"),
                    "siteEvidence": item.get("siteEvidence"),
                }
                for item in assessment.get("scopedDispositions", [])
            ],
            "remainingUnassessed": assessment.get("sourceReview", {}).get("limits", []),
        })
        unit["assignedQueueReview"] = {
            "queueReportId": "mm-table-queue",
            "queueReportPath": f"#/pendingTableCandidates/{index}",
            "queueOrdinal": index + 1,
            "status": "closed-for-assigned-source-review-scope",
            "scopeLimit": "This closure does not certify the complete MM profile/article or whole-book semantics.",
        }

    # Queue ordinals 15–28 are closed by last14. Wolf and Wolverine are two
    # distinct physical matrices carried by one original broad unit ID.
    last_ids = last14["scope"]["reviewedSourceUnitIds"]
    if len(last_ids) != 14 or len(set(last_ids)) != 14:
        raise ValueError("last14 report reviewed IDs do not match its 14-unit denominator")
    if last14["scope"]["reviewedQueueOrdinals"] != list(range(15, 29)):
        raise ValueError("last14 report queue ordinals differ from pinned 15–28 scope")
    last_rows_by_id: dict[str, list[tuple[int, dict[str, Any]]]] = defaultdict(list)
    for index, assessment in enumerate(last14["profileTableAssessments"]):
        last_rows_by_id[assessment["sourceUnitId"]].append((index, assessment))
    men_id = last14["menProcedureAssessment"]["sourceUnitId"]
    for offset, unit_id in enumerate(last_ids):
        queue_ordinal = 15 + offset
        q = queue_by_id.get(unit_id)
        if not q or q.get("queueOrdinal") != queue_ordinal:
            raise ValueError(f"last14 assessment does not match queue ordinal {queue_ordinal}: {unit_id}")
        unit = unit_by_key.get(f"MM:{unit_id}")
        if not unit:
            raise ValueError(f"unqualified or missing MM original-unit join for last14 source id {unit_id}")
        if unit_id == men_id:
            classification = last14["menProcedureAssessment"]["classification"]
            site_status = classification["siteDisposition"]
            source_status = classification["status"]
            refs = [report_ref(
                "mm-last14", "#/menProcedureAssessment/classification", LAST14_SHA256,
                "bounded table and structured-list procedure review",
                sourceReviewStatus=source_status,
                scopedSiteDisposition=site_status,
            )]
            new_disposition = site_status
            rationale = "The physical table/structured-list scope is reviewed and has no current matching site owner; broader profession-prose clauses were not atomized in this supplement."
            review_state = "bounded table/list review closed; broader profession-prose scope remains unassessed"
        else:
            assessments = last_rows_by_id.get(unit_id, [])
            if not assessments:
                raise ValueError(f"no last14 physical table evidence for {unit_id}")
            statuses = {row["runtimeSiteDisposition"]["status"] for _, row in assessments}
            source_statuses = {row["sourceClassification"]["status"] for _, row in assessments}
            if statuses != {"excluded"} or source_statuses != {"reviewClosed"}:
                raise ValueError(f"last14 disposition/status mismatch for {unit_id}: {statuses} / {source_statuses}")
            refs = [report_ref(
                "mm-last14", f"#/profileTableAssessments/{index}", LAST14_SHA256,
                "bounded physical creature-profile matrix and site feature-boundary review",
                physicalTableHeading=row["physicalSourceTable"]["heading"],
                sourceReviewStatus=row["sourceClassification"]["status"],
                scopedSiteDisposition=row["runtimeSiteDisposition"]["status"],
                numericValuesTranscribedOrVerified=row["physicalSourceTable"].get("numericValuesTranscribedOrVerified"),
            ) for index, row in assessments]
            new_disposition = "excluded"
            rationale = "The bounded physical matrix scope is a full creature profile outside the current searchable-monster feature; no profile numeric values are promoted as represented."
            review_state = "bounded physical profile-table review closed; full profile values and broader unit content remain unassessed"

        # Preserve the old row and its prior pending classification as history.
        unit["priorV1Disposition"] = unit["disposition"]
        unit["disposition"] = new_disposition
        unit["dispositionRationale"] = rationale
        unit["reviewStateV1"] = unit["reviewState"]
        unit["reviewState"] = review_state
        unit["assignedQueueReview"] = {
            "queueReportId": "mm-table-queue",
            "queueReportPath": f"#/pendingTableCandidates/{queue_ordinal - 1}",
            "queueOrdinal": queue_ordinal,
            "status": "closed-for-assigned-source-review-scope",
            "scopeLimit": "Workflow closure is separate from full source-unit/content completeness.",
        }
        unit.setdefault("latestClosureEvidenceRefs", []).extend(refs)
        unit.setdefault("sourceSubscopeEvidence", []).append({
            "reportId": "mm-last14",
            "reportPath": refs[0]["reportPath"],
            "reportSha256": LAST14_SHA256,
            "sourceReviewStatus": source_status if unit_id == men_id else "reviewClosed",
            "siteDisposition": new_disposition,
            "physicalTableHeadings": [ref.get("physicalTableHeading") for ref in refs if ref.get("physicalTableHeading")],
            "scopeLimit": rationale,
        })
        site_scope = "current site feature-boundary disposition for the reviewed table/list scope"
        for ref in refs:
            add_scoped_disposition(
                unit, "mm-last14", ref["reportPath"], LAST14_SHA256,
                ref["scopedSiteDisposition"], site_scope, unit_id,
            )

    # Add the two exact site-join closures. Their current unit-level status is
    # partial, while their closed scoped child dispositions stay independent.
    for index, assessment in enumerate(neighbors["sourceUnitAssessments"]):
        unit_id = assessment["sourceUnitId"]
        unit = unit_by_key.get(f"MM:{unit_id}")
        if not unit:
            raise ValueError(f"neighbor closure has no book-prefixed original-unit join: {unit_id}")
        old_pointer = assessment["original559JoinPointer"]
        old_index = int(old_pointer.rsplit("/", 1)[1])
        if old_index >= len(report["unitJoins"]) or report["unitJoins"][old_index]["unitKey"] != unit["unitKey"]:
            raise ValueError(f"neighbor closure original559 pointer does not resolve to {unit['unitKey']}")
        if unit["disposition"] != "partial":
            raise ValueError(f"neighbor unit expected to retain broad partial disposition: {unit['unitKey']}")
        unit.setdefault("latestClosureEvidenceRefs", []).append(report_ref(
            "mm-elemental-elephant-closure", f"#/sourceUnitAssessments/{index}", NEIGHBOR_SHA256,
            "closed exact site-owner join with scoped source/site dispositions",
            joinClosed=assessment["siteJoin"].get("joinClosed"),
            siteDispositionOverall=assessment["siteJoin"].get("siteDispositionOverall"),
            sourceUnitId=unit_id,
        ))
        unit.setdefault("sourceSubscopeEvidence", []).append({
            "reportId": "mm-elemental-elephant-closure",
            "reportPath": f"#/sourceUnitAssessments/{index}",
            "reportSha256": NEIGHBOR_SHA256,
            "scopedDispositions": [
                {"scope": item["scope"], "disposition": item["disposition"]}
                for item in assessment["siteJoin"].get("scopedDispositions", [])
            ],
            "remainingUnassessed": assessment.get("unassessed", []),
        })

    # In PHB ability/race, the 18 third classifications refer to public-search
    # document capture. They say search ranking/findability was unassessable;
    # they do not say the original printed reading was unassessable.
    if phb_ability_race.get("unassessableSourceReadings") != []:
        raise ValueError("PHB ability/race global source-reading list changed; review dimension mapping")
    phb_units = phb_ability_race["unitReviews"]
    if len(phb_units) != 18:
        raise ValueError("PHB ability/race report no longer has the pinned 18-unit scope")
    for index, assessment in enumerate(phb_units):
        unit_id = assessment["originalUnitId"]
        unit = unit_by_key.get(f"PHB:{unit_id}")
        if not unit:
            raise ValueError(f"PHB ability/race source ID lacks a book-prefixed original-unit join: {unit_id}")
        classification = assessment["classifications"][2]
        if classification.get("surface") != "public-search-document-capture" or classification.get("status") != "unassessable":
            raise ValueError(f"PHB third classification is no longer the expected unassessable public-search dimension: {unit_id}")
        unit.setdefault("surfaceClassificationEvidence", []).append({
            "classificationRef": f"#/unitReviews/{index}/classifications/2",
            "scope": classification["surface"],
            "rawDispositionEvidence": [{
                "reportId": "phb-ability-race",
                "reportPath": f"#/unitReviews/{index}/classifications/2",
                "reportSha256": PHB_ABILITY_RACE_SHA256,
                "field": "status",
                "rawStatus": classification["status"],
                "normalizedDisposition": classification["status"],
                "scope": classification["surface"],
                "role": "supplemental surface dimension",
                "originalUnitId": unit_id,
            }],
        })
        unit["sourceReadingDimension"] = {
            "status": "no-explicit-unassessable-reading-recorded",
            "reportId": "phb-ability-race",
            "reportPath": "#/unassessableSourceReadings",
            "reportSha256": PHB_ABILITY_RACE_SHA256,
            "meaning": "This report records no unassessable source reading; that does not certify every source fact or the whole original unit as complete.",
        }
        unit["publicSearchDimension"] = {
            "status": "unassessable",
            "reportId": "phb-ability-race",
            "reportPath": f"#/unitReviews/{index}/classifications/2",
            "reportSha256": PHB_ABILITY_RACE_SHA256,
            "surface": "public-search-document-capture",
            "searchDocumentCaptured": bool(assessment.get("surfaceJoins") and assessment["surfaceJoins"][0].get("publicSearchDocument", {}).get("captured")),
            "meaning": "A captured search document does not establish live query/ranking/findability; the assessment remains unassessable.",
        }
        if unit.get("reviewState") == "bounded review has an explicitly unassessable source reading":
            unit["historicalReviewState"] = unit["reviewState"]
            unit["reviewStateV1"] = unit["reviewState"]
            unit["reviewState"] = "bounded source assertions classified; live public-search findability unassessed"

    # Reconcile the PHB spell-body candidate cohort without promoting the
    # broad original unit. The old 11-item list includes one rejected false
    # positive; the separate Druid shared rule is an absent owner child.
    spell_scope = phb_spell_proposal["scopeAndLimits"]
    spell_focus_record = next((
        (index, item) for index, item in enumerate(phb_spell_focus["records"])
        if item.get("itemId") == "phb-cleric-word-of-recall"
    ), None)
    if spell_focus_record is None:
        raise ValueError("independent PHB p.52 excerpt review has no Word of Recall record")
    focus_index, focus_record = spell_focus_record
    if focus_record.get("verdict") != "confirmed-whole-image-exception":
        raise ValueError("Word of Recall passage-boundary review changed")
    if (spell_scope.get("repairCandidatesOriginallyReported"),
        spell_scope.get("sourceSupportedPHBSpellRepairsHere"),
        spell_scope.get("rejectedFalsePositiveCount"),
        spell_scope.get("newDruidSharedRuleProposalCount")) != (11, 10, 1, 1):
        raise ValueError("PHB spell guidance proposal cohort counts changed")
    if len(phb_spell_proposal["ownerProposals"]) != 10:
        raise ValueError("PHB spell guidance proposal no longer contains ten source-supported candidates")
    if phb_spell_proposal["rejectedFalsePositive"].get("classification") != "rejected-audit-false-positive":
        raise ValueError("Word of Recall false-positive adjudication changed")
    druid_proposal = phb_spell_proposal["sharedDruidSupportingRuleProposal"]
    if druid_proposal.get("currentOwnerLookup", {}).get("candidateDedicatedOwnerMatches") != 0:
        raise ValueError("Druid shared-rule owner lookup changed")

    cleric_spell_unit = unit_by_key["PHB:spell-descriptions-cleric"]
    druid_spell_unit = unit_by_key["PHB:spell-descriptions-druid"]
    if cleric_spell_unit["disposition"] != "partial" or druid_spell_unit["disposition"] != "partial":
        raise ValueError("PHB broad spell-description unit statuses must remain partial")
    proposal_sha = PHB_SPELL_GUIDANCE_SHA256
    spell_children = []
    for index, proposal in enumerate(phb_spell_proposal["ownerProposals"]):
        spell_children.append({
            "proposalId": proposal["proposalId"],
            "ownerId": proposal["stableSiteOwner"]["id"],
            "disposition": "source-supported-proposal",
            "reportId": "phb-guidance-proposal-v2",
            "reportPath": f"#/ownerProposals/{index}",
            "reportSha256": proposal_sha,
            "productionChangePerformed": proposal.get("productionChangePerformed"),
        })
    rejected = phb_spell_proposal["rejectedFalsePositive"]
    word_recall_child = {
        "proposalId": rejected["proposalId"],
        "ownerId": rejected["stableSiteOwner"]["id"],
        "disposition": "rejected-audit-false-positive",
        "historicalReportId": "phb-spell-bodies",
        "historicalReportPath": "#/findings/10",
        "historicalReportSha256": report_registry_hash(report, "phb-spell-bodies"),
        "reportId": "phb-guidance-proposal-v2",
        "reportPath": "#/rejectedFalsePositive",
        "reportSha256": proposal_sha,
        "sourcePixelFinding": rejected["sourcePixelRecheck"]["pixelFinding"],
        "currentDisposition": rejected["disposition"],
        "noContentChange": rejected.get("productionChangePerformed") is False,
        "independentSourceConfirmation": "Root and UA independently confirmed the same PHB p.52 reading and no content change, per the parent delegation instruction.",
        "independentExcerptBoundaryReview": {
            "reportId": "phb-spell-focus-page52-review",
            "reportPath": f"#/records/{focus_index}",
            "reportSha256": PHB_SPELL_FOCUS_SHA256,
            "verdict": focus_record["verdict"],
            "scopeLimit": "This separate report confirms the passage boundary/region; it is not used as the arithmetic source-reading proof.",
        },
    }
    druid_child = {
        "proposalId": druid_proposal["proposalId"],
        "ownerIdProposal": druid_proposal["stableOwnerIdProposal"],
        "sourceUnitKey": "PHB:spell-descriptions-druid",
        "scope": "PHB p.54 Notes Regarding Druid (Cleric) Spells block",
        "sourceDenominator": druid_proposal["sourceUnitDenominator"],
        "currentDedicatedOwnerMatches": 0,
        "disposition": "absent",
        "category": "missing",
        "reportId": "phb-guidance-proposal-v2",
        "reportPath": "#/sharedDruidSupportingRuleProposal",
        "reportSha256": proposal_sha,
        "proposalStatus": druid_proposal["classification"],
        "productionChangePerformed": druid_proposal.get("productionChangePerformed"),
        "scopeBoundary": "New scoped child absence/proposal; the PHB Druid spell-description original unit remains partial.",
    }
    cleric_spell_unit["spellGuidanceChildCohort"] = {
        "proposalCount": len(spell_children),
        "rejectedFalsePositive": word_recall_child,
        "sourceSupportedProposals": spell_children,
        "meaning": "The original eleven candidate IDs comprise ten source-supported proposals and one rejected false positive. Do not treat eleven as eleven remaining spell issues.",
    }
    druid_spell_unit.setdefault("correctedSourceSubscopeEvidence", []).append(druid_child)
    for unit in (cleric_spell_unit, druid_spell_unit):
        unit.setdefault("additionalScopedEvidenceRefs", []).append(report_ref(
            "phb-guidance-proposal-v2", "#/scopeAndLimits", proposal_sha,
            "finite PHB spell body cohort reconciliation; broad unit status remains partial",
            sourceSupportedRepairProposalCount=10,
            rejectedFalsePositiveCount=1,
            newDruidSharedRuleProposalCount=1,
        ))

    report["phbSpellGuidanceAdjudication"] = {
        "proposalReportId": "phb-guidance-proposal-v2",
        "proposalReportPath": "#/scopeAndLimits",
        "proposalReportSha256": proposal_sha,
        "historicalPHBSpellCandidateCount": spell_scope["repairCandidatesOriginallyReported"],
        "sourceSupportedRepairProposalCount": spell_scope["sourceSupportedPHBSpellRepairsHere"],
        "rejectedFalsePositiveCount": spell_scope["rejectedFalsePositiveCount"],
        "newDruidSharedRuleProposalCount": spell_scope["newDruidSharedRuleProposalCount"],
        "activeIssueInterpretation": "Ten finite source-supported spell-leaf proposals remain in the author proposal cohort. Word of Recall is removed from that issue set as a rejected transcription false positive. A distinct Druid shared-rule child is absent from dedicated current owners; its source-supported addition remains a proposal.",
        "wordOfRecall": word_recall_child,
        "sourceSupportedProposalIds": [item["proposalId"] for item in spell_children],
        "druidAbsentChild": druid_child,
        "coarseSourceUnitStatuses": [
            {"unitKey": "PHB:spell-descriptions-cleric", "disposition": cleric_spell_unit["disposition"], "reportId": "phb-spell-bodies", "reportPath": "#/unitReviews/0/sourceAssertions/0", "reportSha256": report_registry_hash(report, "phb-spell-bodies"), "meaning": "76 article heads were bounded; broader spell prose is not a complete clause denominator."},
            {"unitKey": "PHB:spell-descriptions-druid", "disposition": druid_spell_unit["disposition"], "reportId": "phb-spell-bodies", "reportPath": "#/unitReviews/1/sourceAssertions/0", "reportSha256": report_registry_hash(report, "phb-spell-bodies"), "meaning": "The absent Druid support rule is a scoped child gap; the original broad spell unit remains partial."},
        ],
        "noProductionChanges": True,
    }
    for item in report["crossCuttingAdjudications"]:
        if item.get("id") == "PHB-Word-of-Recall-source-misread-superseded":
            item["v1Status"] = item["status"]
            item["status"] = "source reading corrected and independently confirmed; historical candidate is not an active issue"
            item["statusBoundary"] = "PHB p.52 reads 250 gp-weight per cleric level and 3,750 at level 15. Keep the historical 500 misread in the source report, make no Word of Recall content change, and do not count it among ten source-supported spell proposals. The cleric spell-description source unit remains partial."
            item["rootAndUAIndependentConfirmation"] = "Per parent delegation instruction, root and UA independently confirmed the same source reading and no content change."
    proposal_registry_entry = registry_map(report["reportRegistry"]).get("phb-guidance-proposal-v2")
    if proposal_registry_entry:
        proposal_registry_entry["v2Disposition"] = "Ten source-supported owner proposals remain finite proposal candidates; one historical Word of Recall false positive is rejected; one separate Druid shared-rule child is absent. No production changes are represented."
    for index, limitation in enumerate(report["limitations"]):
        if "Word of Recall correction is source-pixel-supported but remains a proposal awaiting independent source review" in limitation:
            report["limitations"][index] = "Word of Recall's 500 gp-weight finding is a rejected source-reading false positive; the 250 gp-weight-per-level text and 3,750-at-15th example are confirmed with no content change. The ten remaining owner proposals and separate Druid absence stay bounded and do not close broad PHB spell-body coverage."

    # Preserve actual source-image limitations independently of surface/search
    # statuses. The known DMG edge-clipped glyph finding remains source-only.
    source_reading_unassessable: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for unit in report["unitJoins"]:
        evidence_rows = [e for e in unit.get("dispositionEvidence", [])
                         if e.get("normalizedDisposition") == "unassessable"
                         and e.get("reportId")
                         and e.get("field") in {"status", "classification"}
                         and "public-search-document-capture" not in str(e.get("scope", ""))
                         and ("source" in str(e.get("scope", "")).lower()
                              or "glyph" in str(e.get("scope", "")).lower()
                              or e.get("scope") == "clipped-source-reading")]
        if evidence_rows:
            source_reading_unassessable[unit["book"]].append({
                "unitKey": unit["unitKey"],
                "evidence": [{
                    "reportId": evidence["reportId"],
                    "reportPath": evidence["reportPath"],
                    "reportSha256": hashes.get(evidence["reportId"]),
                    "scope": evidence.get("scope"),
                } for evidence in evidence_rows],
            })
            chosen = next((e for e in evidence_rows if e.get("scope") == "clipped-source-reading"), evidence_rows[0])
            unit["sourceReadingDimension"] = {
                "status": "unassessable",
                "reportId": chosen["reportId"],
                "reportPath": chosen["reportPath"],
                "reportSha256": hashes.get(chosen["reportId"]),
                "evidencePointers": [{"reportId": e["reportId"], "reportPath": e["reportPath"], "reportSha256": hashes.get(e["reportId"]), "scope": e.get("scope")} for e in evidence_rows],
                "meaning": "The cited source image has a source-side legibility limit; the glyphs/clauses are not reconstructed.",
            }

    # Resolve all exact report pointers to pinned registry hashes, then publish
    # an explicit primary hash per original unit.
    hashes = {item["id"]: item["sha256"] for item in report["reportRegistry"] if "sha256" in item}
    recursively_fill_report_hashes(report, hashes)
    for unit in report["unitJoins"]:
        primary_id = unit["primaryAssessmentRecord"]["reportId"]
        if primary_id not in hashes:
            raise ValueError(f"primary report is missing from the pinned registry for {unit['unitKey']}: {primary_id}")
        unit["primaryReportSha256"] = hashes[primary_id]
        unit["dispositionCategory"] = raw_to_category(unit["disposition"])

    unit_counts: dict[str, dict[str, int]] = {}
    all_counts = Counter({category: 0 for category in CATEGORY_ORDER})
    raw_counts_by_book: dict[str, dict[str, int]] = {}
    for book in BOOK_COUNTS:
        rows = [u for u in report["unitJoins"] if u["book"] == book]
        counts = Counter(u["dispositionCategory"] for u in rows)
        unit_counts[book] = {category: counts.get(category, 0) for category in CATEGORY_ORDER}
        all_counts.update(counts)
        raw_counts_by_book[book] = dict(Counter(u["disposition"] for u in rows))
    report["summary"]["dispositionsByBook"] = raw_counts_by_book
    report["summary"]["dispositionCategoryCountsByBook"] = unit_counts
    report["summary"]["overallDispositionCategoryCounts"] = {category: all_counts.get(category, 0) for category in CATEGORY_ORDER}
    report["summary"]["qualifiedOriginalUnits"] = len(report["unitJoins"])
    report["summary"]["uniqueQualifiedIds"] = len({u["unitKey"] for u in report["unitJoins"]})
    report["summary"]["unitsByBook"] = {book: sum(u["book"] == book for u in report["unitJoins"]) for book in BOOK_COUNTS}
    review_state_counts_by_book: dict[str, dict[str, int]] = {}
    for book in BOOK_COUNTS:
        rows = [u for u in report["unitJoins"] if u["book"] == book]
        review_state_counts_by_book[book] = dict(Counter(u["reviewState"] for u in rows))
    report["summary"]["reviewStateCountsByBook"] = review_state_counts_by_book
    mm_pending_review_state = sum(
        u["book"] == "MM" and u["reviewState"] == "pending source or site assertion work remains in the referenced scope"
        for u in report["unitJoins"]
    )
    mm_closed_but_broader_unassessed = sum(
        u["book"] == "MM"
        and u.get("assignedQueueReview", {}).get("status") == "closed-for-assigned-source-review-scope"
        and "broader" in u["reviewState"].lower()
        and "unassessed" in u["reviewState"].lower()
        for u in report["unitJoins"]
    )
    report["summary"]["mmBroaderUnassessedOrPendingSourceUnitCount"] = mm_pending_review_state + mm_closed_but_broader_unassessed
    report["summary"]["mmReviewStateBridge"] = {
        "pendingBroaderAssertionWork": mm_pending_review_state,
        "queueScopeClosedButBroaderContentUnassessed": mm_closed_but_broader_unassessed,
        "combinedBroaderUnassessedOrPending": mm_pending_review_state + mm_closed_but_broader_unassessed,
        "meaning": "Queue closure does not erase broader MM source assertion work; this derived sum keeps pending workflow and closed table/list work with broader content still unassessed distinct.",
    }
    report["summary"]["notACompletenessClaim"] = True
    report["summary"]["completeSemanticSourceUnitCount"] = None
    report["summary"]["semanticallyCompleteBooks"] = 0

    public_search_counts = Counter()
    for unit in report["unitJoins"]:
        if unit.get("publicSearchDimension"):
            public_search_counts[unit["publicSearchDimension"]["status"]] += 1
    report["dimensionalSummary"] = {
        "unitDisposition": {
            "categories": list(CATEGORY_ORDER),
            "countsByBook": unit_counts,
            "overallCounts": {category: all_counts.get(category, 0) for category in CATEGORY_ORDER},
            "denominatorMeaning": "559 named broad units; overlapping unit candidates, not semantic atoms, rows, profiles, fields or clauses.",
        },
        "sourceReading": {
            "actualUnassessableSourceReadingCountsByBook": {book: len(source_reading_unassessable.get(book, [])) for book in BOOK_COUNTS},
            "actualUnassessableSourceReadingEvidence": dict(source_reading_unassessable),
            "phbAbilityRaceReportId": "phb-ability-race",
            "phbAbilityRaceReportPath": "#/unassessableSourceReadings",
            "phbAbilityRaceReportSha256": PHB_ABILITY_RACE_SHA256,
            "phbAbilityRaceExplicitlyUnassessableReadings": len(phb_ability_race["unassessableSourceReadings"]),
            "meaning": "Source-image reading limits remain source-only findings. The 18 PHB ability/race public-search capture classifications are not source-reading failures.",
        },
        "publicSearch": {
            "phbAbilityRaceUnitCount": len(phb_units),
            "searchDocumentsCaptured": sum(bool(u.get("surfaceJoins") and u["surfaceJoins"][0].get("publicSearchDocument", {}).get("captured")) for u in phb_units),
            "assessmentCounts": dict(public_search_counts),
            "liveFindabilityClaimsMade": 0,
            "meaning": "Public search document capture/findability is a separate surface dimension; document presence is not promoted into a search result/ranking pass.",
        },
    }
    report["closureSummary"] = {
        "mmTableQueue": {
            "queueReportId": "mm-table-queue",
            "queueReportPath": "#/pendingTableCandidates",
            "queueReportSha256": queue_sha,
            "candidateCount": QUEUE_SIZE,
            "first14Reviewed": len(first14_units),
            "last14Reviewed": len(last_ids),
            "pendingAfterBoundedReview": sum(1 for u in report["unitJoins"] if u.get("assignedQueueReview") and u["assignedQueueReview"].get("status") != "closed-for-assigned-source-review-scope"),
            "broaderReviewStateBridge": report["summary"]["mmReviewStateBridge"],
            "limitations": [
                "Queue closure is bounded to the assigned physical table/profile or structured-list review scopes.",
                "Creature profile numeric values remain untranscribed in the 13 last14 profile matrices.",
                "Men profession narrative clauses remain unatomized in the last14 procedure assessment.",
                "The complete MM book contains further unresolved source/profile/row/qualifier denominators.",
            ],
        },
        "mmPartialNeighborJoins": {
            "reportId": "mm-elemental-elephant-closure",
            "reportSha256": neighbor_sha,
            "closedUnitCount": len(neighbors["sourceUnitAssessments"]),
            "units": [item["sourceUnitId"] for item in neighbors["sourceUnitAssessments"]],
            "unitLevelDisposition": "partial",
            "meaning": "Exact joins are closed; scoped absent, partial and excluded assertions remain distinct.",
        },
    }
    bounded_scope_ids = {
        "MM:mm-table-candidate-horse-types": "horse",
        "MM:mm-table-candidate-dragon-types-and-progression": "dragon",
        "MM:mm-table-candidate-elf-weapon-table": "elf",
        "MM:mm-table-candidate-golem-types": "golem",
    }
    bounded_scope_rows: dict[str, Any] = {}
    for unit_key, label in bounded_scope_ids.items():
        unit_id = unit_key.split(":", 1)[1]
        assessment_index = next(i for i, item in enumerate(first14_units) if item["sourceUnitId"] == unit_id)
        assessment = first14_units[assessment_index]
        scoped = assessment.get("scopedDispositions", [])
        bounded_scope_rows[label] = {
            "unitKey": unit_key,
            "broadUnitDisposition": unit_by_key[unit_key]["disposition"],
            "reportId": "mm-first14",
            "reportPath": f"#/sourceUnitAssessments/{assessment_index}/scopedDispositions",
            "reportSha256": first14_sha,
            "scopedDispositions": [
                {
                    "reportId": "mm-first14",
                    "reportPath": f"#/sourceUnitAssessments/{assessment_index}/scopedDispositions/{index}",
                    "reportSha256": first14_sha,
                    "scope": item.get("scope"),
                    "disposition": item.get("disposition"),
                    "siteEvidence": item.get("siteEvidence"),
                }
                for index, item in enumerate(scoped)
            ],
            "scopeBoundary": "The broad original unit remains partial where operative rules survive; profile/stat-data exclusions do not erase separate absent or partial rule scopes.",
        }
    men_unit_key = "MM:mm-table-candidate-men-professions"
    bounded_scope_rows["men-professions"] = {
        "unitKey": men_unit_key,
        "broadUnitDisposition": unit_by_key[men_unit_key]["disposition"],
        "reportId": "mm-last14",
        "reportPath": "#/menProcedureAssessment/classification",
        "reportSha256": last14_sha,
        "sourceReviewStatus": last14["menProcedureAssessment"]["classification"]["status"],
        "siteDisposition": last14["menProcedureAssessment"]["classification"]["siteDisposition"],
        "broaderProseAssertionDenominator": last14["menProcedureAssessment"]["classification"].get("broaderProseAssertionDenominator"),
        "scopeBoundary": last14["menProcedureAssessment"]["classification"].get("limit"),
    }
    correction_findings = {item["id"]: (index, item) for index, item in enumerate(mixed_correction["findings"])}
    correction_targets = {
        "horse": ("mm-table-candidate-horse-types", "mm-table-candidate-horse-types", 0),
        "dragon": ("mm-table-candidate-dragon-types-and-progression", "mm-table-candidate-dragon-types-and-progression/subduing-a-dragon", 1),
        "elf": ("mm-table-candidate-elf-weapon-table", "mm-table-candidate-elf-weapon-table", 2),
        "golem": ("mm-table-candidate-golem-types", "mm-table-candidate-golem-types", 3),
    }
    corrected_scope_records: list[dict[str, Any]] = []
    for label, (unit_id, finding_id, finding_index) in correction_targets.items():
        report_row = mixed_correction["findings"][finding_index]
        if report_row["id"] != finding_id:
            raise ValueError(f"mixed-scope correction finding order/identity changed for {label}")
        unit_key = f"MM:{unit_id}"
        unit = unit_by_key[unit_key]
        previous = bounded_scope_rows[label].get("scopedDispositions", [])
        correction_ref = {
            "reportId": "mm-first14-mixed-scope-correction",
            "reportPath": f"#/findings/{finding_index}",
            "reportSha256": mixed_correction_sha,
            "correctedScopeClassification": report_row["classification"],
            "scopeReason": report_row["scopeReason"],
        }
        bounded_scope_rows[label]["priorScopedDispositions"] = previous
        bounded_scope_rows[label]["scopeCorrectionEvidence"] = correction_ref

        if label == "horse":
            rows = [
                {"scope": "full horse stat-profile columns", "disposition": "excluded", "reportPath": "#/scopePolicyCorrection", "reason": "Full creature stat profiles remain outside the feature boundary."},
                {"scope": "horse maximum-load/encumbrance table, six rows and movement qualifier", "disposition": "missing", "reportPath": "#/findings/0", "reason": "PHB livestock owners expose purchase prices, not the MM p.53 load capacities."},
            ]
        elif label == "dragon":
            rows = [
                {"scope": "full dragon creature stat profile", "disposition": "excluded", "reportPath": "#/scopePolicyCorrection", "reason": "A full searchable bestiary/stat profile remains out of scope."},
                {"scope": "dragon age/size progression and breath-effectiveness chart", "disposition": "unassessable", "reportPath": "#/unassessed/1", "reason": "The correction explicitly did not adjudicate these as separate content repairs; retain the old exclusion as historical only."},
                {"scope": "Subduing a Dragon and adjacent Length of Subdual procedure", "disposition": "missing", "reportPath": "#/findings/1", "reason": "The generic rules/subdual owner is a semantic fit, but it lacks the MM p.30 source binding and dragon-specific procedure."},
            ]
        elif label == "elf":
            rows = [
                {"scope": "full elf creature profile text", "disposition": "excluded", "reportPath": "#/scopePolicyCorrection", "reason": "Creature profile text remains outside the feature boundary."},
                {"scope": "elf-band weapon composition distribution and separate Wood Elf percentages", "disposition": "missing", "reportPath": "#/findings/2", "reason": "An in-scope encounter-composition reference has no exact current owner."},
            ]
        else:
            rows = [
                {"scope": "four classic Golem creature stat profiles and numeric profile cells", "disposition": "excluded", "reportPath": "#/findings/3", "reason": "The correction preserves the profile boundary; values are not transcribed."},
                {"scope": "classic Golem prerequisites, creator spells, construction steps, time, control and operating outcomes", "disposition": "missing", "reportPath": "#/findings/3", "reason": "The in-scope construction reference has no exact classic MM site owner; UA cleric golem is a distinct spell."},
                {"scope": "five existing classic Golem construction-cost claims", "disposition": "missing", "reportPath": "#/findings/3", "economicReportId": "mm-economic", "economicClaimIds": report_row["currentOwnerJoin"]["economicReportClaimsAlreadyRecorded"], "economicClaimPointers": [
                    {"reportId": "mm-economic", "reportPath": f"#/legacyClaimReconciliation/{index}", "reportSha256": registry_map(report["reportRegistry"])["mm-economic"]["sha256"], "claimId": claim_id}
                    for index, claim_id in enumerate(report_row["currentOwnerJoin"]["economicReportClaimsAlreadyRecorded"], start=7)
                ], "reason": "These already-itemized costs are in-scope, have no exact current owner, and are not duplicated as new monetary claims."},
            ]
        corrected = []
        for row_index, row in enumerate(rows):
            ref = {
                **row,
                "category": raw_to_category(row["disposition"]),
                "reportId": "mm-first14-mixed-scope-correction",
                "reportPath": row["reportPath"],
                "reportSha256": mixed_correction_sha,
                "priorDisposition": None,
            }
            corrected.append(ref)
        bounded_scope_rows[label]["scopedDispositions"] = corrected
        bounded_scope_rows[label]["broadUnitDisposition"] = unit["disposition"]
        unit.setdefault("correctedSourceSubscopeEvidence", []).append({
            **correction_ref,
            "preservedPriorScopedDispositions": previous,
            "correctedScopedDispositions": corrected,
            "meaning": "Operative child dispositions are recorded separately from full-profile exclusions; original broad-unit and queue classifications remain visible.",
        })
        corrected_scope_records.extend({"unitKey": unit_key, **row} for row in corrected)

    men_scope = bounded_scope_rows["men-professions"]
    men_scope["priorDisposition"] = men_scope.get("siteDisposition")
    men_scope["scopedDispositions"] = [{
        "scope": "Men profession table/structured-list procedure",
        "disposition": "missing",
        "category": "missing",
        "reportId": "mm-last14",
        "reportPath": "#/menProcedureAssessment/classification",
        "reportSha256": last14_sha,
        "reason": "No current site owner represents the reviewed table/list procedure scope.",
    }, {
        "scope": "Broader profession-by-profession narrative procedure clauses",
        "disposition": "unassessable",
        "category": "unassessable",
        "reportId": "mm-last14",
        "reportPath": "#/menProcedureAssessment/classification",
        "reportSha256": last14_sha,
        "reason": "The report leaves this broader prose clause denominator null; it was not atomized.",
    }]
    corrected_scope_records.extend({"unitKey": men_unit_key, **row} for row in men_scope["scopedDispositions"])

    report["boundedMMOperativeScopeDispositions"] = {
        "meaning": "Separates profile-table exclusions from bounded operative/reference child scopes. Prior source report dispositions remain available under priorScopedDispositions.",
        **bounded_scope_rows,
    }
    report["correctedMixedScopeDispositions"] = {
        "correctionReportId": "mm-first14-mixed-scope-correction",
        "correctionReportSha256": mixed_correction_sha,
        "sourceReportDispositionHistory": "Original first14 assessments remain unchanged. V2 applies the independent scope correction only to child-scope classification; it does not rewrite source reports, site data or the historical repair register.",
        "records": corrected_scope_records,
        "counts": dict(Counter(row["category"] for row in corrected_scope_records)),
    }
    report["limitations"] = list(report.get("limitations", [])) + [
        "V2 preserves V1 bytes and adds a new report; v1 SHA-256 remains 425bcf69ce1d44da3ffaecdc8da2993432251f51a36d2245011ae704e2de4865.",
        "MM queue ordinals 1–28 are closed only for their assigned table/profile/list scopes. This is not a whole-MM audit.",
        "The PHB ability/race public-search-document-capture status is unassessable on 18 units; the source report has zero explicitly unassessable source readings. Search document capture is not evidence of live findability.",
        "The 559 named units overlap and are not a complete semantic denominator. No source unit or book is promoted to whole-book semantic completeness.",
    ]
    return report


def validate_report(report: dict[str, Any], root: Path = ROOT, verify_inputs: bool = False) -> list[str]:
    errors: list[str] = []
    registry = registry_map(report.get("reportRegistry", []))
    units = report.get("unitJoins", [])
    if len(units) != 559:
        errors.append(f"unit join denominator is {len(units)}, expected 559")
    keys = [unit.get("unitKey") for unit in units]
    if len(keys) != len(set(keys)):
        errors.append("duplicate qualified unit keys")
    for book, expected in BOOK_COUNTS.items():
        count = sum(unit.get("book") == book for unit in units)
        if count != expected:
            errors.append(f"{book} has {count} rows, expected {expected}")
    for unit in units:
        expected_key = f"{unit.get('book')}:{unit.get('originalUnitId')}"
        if unit.get("unitKey") != expected_key:
            errors.append(f"unqualified/misjoined ID: {unit.get('unitKey')} should be {expected_key}")
        primary = unit.get("primaryAssessmentRecord", {}).get("reportId")
        if primary not in registry:
            errors.append(f"primary report absent from registry: {unit.get('unitKey')} -> {primary}")
        elif unit.get("primaryReportSha256") != registry[primary].get("sha256"):
            errors.append(f"primaryReportSha256 mismatch: {unit.get('unitKey')}")
        category = raw_to_category(unit.get("disposition", ""))
        if category not in CATEGORY_ORDER or unit.get("dispositionCategory") != category:
            errors.append(f"invalid disposition category: {unit.get('unitKey')} -> {category}/{unit.get('dispositionCategory')}")
        if unit.get("disposition") == "pending":
            errors.append(f"pending unit disposition remains: {unit.get('unitKey')}")

    expected_review_states: dict[str, dict[str, int]] = {}
    for book in BOOK_COUNTS:
        counts = Counter(u.get("reviewState") for u in units if u.get("book") == book)
        expected_review_states[book] = dict(counts)
    if report.get("summary", {}).get("reviewStateCountsByBook") != expected_review_states:
        errors.append("review-state summary differs from actual per-unit rows")

    def walk(value: Any) -> None:
        if isinstance(value, dict):
            report_id = value.get("reportId")
            if report_id is not None and "reportPath" in value:
                record = registry.get(report_id)
                if record is None:
                    errors.append(f"unregistered report pointer {report_id}{value['reportPath']}")
                elif value.get("reportSha256") != record.get("sha256"):
                    errors.append(f"report hash missing/mismatched at {report_id}{value['reportPath']}")
            for child in value.values():
                walk(child)
        elif isinstance(value, list):
            for child in value:
                walk(child)

    walk(report)

    cats = Counter(unit.get("dispositionCategory") for unit in units)
    expected_summary = report.get("summary", {}).get("overallDispositionCategoryCounts", {})
    for category in CATEGORY_ORDER:
        if expected_summary.get(category) != cats.get(category, 0):
            errors.append(f"summary count mismatch for {category}: {expected_summary.get(category)} != {cats.get(category, 0)}")
    if sum(cats.values()) != 559:
        errors.append("unit disposition categories do not sum to 559")

    if report.get("census", {}).get("completeSemanticSourceUnitCount") is not None:
        errors.append("semantic source-unit count must remain null")
    if report.get("summary", {}).get("semanticallyCompleteBooks") != 0:
        errors.append("semantic-completeness book count was promoted")
    if report.get("summary", {}).get("notACompletenessClaim") is not True:
        errors.append("report must retain an explicit no-completeness-claim marker")

    queue_units = [unit for unit in units if unit.get("assignedQueueReview")]
    if len(queue_units) != QUEUE_SIZE:
        errors.append(f"only {len(queue_units)} of 28 queued MM table candidates have closure links")
    queue_ordinals = sorted(unit["assignedQueueReview"]["queueOrdinal"] for unit in queue_units)
    if queue_ordinals != list(range(1, QUEUE_SIZE + 1)):
        errors.append("MM queue closure ordinals are missing, duplicated, or misjoined")
    expected_last14 = {f"MM:{unit_id}" for unit_id in [
        "mm-table-candidate-lycanthrope-types", "mm-table-candidate-men-professions", "mm-table-candidate-mold-types",
        "mm-table-candidate-naga-types", "mm-table-candidate-ray-types", "mm-table-candidate-rhinoceros-types",
        "mm-table-candidate-shark-types", "mm-table-candidate-snake-types", "mm-table-candidate-sphinx-types",
        "mm-table-candidate-spider-types", "mm-table-candidate-tiger-types", "mm-table-candidate-toad-types",
        "mm-table-candidate-turtle-types", "mm-table-candidate-wolf-wolverine-types",
    ]}
    for key in expected_last14:
        unit = next((u for u in units if u.get("unitKey") == key), None)
        if not unit or unit.get("disposition") == "pending" or not any(ref.get("reportId") == "mm-last14" for ref in unit.get("latestClosureEvidenceRefs", [])):
            errors.append(f"last14 unit is pending or lacks exact closure evidence: {key}")
    if sum(next(u for u in units if u["unitKey"] == key)["disposition"] == "excluded" for key in expected_last14) != 13:
        errors.append("last14 profile exclusions do not total 13")
    if next((u for u in units if u["unitKey"] == "MM:mm-table-candidate-men-professions"), {}).get("disposition") != "absent":
        errors.append("last14 men-professions procedure status must remain absent/missing")

    phb_units = [u for u in units if u.get("book") == "PHB" and u.get("sourceReadingDimension", {}).get("reportId") == "phb-ability-race"]
    if len(phb_units) != 18:
        errors.append(f"PHB source-reading dimension has {len(phb_units)} rows, expected 18")
    if any("explicitly unassessable source reading" in u.get("reviewState", "") for u in phb_units):
        errors.append("PHB public-search unassessability is still mislabeled as source-reading unassessability")
    if any(u.get("historicalReviewState") != "bounded review has an explicitly unassessable source reading" for u in phb_units):
        errors.append("PHB prior reviewState history was not preserved separately")
    if any(u.get("sourceReadingDimension", {}).get("status") != "no-explicit-unassessable-reading-recorded" for u in phb_units):
        errors.append("PHB explicit source-reading dimension was altered")
    if any(u.get("publicSearchDimension", {}).get("status") != "unassessable" for u in phb_units):
        errors.append("PHB public-search status was promoted or lost")
    if any(u.get("publicSearchDimension", {}).get("searchDocumentCaptured") is not True for u in phb_units):
        errors.append("PHB search document capture evidence is missing")
    if report.get("dimensionalSummary", {}).get("sourceReading", {}).get("phbAbilityRaceExplicitlyUnassessableReadings") != 0:
        errors.append("PHB ability/race source-reading unassessable count must remain zero")
    source_reading_counts = report.get("dimensionalSummary", {}).get("sourceReading", {}).get("actualUnassessableSourceReadingCountsByBook", {})
    if source_reading_counts.get("DMG") != 1 or source_reading_counts.get("UA") != 1:
        errors.append("source-side DMG/UA glyph limitations were lost")
    dmg_edge = next((u for u in units if u.get("unitKey") == "DMG:dmg-p11-edge-limited-glyphs"), None)
    if not dmg_edge or dmg_edge.get("sourceReadingDimension", {}).get("status") != "unassessable":
        errors.append("DMG source-reading unassessability must remain explicit")
    ua_drow = next((u for u in units if u.get("book") == "UA" and u.get("sourceReadingDimension", {}).get("status") == "unassessable"), None)
    ua_scopes = [e.get("scope", "") for e in ua_drow.get("sourceReadingDimension", {}).get("evidencePointers", [])] if ua_drow else []
    if not ua_drow or not any("Drow" in scope for scope in ua_scopes):
        errors.append("UA Drow source-reading unassessability must remain explicit")
    if report.get("dimensionalSummary", {}).get("publicSearch", {}).get("assessmentCounts", {}).get("unassessable") != 18:
        errors.append("PHB public-search unassessable count must remain 18")
    phb_review_counts = report.get("summary", {}).get("reviewStateCountsByBook", {}).get("PHB", {})
    if phb_review_counts.get("bounded review has an explicitly unassessable source reading", 0) != 0:
        errors.append("PHB review-state summary still places search captures under source-reading unassessability")
    if phb_review_counts.get("bounded source assertions classified; live public-search findability unassessed") != 18:
        errors.append("PHB public-search review-state summary count is not 18")
    mm_review_bridge = report.get("summary", {}).get("mmReviewStateBridge", {})
    if (mm_review_bridge.get("pendingBroaderAssertionWork"),
        mm_review_bridge.get("queueScopeClosedButBroaderContentUnassessed"),
        mm_review_bridge.get("combinedBroaderUnassessedOrPending")) != (57, 14, 71):
        errors.append("MM broader pending/closed-unassessed scope bridge is stale")

    spell_guidance = report.get("phbSpellGuidanceAdjudication", {})
    if (spell_guidance.get("historicalPHBSpellCandidateCount"), spell_guidance.get("sourceSupportedRepairProposalCount"),
        spell_guidance.get("rejectedFalsePositiveCount"), spell_guidance.get("newDruidSharedRuleProposalCount")) != (11, 10, 1, 1):
        errors.append("PHB spell finite proposal/rejected-false-positive/Druid-child counts changed")
    if len(spell_guidance.get("sourceSupportedProposalIds", [])) != 10 or "word-of-recall-source-internal-weight-conflict" in spell_guidance.get("sourceSupportedProposalIds", []):
        errors.append("Word of Recall false positive remains among ten active PHB spell proposals")
    word_recall = spell_guidance.get("wordOfRecall", {})
    if word_recall.get("disposition") != "rejected-audit-false-positive" or word_recall.get("noContentChange") is not True:
        errors.append("Word of Recall source correction or no-change disposition was lost")
    if word_recall.get("independentExcerptBoundaryReview", {}).get("verdict") != "confirmed-whole-image-exception":
        errors.append("independent Word of Recall passage-boundary review is missing")
    druid_child = spell_guidance.get("druidAbsentChild", {})
    if druid_child.get("category") != "missing" or druid_child.get("currentDedicatedOwnerMatches") != 0:
        errors.append("new Druid shared-rule child absence was lost")
    for unit_key in ("PHB:spell-descriptions-cleric", "PHB:spell-descriptions-druid"):
        unit = next((u for u in units if u.get("unitKey") == unit_key), None)
        if not unit or unit.get("disposition") != "partial":
            errors.append(f"broad PHB spell unit was promoted: {unit_key}")

    neighbor_units = [u for u in units if u.get("unitKey") in {"MM:mm-table-candidate-elemental-types", "MM:mm-table-candidate-elephant-types"}]
    if len(neighbor_units) != 2 or any(u.get("disposition") != "partial" for u in neighbor_units):
        errors.append("Elemental/Elephant broad unit dispositions must remain partial")
    if any(not any(ref.get("reportId") == "mm-elemental-elephant-closure" for ref in u.get("latestClosureEvidenceRefs", [])) for u in neighbor_units):
        errors.append("Elemental/Elephant closure report pointers are missing")

    scoped = report.get("boundedMMOperativeScopeDispositions", {})
    expected_scopes = {"horse", "dragon", "golem", "men-professions"}
    if not expected_scopes.issubset(scoped):
        errors.append("bounded Horse/Dragon/Golem/Men procedure scope breakouts are incomplete")
    else:
        horse_statuses = {row.get("disposition") for row in scoped["horse"]["scopedDispositions"]}
        dragon_statuses = {row.get("disposition") for row in scoped["dragon"]["scopedDispositions"]}
        golem_statuses = {row.get("disposition") for row in scoped["golem"]["scopedDispositions"]}
        if not {"excluded", "missing"}.issubset(horse_statuses):
            errors.append("horse profile exclusion and missing carrying-load table are not separated")
        if not {"excluded", "missing", "unassessable"}.issubset(dragon_statuses):
            errors.append("dragon profile exclusion, unassessed progression/chart and missing subdual procedure are not separated")
        if not {"excluded", "missing"}.issubset(golem_statuses):
            errors.append("golem profile exclusions and missing construction procedure/cost scopes are not separated")
        if scoped["men-professions"].get("siteDisposition") != "absent" or scoped["men-professions"].get("broaderProseAssertionDenominator") is not None:
            errors.append("men-profession procedure absence or unatomized prose limit was changed")
        corrected_counts = report.get("correctedMixedScopeDispositions", {}).get("counts", {})
        if corrected_counts.get("missing") != 6 or corrected_counts.get("excluded") != 4 or corrected_counts.get("unassessable") != 2:
            errors.append("corrected mixed-scope child category totals changed")

    snapshot = report.get("pinnedSiteSnapshotProjection", {})
    if (snapshot.get("path"), snapshot.get("gzipSha256"), snapshot.get("gzipSizeBytes"), snapshot.get("decompressedJsonSha256"), snapshot.get("decompressedSizeBytes")) != (
        str(SNAPSHOT_PATH), SNAPSHOT_GZIP_SHA256, SNAPSHOT_GZIP_SIZE, SNAPSHOT_RAW_SHA256, SNAPSHOT_RAW_SIZE
    ):
        errors.append("pinned site snapshot projection metadata differs")

    if verify_inputs:
        for item in report.get("reportRegistry", []):
            if item.get("sha256"):
                try:
                    actual = sha256(file_bytes(root, item["path"]))
                except OSError as exc:
                    errors.append(f"cannot read pinned report {item['id']}: {exc}")
                    continue
                if actual != item["sha256"]:
                    errors.append(f"pinned report hash mismatch: {item['id']}")
        try:
            v1_hash = sha256((root / V1_PATH).read_bytes())
            if v1_hash != V1_SHA256:
                errors.append("preserved v1 report hash mismatch")
        except OSError as exc:
            errors.append(f"cannot read preserved v1 report: {exc}")

        # Resolve every reportPath JSON pointer against the exact pinned bytes.
        # A small number of v1 metadata fields use reportPath as a filename;
        # those are excluded because they do not claim to be JSON pointers.
        documents: dict[str, Any] = {}
        checked: set[tuple[str, str]] = set()

        def resolve_references(value: Any) -> None:
            if isinstance(value, dict):
                report_id = value.get("reportId")
                pointer = value.get("reportPath")
                if report_id and isinstance(pointer, str) and pointer.startswith("#") and (report_id, pointer) not in checked:
                    checked.add((report_id, pointer))
                    record = registry.get(report_id)
                    if record is not None:
                        try:
                            if report_id not in documents:
                                raw = file_bytes(root, record["path"])
                                if str(record["path"]).endswith(".gz"):
                                    raw = gzip.decompress(raw)
                                documents[report_id] = json.loads(raw)
                            resolve_json_pointer(documents[report_id], pointer)
                        except Exception as exc:
                            errors.append(f"unresolvable exact report pointer {report_id}{pointer}: {exc}")
                for child in value.values():
                    resolve_references(child)
            elif isinstance(value, list):
                for child in value:
                    resolve_references(child)

        resolve_references(report)
    return errors


def serialize(report: dict[str, Any]) -> bytes:
    return (json.dumps(report, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--write", action="store_true", help="build and write the v2 JSON report")
    mode.add_argument("--check", action="store_true", help="rebuild in memory and verify the checked-in report exactly")
    mode.add_argument("--validate-json", metavar="PATH", help="validate a report JSON file (used by negative controls)")
    parser.add_argument("--verify-private-snapshot", action="store_true", help="explicitly verify the pinned private snapshot gzip and decoded JSON bytes")
    parser.add_argument("--snapshot-path", metavar="PATH", help="private snapshot path, accepted only with --verify-private-snapshot")
    args = parser.parse_args()
    if args.snapshot_path and not args.verify_private_snapshot:
        parser.error("--snapshot-path requires --verify-private-snapshot")
    try:
        private_snapshot_verification = {
            "status": "not-run",
            "scope": "Default build/check reads only public pinned reports and snapshot metadata; private snapshot bytes are not read.",
        }
        if args.verify_private_snapshot:
            selected_snapshot_path = Path(
                args.snapshot_path or os.environ.get("PASS8_PRIVATE_SNAPSHOT_PATH") or SNAPSHOT_PATH
            )
            private_snapshot_verification = verify_private_snapshot(selected_snapshot_path)
        if args.validate_json:
            candidate = json.loads(Path(args.validate_json).read_text(encoding="utf-8"))
            errors = validate_report(candidate, verify_inputs=False)
            if errors:
                print("\n".join(f"ERROR: {error}" for error in errors), file=sys.stderr)
                return 1
            print("VALID")
            return 0
        report = build_report()
        errors = validate_report(report, verify_inputs=True)
        if errors:
            print("\n".join(f"ERROR: {error}" for error in errors), file=sys.stderr)
            return 1
        output = ROOT / OUTPUT_PATH
        built = serialize(report)
        if args.write:
            output.write_bytes(built)
        else:
            if not output.exists():
                print(f"ERROR: missing output {OUTPUT_PATH}; run with --write", file=sys.stderr)
                return 1
            current = output.read_bytes()
            if current != built:
                print("ERROR: output report differs from a fresh deterministic build", file=sys.stderr)
                return 1
            built = current
        print(json.dumps({
            "output": OUTPUT_PATH,
            "sha256": sha256(built),
            "sizeBytes": len(built),
            "unitCount": len(report["unitJoins"]),
            "publicInputLocators": public_input_locator_receipts(ROOT),
            "dispositionCategories": report["summary"]["overallDispositionCategoryCounts"],
            "phbSearchUnassessable": report["dimensionalSummary"]["publicSearch"]["assessmentCounts"],
            "queueClosed": report["closureSummary"]["mmTableQueue"]["candidateCount"],
            "privateSnapshotVerification": private_snapshot_verification,
        }, indent=2))
        return 0
    except Exception as exc:  # report builder should fail closed on malformed evidence
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
