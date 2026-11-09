#!/usr/bin/env python3
"""Build the frozen, source-side expectations for the DMG p.175 actual-app run.

This reads authored rules, binding declarations, source catalogs and the
continuation manifest. It never reads compiled dist/data.json or browser DOM.
"""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent / "expected-controls-v1.json"
APPENDIX_IDS = [
    "appendix-c-character-subtable",
    "appendix-c-party-size",
    "appendix-c-character-levels",
    "appendix-c-henchmen",
    "appendix-c-character-guidance",
    "appendix-c-party-magic-distribution",
    "appendix-c-magic-table-i",
    "appendix-c-magic-table-ii",
    "appendix-c-magic-table-iii",
    "appendix-c-magic-table-iv",
    "appendix-c-magic-item-notes",
]
OWNER_IDS = set(APPENDIX_IDS) | {"encounter-types"}
SOURCE_IMAGE_SHA = "e4acdde4a9fed34ae4c60945db53a37e9e7d1b3682f967bc83ccc481e63e5ba7"
DMG_PDF_SHA = "7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669"
PENDING = "field-target-pending"


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def file_pin(path: str) -> dict:
    data = (ROOT / path).read_bytes()
    return {"path": path, "sha256": sha(data), "sizeBytes": len(data)}


def read_json(path: str):
    return json.loads((ROOT / path).read_text())


def pointer_get(value, pointer: str):
    if pointer == "":
        return value
    if not pointer.startswith("/"):
        raise ValueError(f"invalid JSON pointer {pointer!r}")
    for part in pointer[1:].split("/"):
        part = part.replace("~1", "/").replace("~0", "~")
        value = value[int(part)] if isinstance(value, list) else value[part]
    return value


def sha_json(value) -> str:
    raw = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
    return sha(raw)


def effective_reference_overrides(owner_id: str) -> list:
    # Match collectionReferenceOverrides(): unique legacy refs precede the
    # collection-qualified refs; identical JSON objects are kept once.
    sources = [override_items.get(owner_id), override_items.get(f"rules:{owner_id}")]
    refs = []
    for source in sources:
        if isinstance(source, dict):
            refs.extend(source.get("references", []))
    result = []
    seen = set()
    for ref in refs:
        marker = json.dumps(ref, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        if marker not in seen:
            seen.add(marker)
            result.append(ref)
    return result


rules_doc = read_json("rules.json")
rules = {item["id"]: item for item in rules_doc["rules"]}
overrides = read_json("citation-overrides.json")
override_items = overrides["items"]
bindings_doc = read_json("research/field-evidence-bindings.json")
bindings = bindings_doc["bindings"]
continuation_doc = read_json("research/citation-continuations.json")

assert all(owner in rules for owner in OWNER_IDS), "required current rule owners are missing"
assert all(f"rules:{owner}" in override_items for owner in OWNER_IDS), "required source reference overrides are missing"

candidate = [
    binding for binding in bindings
    if binding.get("collection") == "rules"
    and binding.get("itemId") in OWNER_IDS
    and binding.get("book") == "DMG"
    and binding.get("printedPage") in (175, 176)
]
pending = [b for b in candidate if b.get("reviewStatus") == PENDING]
already_reviewed = [b for b in candidate if b.get("reviewStatus") != PENDING]
assert len(candidate) == 121, f"expected 120 proposed controls + 1 pre-existing locator, got {len(candidate)}"
assert len(pending) == 120, f"expected 120 pending controls, got {len(pending)}"
assert len(already_reviewed) == 1 and already_reviewed[0]["itemId"] == "encounter-types"
assert already_reviewed[0]["fieldPointer"] == "/references/0"
assert sum("/table/rows/" in b["fieldPointer"] for b in pending) == 87
assert sum("/bullets/" in b["fieldPointer"] for b in pending) == 33

catalog_cache = {}
image_pins = {}
controls = []
for binding in sorted(pending, key=lambda b: (APPENDIX_IDS.index(b["itemId"]) if b["itemId"] in APPENDIX_IDS else len(APPENDIX_IDS), b["fieldPointer"])):
    owner_id = binding["itemId"]
    owner = rules[owner_id]
    field_pointer = binding["fieldPointer"]
    source_pointer = binding["sourceObjectPointer"]
    value = pointer_get(owner, field_pointer)
    kind = "table-row" if field_pointer.startswith("/table/rows/") else "bullet" if field_pointer.startswith("/bullets/") else None
    assert kind, f"unexpected target kind: {owner_id} {field_pointer}"
    if kind == "table-row":
        expected_source_pointer = field_pointer + "/sourceReference"
        assert source_pointer == expected_source_pointer
        source_ref = pointer_get(owner, source_pointer)
        assert isinstance(source_ref, dict)
        assert source_ref.get("book") == binding["book"]
        assert source_ref.get("printedPage") == binding["printedPage"]
        assert source_ref.get("pdfPage") == binding.get("pdfPage")
        assert source_ref.get("catalog") == binding["catalog"]
        assert source_ref.get("sourceFocusId") == binding["regionIds"][0]
        assert source_ref.get("fieldPointer") == field_pointer
        assert source_ref.get("sourceObjectPointer") == source_pointer
        field_index = int(re.search(r"/table/rows/(\d+)$", field_pointer).group(1))
        owner_label = value.get("label") or str(field_index)
    else:
        bullet_index = int(re.search(r"/bullets/(\d+)$", field_pointer).group(1))
        assert isinstance(value, str) and value.strip()
        assert source_pointer.startswith("/references/")
        ref_index = int(source_pointer.rsplit("/", 1)[1])
        source_ref = pointer_get({"references": effective_reference_overrides(owner_id)}, source_pointer)
        assert source_ref.get("book") == binding["book"]
        assert binding["printedPage"] in source_ref.get("pages", [])
        assert binding["regionIds"][0] in source_ref.get("verification", {}).get("regions", []), f"bullet reference does not declare its region: {owner_id}{field_pointer} -> {source_pointer}"
        owner_label = f"bullet {bullet_index + 1}"

    assert binding.get("sourceOwner") == {"collection": "rules", "itemId": owner_id}
    assert binding.get("fieldPointer") == field_pointer
    assert binding.get("reviewStatus") == PENDING
    assert binding.get("sourceValueStatus") == "not-assessed-by-field-target-review"
    assert binding.get("targetReview") is None
    assert binding.get("regionIds") and len(binding["regionIds"]) == 1
    assert binding.get("catalog") == f"scans/verified/rules-{owner_id}.json"

    catalog_path = binding["catalog"]
    if catalog_path not in catalog_cache:
        catalog = read_json("dist/" + catalog_path)
        assert catalog.get("collection") == "rules" and catalog.get("itemId") == owner_id
        catalog_cache[catalog_path] = catalog
    catalog = catalog_cache[catalog_path]
    region_id = binding["regionIds"][0]
    region = next((r for r in catalog["regions"] if r.get("id") == region_id), None)
    assert region, f"catalog region missing: {owner_id} {region_id}"
    assert region.get("book") == "DMG" and region.get("printedPage") == binding["printedPage"]
    assert region.get("pdfPage") == binding.get("pdfPage")
    assert region.get("sha256") and region.get("focusRects")

    if binding["printedPage"] == 175:
        assert binding.get("pdfPage") is None
        assert region.get("sourceArtifactId") == "dmg175-user-confirmed-supplement"
        assert region.get("sourceArtifactId") in catalog.get("sourceArtifacts", {})
        assert catalog["sourceArtifacts"][region["sourceArtifactId"]].get("sha256") == SOURCE_IMAGE_SHA
        assert catalog["sourceArtifacts"][region["sourceArtifactId"]].get("canonicalPdfSha256") == DMG_PDF_SHA
        source_identity = {"sourceArtifactId": region["sourceArtifactId"], "sourceIdentityKind": "supplemental-image", "sourceSha256": SOURCE_IMAGE_SHA, "canonicalPdfSha256": DMG_PDF_SHA}
    else:
        assert binding["printedPage"] == 176 and binding.get("pdfPage") == 176
        assert catalog.get("sources", {}).get("DMG", {}).get("sha256") == DMG_PDF_SHA
        source_identity = {"sourceArtifactId": "dmg-canonical-pdf", "sourceIdentityKind": "canonical-pdf", "sourceSha256": DMG_PDF_SHA, "canonicalPdfSha256": DMG_PDF_SHA}
    assert region.get("sha256") and region.get("focusRects"), f"expected bounded focus geometry: {region_id}"
    if kind == "table-row":
        assert source_ref.get("sourceArtifactId") == source_identity["sourceArtifactId"]
        assert source_ref.get("sourceSha256") == source_identity["sourceSha256"]
        assert source_ref.get("canonicalPdfSha256") == source_identity["canonicalPdfSha256"]
        assert source_ref.get("imageSha256") == region["sha256"]
        assert source_ref.get("sourceFocusId") == region_id
    image_path = "dist/scans/verified/" + region["image"]
    image_hash = sha((ROOT / image_path).read_bytes())
    assert image_hash == region["sha256"]
    image_pins[image_path] = {"path": image_path, "sha256": image_hash, "sizeBytes": (ROOT / image_path).stat().st_size}

    expected_target = {
        "book": binding["book"],
        "page": binding["printedPage"],
        "pdfPage": binding.get("pdfPage"),
        "fieldPointer": field_pointer,
        "fieldOwner": {"collection": "rules", "itemId": owner_id},
        "sourceOwner": {"collection": "rules", "itemId": owner_id},
        "sourceObject": binding["sourceObject"],
        "sourceCategory": binding["sourceCategory"],
        "catalog": binding["catalog"],
        "regionIds": binding["regionIds"],
        "reviewStatus": PENDING,
        "targetStatus": "pending",
        "contextStatus": binding["contextStatus"],
        "contextLimitations": binding["contextLimitations"],
    }
    controls.append({
        "ownerId": owner_id,
        "ownerTitle": owner.get("title"),
        "kind": kind,
        "fieldPointer": field_pointer,
        "sourceObjectPointer": source_pointer,
        "label": owner_label,
        "printedPage": binding["printedPage"],
        "pdfPage": binding.get("pdfPage"),
        "catalog": catalog_path,
        "regionId": region_id,
        "image": region["image"],
        "imageSha256": region["sha256"],
        "focusRects": region["focusRects"],
        "focusRectIds": [f.get("id") for f in region.get("focusRects", []) if isinstance(f, dict)],
        "sourceReference": source_identity,
        "expectedTarget": expected_target,
    })

owner_counts = {}
for owner_id in APPENDIX_IDS + ["encounter-types"]:
    matches = [c for c in controls if c["ownerId"] == owner_id]
    owner_counts[owner_id] = {
        "title": rules[owner_id].get("title"),
        "tableRows": sum(c["kind"] == "table-row" for c in matches),
        "bulletTargets": sum(c["kind"] == "bullet" for c in matches),
        "targetCount": len(matches),
    }

group_ids = [
    "appendix-c-character-levels-dmg-175-same-page-continuation",
    "appendix-c-party-magic-distribution-dmg-175-176",
]
continuations = []
for group_id in group_ids:
    group = next((g for g in continuation_doc["groups"] if g.get("id") == group_id), None)
    assert group is not None, f"missing continuation group {group_id}"
    assert group.get("status") == "segments-present-pending-deployment"
    segments = group.get("segments", [])
    assert len(segments) == 2 and [s.get("order") for s in segments] == [1, 2]
    physical = []
    for segment in segments:
        catalog = catalog_cache.get(group["catalog"]) or read_json("dist/" + group["catalog"])
        region = next(r for r in catalog["regions"] if r["id"] == segment["regionId"])
        assert region["image"] == segment["image"] and region["sha256"] == segment["imageSha256"]
        image_path = "dist/scans/verified/" + segment["image"]
        image_hash = sha((ROOT / image_path).read_bytes())
        assert image_hash == segment["imageSha256"]
        image_pins[image_path] = {"path": image_path, "sha256": image_hash, "sizeBytes": (ROOT / image_path).stat().st_size}
        aliases = []
        for alias_id in segment.get("focusAliasRegionIds", []):
            alias = next(r for r in catalog["regions"] if r["id"] == alias_id)
            assert alias["image"] == segment["image"] and alias["sha256"] == segment["imageSha256"]
            aliases.append({"regionId": alias_id, "title": alias["title"], "image": alias["image"], "imageSha256": alias["sha256"], "focusRects": alias["focusRects"]})
        physical.append({
            "order": segment["order"], "role": segment["role"], "book": segment["book"],
            "printedPage": segment["printedPage"], "pdfPage": segment.get("pdfPage"),
            "sourceArtifactId": segment.get("sourceArtifactId"),
            "sourceIdentityKind": segment.get("sourceIdentityKind"),
            "sourceSha256": segment["sourceSha256"], "canonicalPdfSha256": segment.get("canonicalPdfSha256"),
            "regionId": segment["regionId"], "focusAliasRegionIds": segment.get("focusAliasRegionIds", []), "focusAliases": aliases,
            "image": segment["image"], "imageSha256": segment["imageSha256"],
        })
    continuations.append({
        "id": group_id,
        "itemId": group["itemId"],
        "catalog": group["catalog"],
        "manifestGroupSha256": sha_json(group),
        "physicalPartCount": len(physical),
        "physicalParts": physical,
    })

assert continuations[0]["physicalParts"][0]["printedPage"] == 175
assert continuations[0]["physicalParts"][1]["printedPage"] == 175
assert all(part["pdfPage"] is None for part in continuations[0]["physicalParts"])
party = continuations[1]
assert party["physicalParts"][0]["printedPage"] == 175 and party["physicalParts"][0]["pdfPage"] is None
assert len(party["physicalParts"][0]["focusAliasRegionIds"]) == 12
assert party["physicalParts"][1]["printedPage"] == party["physicalParts"][1]["pdfPage"] == 176

catalog_image_pins = {}
for catalog_path, catalog in catalog_cache.items():
    for region in catalog["regions"]:
        image_path = "dist/scans/verified/" + region["image"]
        image_hash = sha((ROOT / image_path).read_bytes())
        assert image_hash == region["sha256"], f"catalog image hash mismatch: {catalog_path} {region['id']}"
        catalog_image_pins[image_path] = {"path": image_path, "sha256": image_hash, "sizeBytes": (ROOT / image_path).stat().st_size}
selected_image_paths = set(image_pins)
assert selected_image_paths <= set(catalog_image_pins)

data = {
    "schemaVersion": 1,
    "artifactType": "dmg175-actual-app-browser-expected-controls",
    "status": "frozen-source-side-expectations; browser-not-run",
    "scope": "Exact pending source-control identities and two published-continuation expectations for an eventual actual compiled-app browser run. Values, source mechanics and context grades remain unassessed.",
    "generationRule": "Derived only from rules.json, citation-overrides.json, research/field-evidence-bindings.json, research/citation-continuations.json, and the current bounded source catalogs/images. No compiled data.json, app DOM, or browser output was used.",
    "sourceIdentity": {
        "dmg175": {"book": "DMG", "printedPage": 175, "pdfPage": None, "sourceArtifactId": "dmg175-user-confirmed-supplement", "sourceIdentityKind": "supplemental-image", "supplementSha256": SOURCE_IMAGE_SHA, "canonicalPdfSha256": DMG_PDF_SHA, "editionStatus": "user-confirmed-correct-edition", "printingStatus": "not-specified", "availability": "accepted limited supplemental excerpts; supplied PDF omits printed page"},
        "dmg176": {"book": "DMG", "printedPage": 176, "pdfPage": 176, "sourceArtifactId": "dmg-canonical-pdf", "sourceIdentityKind": "canonical-pdf", "sourceSha256": DMG_PDF_SHA},
    },
    "counts": {"pendingTargets": len(controls), "tableRows": 87, "bulletTargets": 33, "candidateBindingsIncludingPriorReviewedLocator": len(candidate), "excludedPriorReviewedLocatorCount": 1, "selectedTestImageFiles": len(selected_image_paths), "allCatalogImageFiles": len(catalog_image_pins)},
    "excludedPriorReviewedLocator": {
        "ownerId": already_reviewed[0]["itemId"],
        "fieldPointer": already_reviewed[0]["fieldPointer"],
        "reviewStatus": already_reviewed[0]["reviewStatus"],
        "regionIds": already_reviewed[0]["regionIds"],
        "reason": "Pre-existing context/reference locator, not one of the 120 newly proposed pending row/bullet controls.",
    },
    "ownerCounts": owner_counts,
    "controls": controls,
    "continuations": continuations,
    "assetPins": {
        "authoredInputs": [file_pin("rules.json"), file_pin("citation-overrides.json"), file_pin("research/field-evidence-bindings.json"), file_pin("research/citation-continuations.json")],
        "catalogs": [file_pin("dist/" + path) for path in sorted(catalog_cache)],
        "selectedTestImages": [image_pins[path] for path in sorted(image_pins)],
        "allCatalogImages": [catalog_image_pins[path] for path in sorted(catalog_image_pins)],
        "imageScope": "14 unique images are selected by the 120 pending targets or two continuation groups. The 12 catalogs collectively reference 15 unique image files; the additional file is legacy PHB p.103 context and is not a DMG p.175/176 test image.",
    },
    "qualityBoundary": {
        "mustRemainPending": True,
        "sourceValueGrades": "not assessed",
        "mechanicsGrades": "not assessed",
        "contextGrades": "not assessed except the existing encounter-types context locator explicitly excluded above",
        "p175Interpretation": "A correct-edition supplemental image with printing unspecified supplies accepted limited excerpts; no canonical PDF leaf exists for printed p.175.",
        "noFalseResolution": "A pending field target must not acquire a region in its URL or be represented as targetStatus=resolved merely because a bounded source excerpt exists.",
    },
}
OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
print(json.dumps({"output": str(OUT), "sha256": sha(OUT.read_bytes()), "sizeBytes": OUT.stat().st_size, "controls": len(controls), "rows": 87, "bullets": 33, "catalogs": len(catalog_cache), "selectedTestImages": len(image_pins), "allCatalogImages": len(catalog_image_pins), "continuations": [g["id"] for g in continuations]}, indent=2))
