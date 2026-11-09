#!/usr/bin/env python3
"""Read-only discovery queue for clipped or continued cited source passages.

This tool inventories every supplied source-excerpt catalog region and every
exposed record property/source pointer. With PyMuPDF and authorized local PDFs,
it adds numeric text-layer crop-boundary and adjacent-column/page candidates.
It never writes source text, OCR transcripts, PDFs, or images to its report.

The signals are discovery-only. Zero candidates are not a semantic pass.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import importlib.util
import json
import re
import subprocess
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Iterable


_FRAME_BRIDGE_SPEC = importlib.util.spec_from_file_location(
    "continuation_source_frame_bridge",
    Path(__file__).resolve().parent.parent / "research" / "source_frame_coordinate_bridge.py",
)
if _FRAME_BRIDGE_SPEC is None or _FRAME_BRIDGE_SPEC.loader is None:
    raise RuntimeError("the pinned source-frame bridge helper is unavailable")
_FRAME_BRIDGE = importlib.util.module_from_spec(_FRAME_BRIDGE_SPEC)
_FRAME_BRIDGE_SPEC.loader.exec_module(_FRAME_BRIDGE)


BOOK_FILES = {
    "PHB": "tsr2010-players-handbook.pdf",
    "DMG": "DMG_1stEd.pdf",
    "UA": "Unearthed Arcana.pdf",
    "MM": "Monster_Manual.pdf",
    "MM2": "Monster Manual II.pdf",
}
DATA_COLLECTIONS = ("rules", "spells", "equipment", "matrices", "classes", "progressionExplainer")
BOOKS = set(BOOK_FILES)
DANGLING_CONNECTOR = re.compile(r"(?:[,;:]|\b(?:and|or|of|to|with|for|in|on|at|by|from|as|that|which|who|is|are|was|were|be|been|being|if|when|while|because|than|then|but|so|such|each|any|one|two|three|four|first|second|third))\s*$", re.I)
TERMINAL = re.compile(r"[.!?][\"'’”)]?\s*$")
LOWER_START = re.compile(r"^[a-z]")
PAGE_NUMBER = re.compile(r"^\s*\d{1,4}\s*$")
GEOMETRY_TOLERANCE_PT = 0.5
DMG175_SUPPLEMENT_ARTIFACT_ID = "dmg175-user-confirmed-supplement"
DMG175_SUPPLEMENT_SHA256 = "e4acdde4a9fed34ae4c60945db53a37e9e7d1b3682f967bc83ccc481e63e5ba7"
DMG175_CANONICAL_PDF_SHA256 = "7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669"
DMG175_SUPPLEMENT_CROPS = {
    "dmg-175-party-table-context-78c4c383c38c7d10": ([0, 1145, 635, 1635], "78c4c383c38c7d100a9e66bec4f36de1fdb9453d6e44d1eec53120e849a36e89"),
    "dmg-175-level-others-context-5aa02e91e35c4c28": ([670, 120, 1329, 492], "5aa02e91e35c4c28152caccd947096943b74889b8596376cb86cb0c7170291b8"),
}


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def supplemental_region_identity(catalog: dict[str, Any], region: dict[str, Any]) -> dict[str, Any] | None:
    """Return a bounded image-source identity for a separately supplied page crop.

    This keeps an image-backed excerpt distinct from a PDF page. The current
    CCD tool does not assess raster geometry for such a region; the Node
    validator independently resolves the closed source-artifact contract.
    """
    if "sourceArtifactId" not in region:
        return None
    artifact_id = region.get("sourceArtifactId")
    artifact = catalog.get("sourceArtifacts", {}).get(artifact_id) if isinstance(artifact_id, str) else None
    book = region.get("book")
    canonical_pdf = catalog.get("sources", {}).get(book, {}).get("sha256")
    source_sha = artifact.get("sha256") if isinstance(artifact, dict) else None
    dimensions = artifact.get("dimensionsPx") if isinstance(artifact, dict) else None
    crop = region.get("sourceCropBoundsPx")
    coordinate_space = region.get("sourceCoordinateSpace")
    valid_dimensions = isinstance(dimensions, list) and len(dimensions) == 2 and all(type(value) is int and value > 0 for value in dimensions)
    valid_crop = isinstance(crop, list) and len(crop) == 4 and all(type(value) is int for value in crop)
    if valid_dimensions and valid_crop:
        left, top, right, bottom = crop
        valid_crop = 0 <= left < right <= dimensions[0] and 0 <= top < bottom <= dimensions[1]
        valid_crop = valid_crop and right - left == region.get("width") and bottom - top == region.get("height")
    expected_crop = DMG175_SUPPLEMENT_CROPS.get(region.get("id"))
    valid = bool(
        artifact_id == DMG175_SUPPLEMENT_ARTIFACT_ID
        and
        isinstance(artifact, dict)
        and artifact.get("id") == artifact_id
        and artifact.get("type") == "supplemental-page-image"
        and artifact.get("mediaType") == "image/jpeg"
        and artifact.get("book") == book
        and book == "DMG"
        and region.get("printedPage") == 175
        and artifact.get("printedPage") == 175
        and region.get("pdfPage") is None
        and source_sha == DMG175_SUPPLEMENT_SHA256
        and canonical_pdf == DMG175_CANONICAL_PDF_SHA256
        and artifact.get("canonicalPdfSha256") == canonical_pdf
        and artifact.get("originalPdfContainsPrintedPage") is False
        and artifact.get("editionStatus") == "user-confirmed-correct-edition"
        and artifact.get("printingStatus") == "not-specified"
        and dimensions == [1329, 1796]
        and valid_dimensions
        and valid_crop
        and expected_crop is not None
        and crop == expected_crop[0]
        and region.get("sha256") == expected_crop[1]
        and coordinate_space == "supplement-image pixels; top-left origin; LTRB half-open"
    )
    return {
        "valid": valid,
        "sourceKind": "supplemental-image" if valid else "invalid-source-identity",
        "sourceArtifactId": artifact_id,
        "sourceSha256": source_sha if valid else None,
        "canonicalPdfSha256": canonical_pdf if isinstance(canonical_pdf, str) and re.fullmatch(r"[a-f0-9]{64}", canonical_pdf) else None,
        "sourceDimensionsPx": dimensions if valid_dimensions else None,
        "sourceCropBoundsPx": crop if valid_crop else None,
        "sourceCoordinateSpace": coordinate_space if isinstance(coordinate_space, str) else None,
    }


def json_bytes(path: Path) -> bytes:
    return path.read_bytes()


def rect_xywh(raw: Any) -> tuple[float, float, float, float] | None:
    if isinstance(raw, dict):
        values = (raw.get("x"), raw.get("y"), raw.get("width", raw.get("w")), raw.get("height", raw.get("h")))
    elif isinstance(raw, (list, tuple)) and len(raw) == 4:
        values = tuple(raw)
    else:
        return None
    if not all(isinstance(value, (int, float)) for value in values):
        return None
    x, y, width, height = map(float, values)
    if x < 0 or y < 0 or width <= 0 or height <= 0 or x + width > 1.00001 or y + height > 1.00001:
        return None
    return x, y, width, height


def legacy_box_crossing_edges(box: Iterable[float], crop: Iterable[float], tolerance: float = GEOMETRY_TOLERANCE_PT) -> list[str]:
    """Frozen pre-fix classifier retained only to calibrate old false positives."""
    x0, y0, x1, y1 = map(float, box)
    cx0, cy0, cx1, cy1 = map(float, crop)
    edges = []
    if x0 < cx0 - tolerance and x1 > cx0 + tolerance:
        edges.append("left")
    if x0 < cx1 - tolerance and x1 > cx1 + tolerance:
        edges.append("right")
    if y0 < cy0 - tolerance and y1 > cy0 + tolerance:
        edges.append("top")
    if y0 < cy1 - tolerance and y1 > cy1 + tolerance:
        edges.append("bottom")
    return edges


def box_crossing_edges(box: Iterable[float], crop: Iterable[float], tolerance: float = GEOMETRY_TOLERANCE_PT) -> list[str]:
    """Return crop edges actually intersected by a word box.

    A horizontal boundary cue must overlap the crop horizontally, and a
    vertical boundary cue must overlap it vertically. Without that
    orthogonal intersection, unrelated text elsewhere on the page can create
    false crop-edge candidates.
    """
    x0, y0, x1, y1 = map(float, box)
    cx0, cy0, cx1, cy1 = map(float, crop)
    overlaps_x = min(x1, cx1) > max(x0, cx0)
    overlaps_y = min(y1, cy1) > max(y0, cy0)
    edges = []
    if overlaps_y and x0 < cx0 - tolerance and x1 > cx0 + tolerance:
        edges.append("left")
    if overlaps_y and x0 < cx1 - tolerance and x1 > cx1 + tolerance:
        edges.append("right")
    if overlaps_x and y0 < cy0 - tolerance and y1 > cy0 + tolerance:
        edges.append("top")
    if overlaps_x and y0 < cy1 - tolerance and y1 > cy1 + tolerance:
        edges.append("bottom")
    return edges


def ending_class(text: str) -> str:
    """Classify an extracted line ending without retaining its text."""
    value = text.strip()
    if not value or PAGE_NUMBER.fullmatch(value):
        return "not-prose-or-empty"
    if value.endswith(("-", "­", "‐", "‑", "‒", "–", "—")):
        return "hyphenated-fragment"
    if DANGLING_CONNECTOR.search(value):
        return "dangling-connector"
    if TERMINAL.search(value):
        return "terminal-punctuation"
    if value[-1:].isalnum() or value[-1:] in "’\"”)]":
        return "unpunctuated"
    return "other"


def start_class(text: str) -> str:
    value = text.strip()
    if not value or PAGE_NUMBER.fullmatch(value):
        return "not-prose-or-empty"
    if LOWER_START.search(value):
        return "lowercase-opening"
    return "capitalized-or-other-opening"


def crop_word_geometry(words: list[dict[str, Any]], crop: tuple[float, float, float, float]) -> dict[str, Any]:
    """Apply source-page point geometry and prose endpoint rules to fixture words."""
    cx0, cy0, cx1, cy1 = crop
    crop_box = (cx0, cy0, cx1, cy1)
    crossings = []
    inside: dict[tuple[Any, Any], list[dict[str, Any]]] = defaultdict(list)
    for word in words:
        box = tuple(map(float, word["box"]))
        edges = box_crossing_edges(box, crop_box)
        if edges:
            crossings.append({"edges": edges, "wordIndex": word.get("index")})
        x0, y0, x1, y1 = box
        if x1 > crop_box[0] and x0 < crop_box[2] and y1 > crop_box[1] and y0 < crop_box[3]:
            inside[(word.get("block", 0), word.get("line", 0))].append(word)
    lines = []
    for key, values in inside.items():
        values.sort(key=lambda item: float(item["box"][0]))
        text = " ".join(item["text"] for item in values)
        box = (
            min(float(item["box"][0]) for item in values),
            min(float(item["box"][1]) for item in values),
            max(float(item["box"][2]) for item in values),
            max(float(item["box"][3]) for item in values),
        )
        lines.append({"key": key, "box": box, "text": text})
    lines.sort(key=lambda line: (int(line["key"][0]) if str(line["key"][0]).isdigit() else 0,
                                 int(line["key"][1]) if str(line["key"][1]).isdigit() else 0,
                                 line["box"][1], line["box"][0]))
    # Prefer geometric reading order by left-to-right column, then top-to-bottom.
    # A crop confined to one column naturally retains its own vertical sequence.
    midpoint = (crop_box[0] + crop_box[2]) / 2
    for line in lines:
        line["column"] = 0 if (line["box"][0] + line["box"][2]) / 2 < midpoint else 1
    lines.sort(key=lambda line: (line["column"], line["box"][1], line["box"][0]))
    usable_lines = [line for line in lines if not PAGE_NUMBER.fullmatch(line["text"].strip())]
    end = usable_lines[-1] if usable_lines else None
    start = usable_lines[0] if usable_lines else None
    return {
        "crossings": crossings,
        "lineCount": len(usable_lines),
        "startClass": start_class(start["text"]) if start else "not-assessable",
        "endClass": ending_class(end["text"]) if end else "not-assessable",
        "firstLineBox": list(start["box"]) if start else None,
        "lastLineBox": list(end["box"]) if end else None,
        "lastLineColumn": end["column"] if end else None,
        "cropBox": list(crop_box),
    }


def category_for_property(key: str, pointer: str) -> str:
    k = key.casefold()
    if k in {"sourceexcerpts", "scanverification", "verification", "evidencebindings", "fieldsources", "source", "sources", "sourcepages", "sourcepagereference", "sourceowner", "sourceobjectpointer", "references", "reference", "referencesources", "citation", "citations", "catalog", "catalogpath", "region", "regions", "regionid", "regionids", "unmappedregionids", "book", "pages", "printedpage", "pdfpage", "sourcesha256", "sourcehash", "imagesha256", "focusrects", "highlightcoordinates", "cropcoordinates", "coordinatespace", "coordinatesystem", "reviewstatus", "contextstatus", "contextlimitations", "sourcerowids", "sourcecategory", "sourceobject", "fieldpointer", "reviewer", "reviewedat", "verificationscope", "checkedfields"}:
        return "citation-or-provenance"
    if k in {"id", "name", "title", "label", "category", "type", "tags", "aliases", "status", "state", "incomplete", "optional", "edition", "track", "role", "scope", "summary", "description", "version", "schemaversion"}:
        return "metadata-or-prose"
    if k in {"price", "suggestedprice", "comparisons", "amount", "currency", "quantity", "weight", "damage", "range", "duration", "components", "castingtime", "savingthrow", "area", "effect", "effects", "conditions", "exceptions", "bullets", "text", "changes", "guidance", "xp", "xprows", "levelchanges", "rows", "targets", "armorclasses", "coverage", "rulenotes", "comparisonexamples", "notes", "value", "threshold", "score", "level", "levelmin", "levelmax", "cost", "fee", "hireling", "wage", "income", "treasure", "coins", "gold", "silver", "copper", "platinum"}:
        return "mechanics-or-source-fact"
    return "other-exposed-property"


def pointer_part(value: Any) -> str:
    return str(value).replace("~", "~0").replace("/", "~1")


def source_page_claims(value: Any, inherited: tuple[tuple[str, int], ...] = ()) -> tuple[tuple[str, int], ...]:
    result = list(inherited)
    if isinstance(value, dict):
        book = value.get("book")
        pages = value.get("pages")
        if isinstance(book, str) and isinstance(pages, list):
            result.extend((book, p) for p in pages if isinstance(p, int) and not isinstance(p, bool))
        if isinstance(book, str) and isinstance(value.get("printedPage"), int):
            result.append((book, value["printedPage"]))
    return tuple(dict.fromkeys(result))


def walk_properties(value: Any, pointer: str = "", inherited_pages: tuple[tuple[str, int], ...] = ()):
    local_pages = source_page_claims(value, inherited_pages)
    if isinstance(value, dict):
        for key, child in value.items():
            child_pointer = f"{pointer}/{pointer_part(key)}"
            yield from walk_properties(child, child_pointer, local_pages)
    elif isinstance(value, list):
        for index, child in enumerate(value):
            child_pointer = f"{pointer}/{index}"
            yield from walk_properties(child, child_pointer, local_pages)
    else:
        key = pointer.rsplit("/", 1)[-1] if pointer else ""
        yield {
            "pointer": pointer,
            "kind": "null" if value is None else "boolean" if isinstance(value, bool) else "number" if isinstance(value, (int, float)) else "string",
            "category": category_for_property(key, pointer),
            "recordPageContext": [{"book": book, "printedPage": page} for book, page in local_pages],
        }


def extract_bindings(record: Any) -> list[dict[str, Any]]:
    bindings: list[dict[str, Any]] = []
    seen = set()
    def visit(value: Any, pointer: str = ""):
        if isinstance(value, dict):
            array = value.get("evidenceBindings")
            if isinstance(array, list):
                for index, binding in enumerate(array):
                    if not isinstance(binding, dict):
                        continue
                    location = f"{pointer}/evidenceBindings/{index}"
                    compact = {
                        "bindingPointer": location,
                        "fieldPointer": binding.get("fieldPointer"),
                        "book": binding.get("book"),
                        "printedPage": binding.get("printedPage"),
                        "pdfPage": binding.get("pdfPage"),
                        "catalog": binding.get("catalog"),
                        "regionIds": binding.get("regionIds") if isinstance(binding.get("regionIds"), list) else [],
                        "sourceCategory": binding.get("sourceCategory"),
                        "reviewStatus": binding.get("reviewStatus"),
                    }
                    key = json.dumps(compact, sort_keys=True)
                    if key not in seen:
                        bindings.append(compact)
                        seen.add(key)
            for key, child in value.items():
                visit(child, f"{pointer}/{pointer_part(key)}")
        elif isinstance(value, list):
            for index, child in enumerate(value):
                visit(child, f"{pointer}/{index}")
    visit(record)
    return bindings


def collect_data_properties(data: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    record_rows: list[dict[str, Any]] = []
    rows: list[list[Any]] = []
    property_paths: list[str] = []
    path_ids: dict[str, int] = {}
    page_contexts: list[list[list[Any]]] = []
    page_context_ids: dict[str, int] = {}
    bindings_table: list[dict[str, Any]] = []
    binding_ids: dict[tuple[int, str], int] = {}
    binding_sets: list[list[int]] = [[]]
    binding_set_ids: dict[tuple[int, ...], int] = {(): 0}
    property_counts = Counter()
    linkage_counts = Counter()
    category_codes = {"citation-or-provenance": 0, "metadata-or-prose": 1, "mechanics-or-source-fact": 2, "other-exposed-property": 3}
    kind_codes = {"null": 0, "boolean": 1, "number": 2, "string": 3}
    linkage_codes = {"record-page-context": 0, "direct-field-binding": 1, "nested-source-page-context": 2, "no-explicit-source-page": 3}

    def intern_path(value: str) -> int:
        if value not in path_ids:
            path_ids[value] = len(property_paths)
            property_paths.append(value)
        return path_ids[value]

    def intern_pages(pages: list[dict[str, Any]]) -> int:
        key = json.dumps(pages, sort_keys=True, separators=(",", ":"))
        if key not in page_context_ids:
            page_context_ids[key] = len(page_contexts)
            page_contexts.append([[page["book"], page["printedPage"]] for page in pages])
        return page_context_ids[key]

    for collection in DATA_COLLECTIONS:
        values = data.get(collection)
        source_records = values if isinstance(values, list) else [values] if isinstance(values, dict) else []
        for record in source_records:
            if not isinstance(record, dict) or not isinstance(record.get("id"), str):
                continue
            item_id = record["id"]
            record_pointer = f"/{pointer_part(collection)}/{pointer_part(item_id)}"
            binding_keys = [key for key in ("sourceExcerpts", "scanVerification") if isinstance(record.get(key), dict)]
            primary_binding_key = "sourceExcerpts" if "sourceExcerpts" in binding_keys else "scanVerification" if "scanVerification" in binding_keys else None
            selected_catalog = record.get(primary_binding_key, {}).get("catalog") if primary_binding_key else None
            page_context = source_page_claims(record)
            bindings = extract_bindings(record)
            record_regions = []
            catalog_bindings = []
            for binding_key in binding_keys:
                binding = record[binding_key]
                region_ids = [review["regionId"] for review in binding.get("regionReviews", []) if isinstance(review, dict) and isinstance(review.get("regionId"), str)] if isinstance(binding.get("regionReviews"), list) else []
                record_regions.extend(region_ids)
                catalog_bindings.append({"bindingKey": binding_key, "catalog": binding.get("catalog"), "declaredRegionCount": binding.get("regionCount"), "regionReviewIds": region_ids})
            rec = {
                "collection": collection,
                "itemId": item_id,
                "recordPointer": record_pointer,
                "selectedCatalog": selected_catalog,
                "catalogBindings": catalog_bindings,
                "recordPageContext": [{"book": b, "printedPage": p} for b, p in page_context],
                "recordRegionIds": list(dict.fromkeys(record_regions)),
                "bindingCount": len(bindings),
            }
            record_page_context = rec["recordPageContext"]
            record_index = len(record_rows)
            record_bindings = []
            for binding in bindings:
                key = (record_index, json.dumps(binding, sort_keys=True, separators=(",", ":")))
                if key not in binding_ids:
                    binding_ids[key] = len(bindings_table)
                    bindings_table.append({"recordIndex": record_index, **binding})
                record_bindings.append(binding_ids[key])
            rec["recordPageContextIndex"] = intern_pages(rec["recordPageContext"])
            rec.pop("recordPageContext")
            rec["fieldBindingIndices"] = record_bindings
            record_rows.append(rec)
            for prop in walk_properties(record, record_pointer, page_context):
                relative = prop["pointer"][len(record_pointer):] or "/"
                key = relative.rsplit("/", 1)[-1]
                direct_indexes = [index for index in record_bindings if bindings_table[index].get("fieldPointer") and (bindings_table[index]["fieldPointer"] == relative or relative.startswith(bindings_table[index]["fieldPointer"] + "/"))]
                direct_indexes.sort(key=lambda index: len(bindings_table[index].get("fieldPointer") or ""), reverse=True)
                binding_set = tuple(direct_indexes)
                if binding_set not in binding_set_ids:
                    binding_set_ids[binding_set] = len(binding_sets)
                    binding_sets.append(list(binding_set))
                pages = prop["recordPageContext"]
                if direct_indexes:
                    linkage = "direct-field-binding"
                elif pages == record_page_context:
                    linkage = "record-page-context" if pages else "no-explicit-source-page"
                elif pages:
                    linkage = "nested-source-page-context"
                else:
                    linkage = "no-explicit-source-page"
                category = prop["category"]
                rows.append([record_index, intern_path(relative), kind_codes[prop["kind"]], category_codes[category], linkage_codes[linkage], intern_pages(pages), binding_set_ids[binding_set]])
                property_counts[category] += 1
                linkage_counts[linkage] += 1
    inventory = {
        "tupleSchema": ["recordIndex", "relativePointerPathIndex", "kindCode", "categoryCode", "sourceLinkageCode", "sourcePageContextIndex", "fieldBindingSetIndex"],
        "kindCodes": kind_codes,
        "categoryCodes": category_codes,
        "sourceLinkageCodes": linkage_codes,
        "records": record_rows,
        "propertyPaths": property_paths,
        "sourcePageContexts": page_contexts,
        "fieldBindings": bindings_table,
        "fieldBindingSets": binding_sets,
        "propertyRows": rows,
    }
    return inventory, {
        "exposedCollections": list(DATA_COLLECTIONS),
        "recordCount": len(record_rows),
        "recordsByCollection": dict(Counter(row["collection"] for row in record_rows)),
        "propertyPointerCount": len(rows),
        "propertyCategoryCounts": dict(property_counts),
        "propertySourceLinkageCounts": dict(linkage_counts),
        "propertyPointerInventory": "propertyRows + propertyPaths + records + sourcePageContexts + fieldBindings + fieldBindingSets",
    }


def pdf_words(page: Any) -> list[dict[str, Any]]:
    raw = page.get_text("words", sort=False)
    return [{"box": [word[0], word[1], word[2], word[3]], "text": word[4], "block": word[5], "line": word[6], "index": index} for index, word in enumerate(raw)]


def source_lines(words: list[dict[str, Any]], page_width: float) -> list[dict[str, Any]]:
    grouped: dict[tuple[int, int], list[dict[str, Any]]] = defaultdict(list)
    for word in words:
        grouped[(int(word.get("block", 0)), int(word.get("line", 0)))].append(word)
    lines = []
    for (block, line_no), parts in grouped.items():
        parts.sort(key=lambda word: word["box"][0])
        text = " ".join(part["text"] for part in parts)
        box = [min(w["box"][0] for w in parts), min(w["box"][1] for w in parts), max(w["box"][2] for w in parts), max(w["box"][3] for w in parts)]
        lines.append({"block": block, "line": line_no, "box": box, "text": text, "column": 0 if (box[0] + box[2]) / 2 < page_width / 2 else 1})
    return lines


def line_summary(line: dict[str, Any]) -> dict[str, Any]:
    # No excerpt text is stored or emitted; only non-semantic shape labels and bounds.
    return {"boxPt": [round(value, 2) for value in line["box"]], "column": line["column"], "startClass": start_class(line["text"]), "endClass": ending_class(line["text"]), "wordCount": len(line["text"].split())}


def page_flow_signals(page_lines: list[dict[str, Any]], page_rect: Any) -> list[dict[str, Any]]:
    columns = {0: [], 1: []}
    for line in page_lines:
        if PAGE_NUMBER.fullmatch(line["text"].strip()) or line["box"][1] < page_rect.height * 0.04 or line["box"][3] > page_rect.height * 0.96:
            continue
        columns[line["column"]].append(line)
    signals = []
    if columns[0] and columns[1]:
        left = max(columns[0], key=lambda line: line["box"][1])
        right = min(columns[1], key=lambda line: line["box"][1])
        end = ending_class(left["text"])
        start = start_class(right["text"])
        if end in {"hyphenated-fragment", "dangling-connector", "unpunctuated"} and start == "lowercase-opening":
            confidence = "elevated-geometry-plus-endpoint-cue" if end in {"hyphenated-fragment", "dangling-connector"} else "weak-geometry-plus-text-shape"
            signals.append({"kind": "same-page-column-opening-candidate", "confidence": confidence, "from": line_summary(left), "to": line_summary(right), "semanticReviewRequired": True})
    return signals


def page_boundary_signals(previous_lines: list[dict[str, Any]], next_lines: list[dict[str, Any]], next_page_rect: Any) -> list[dict[str, Any]]:
    def usable(lines: list[dict[str, Any]], page_rect: Any) -> list[dict[str, Any]]:
        return [line for line in lines if not PAGE_NUMBER.fullmatch(line["text"].strip()) and line["box"][1] >= page_rect.height * 0.04 and line["box"][3] <= page_rect.height * 0.96]
    prior = usable(previous_lines, next_page_rect)
    following = usable(next_lines, next_page_rect)
    if not prior or not following:
        return []
    last = max(prior, key=lambda line: (line["column"], line["box"][1], line["box"][0]))
    first = min(following, key=lambda line: (line["column"], line["box"][1], line["box"][0]))
    end, start = ending_class(last["text"]), start_class(first["text"])
    if end not in {"hyphenated-fragment", "dangling-connector", "unpunctuated"} or start != "lowercase-opening":
        return []
    confidence = "elevated-geometry-plus-endpoint-cue" if end in {"hyphenated-fragment", "dangling-connector"} else "weak-geometry-plus-text-shape"
    return [{"kind": "adjacent-pdf-page-opening-candidate", "confidence": confidence, "from": line_summary(last), "to": line_summary(first), "semanticReviewRequired": True}]


def linked_crop_flow_candidates(data_root: Path, catalog_entries: list[dict[str, Any]], page_cache: dict[tuple[str, int], dict[str, Any]]) -> list[dict[str, Any]]:
    """Find same-catalog left-bottom/right-top crop pairs on pages with flow cues."""
    manifest_path = data_root / "research/citation-continuations.json"
    manifest = json.loads(manifest_path.read_text())
    declared = set()
    for group in manifest.get("groups", []):
        segments = sorted((segment for segment in group.get("segments", []) if segment.get("state") == "present"), key=lambda segment: segment.get("order", 0))
        for first, second in zip(segments, segments[1:]):
            if first.get("book") == second.get("book") and first.get("printedPage") == second.get("printedPage"):
                declared.add((first.get("book"), first.get("printedPage"), first.get("regionId"), second.get("regionId")))

    by_page: dict[tuple[str, int], list[dict[str, Any]]] = defaultdict(list)
    for entry in catalog_entries:
        region = entry["region"]
        pdf_page = region.get("pdfPage")
        # This detector compares PDF text-layer geometry only. Image-backed
        # excerpts remain in regionAssessments but have no PDF page frame.
        if type(pdf_page) is not int or pdf_page < 1:
            continue
        by_page[(region.get("book"), pdf_page)].append(entry)
    output = []
    for (book, pdf_page), entries in sorted(by_page.items()):
        page = page_cache.get((book, pdf_page))
        flow = [signal for signal in page.get("flowSignals", []) if signal.get("kind") == "same-page-column-opening-candidate"] if page else []
        if not flow:
            continue
        by_catalog: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for entry in entries:
            by_catalog[entry["catalogPath"]].append(entry)
        for catalog_path, catalog_entries_for_page in sorted(by_catalog.items()):
            left = []
            right = []
            for entry in catalog_entries_for_page:
                rect = rect_xywh(entry["region"].get("normalizedPageRect"))
                if not rect:
                    continue
                x, y, width, height = rect
                if x <= 0.08 and x + width <= 0.52 and y >= 0.65 and y + height >= 0.86:
                    left.append(entry)
                if x >= 0.47 and y <= 0.13 and x + width >= 0.88:
                    right.append(entry)
            for opening in left:
                for continuation in right:
                    if opening["region"].get("id") == continuation["region"].get("id"):
                        continue
                    printed = opening["region"].get("printedPage")
                    region_pair = (book, printed, opening["region"].get("id"), continuation["region"].get("id"))
                    linked = region_pair in declared
                    binding_owners = sorted({f"{use['collection']}:{use['itemId']}" for entry in (opening, continuation) for use in entry["bindingUses"]})
                    output.append({
                        "book": book,
                        "printedPage": printed,
                        "pdfPage": pdf_page,
                        "catalog": catalog_path,
                        "catalogOwner": opening["catalogOwner"],
                        "recordBindingOwners": binding_owners,
                        "openingRegion": {"regionId": opening["region"].get("id"), "imageSha256": opening["region"].get("sha256"), "sourceSha256": opening["catalog"].get("sources", {}).get(book, {}).get("sha256"), "normalizedPageRect": opening["region"].get("normalizedPageRect")},
                        "continuationRegion": {"regionId": continuation["region"].get("id"), "imageSha256": continuation["region"].get("sha256"), "sourceSha256": continuation["catalog"].get("sources", {}).get(book, {}).get("sha256"), "normalizedPageRect": continuation["region"].get("normalizedPageRect")},
                        "sourceFlowCues": flow,
                        "groupStatus": "linked-by-declared-continuation-manifest" if linked else "both-current-regions-present-but-no-declared-linked-group",
                        "semanticReview": "not-done",
                        "sourceTextIncluded": False,
                    })
    # Unique by source/catalog/ordered pair; every catalog consumer is retained in its owner list.
    unique = {}
    for row in output:
        key = (row["book"], row["printedPage"], row["catalog"], row["openingRegion"]["regionId"], row["continuationRegion"]["regionId"])
        unique[key] = row
    return list(unique.values())


def text_inventory(data_root: Path, source_dir: Path, catalog_entries: list[dict[str, Any]], property_data: dict[str, Any], property_summary: dict[str, Any], input_commit: str, data: dict[str, Any] | None = None) -> dict[str, Any]:
    try:
        import fitz  # type: ignore
    except ImportError as error:
        raise RuntimeError("PyMuPDF is required for source comparison; install/import fitz or run tests that use fixtures only") from error

    pdfs: dict[str, Any] = {}
    pdf_meta = {}
    required: dict[str, set[int]] = defaultdict(set)
    all_region_groups: dict[tuple[str, int], list[dict[str, Any]]] = defaultdict(list)
    for entry in catalog_entries:
        region = entry["region"]
        book = region.get("book")
        pdf_page = region.get("pdfPage")
        if book in BOOKS and isinstance(pdf_page, int) and pdf_page > 0:
            required[book].add(pdf_page)
            all_region_groups[(book, pdf_page)].append(entry)

    def get_page(book: str, page_number: int):
        doc = pdfs[book]
        if page_number < 1 or page_number > len(doc):
            return None
        return doc[page_number - 1]

    # Verify whole-PDF identity against each owner's source record and record the private input fingerprint.
    expected_hashes: dict[str, set[str]] = defaultdict(set)
    for entry in catalog_entries:
        region = entry["region"]
        c = entry["catalog"]
        source = c.get("sources", {}).get(region.get("book"), {})
        if isinstance(source.get("sha256"), str):
            expected_hashes[region["book"]].add(source["sha256"])
    for book, filename in BOOK_FILES.items():
        path = source_dir / filename
        if not path.is_file():
            pdf_meta[book] = {"available": False, "filename": filename, "assessability": "source-pdf-missing"}
            continue
        raw = path.read_bytes()
        pdf_hash = sha256_bytes(raw)
        doc = fitz.open(path)
        pdfs[book] = doc
        expected = sorted(expected_hashes[book])
        pdf_meta[book] = {
            "available": True,
            "filename": filename,
            "sourcePdfSha256": pdf_hash,
            "catalogSourceHashes": expected,
            "hashMatchesCatalogSource": pdf_hash in expected if expected else None,
            "pdfPages": len(doc),
        }

    if data is None:
        data = json.loads((data_root / "dist/data.json").read_text())
    frame_registry = _FRAME_BRIDGE.load_registry()
    frame_registry_validation = _FRAME_BRIDGE.validate_live_registry(data, data_root / "dist")
    if frame_registry_validation.get("status") != "current-pins-match":
        raise RuntimeError("active source-frame bridge does not match current catalog/image/owner pins")
    frame_books = {frame["book"] for frame in frame_registry["frames"]}
    available_frame_hashes = {book: pdf_meta[book]["sourcePdfSha256"] for book in frame_books if pdf_meta.get(book, {}).get("available")}
    for book, observed_hash in available_frame_hashes.items():
        expected_hashes_for_book = {frame["sourcePdfSha256"] for frame in frame_registry["frames"] if frame["book"] == book}
        if len(expected_hashes_for_book) != 1 or observed_hash not in expected_hashes_for_book:
            raise RuntimeError(f"available {book} PDF bytes differ from the active source-frame bridge identity")
    private_frame_replay = {"status": "source-pdf-unavailable-for-one-or-more-registered-books", "frameGroups": len(frame_registry["frames"]), "pdfPageBoxesValidated": 0}
    if frame_books <= set(pdfs):
        replay = _FRAME_BRIDGE.validate_live_registry(data, data_root / "dist", available_frame_hashes, pdfs)
        if replay.get("status") != "current-pins-match":
            raise RuntimeError("active source-frame bridge PDF page boxes differ from the current private PDFs")
        private_frame_replay = {"status": "current-pdf-boxes-match-registered-frames", "frameGroups": len(frame_registry["frames"]), "pdfPageBoxesValidated": len(frame_registry["frames"])}
    owner_items: dict[tuple[str, str], dict[str, Any]] = {}
    for collection in DATA_COLLECTIONS:
        values = data.get(collection)
        records = values if isinstance(values, list) else [values] if isinstance(values, dict) else []
        for item in records:
            if isinstance(item, dict) and isinstance(item.get("id"), str):
                owner_items[(collection, item["id"])] = item
    if isinstance(data.get("progressionExplainer"), dict):
        owner_items[("progressionExplainer", "progression-explainer")] = dict(data["progressionExplainer"], id="progression-explainer")

    def resolution_for_use(entry: dict[str, Any], use: dict[str, Any], region: dict[str, Any], catalog: dict[str, Any], page_object: Any | None) -> dict[str, Any]:
        collection, item_id, binding = use["collection"], use["itemId"], use["bindingKey"]
        item = owner_items.get((collection, item_id))
        owner_link = item.get(binding) if isinstance(item, dict) else None
        if not isinstance(owner_link, dict) or owner_link.get("catalog") != entry["catalogPath"]:
            raise RuntimeError(f"source-frame owner/catalog binding changed: {entry['catalogPath']}#{region.get('id')}")
        source_sha = (catalog.get("sources", {}).get(region.get("book")) or {}).get("sha256")
        image_dims = [region.get("width"), region.get("height")]
        focus_sha, content_sha = _FRAME_BRIDGE.region_hashes(region)
        observed = {
            "book": region.get("book"), "printedPage": region.get("printedPage"), "pdfPage": region.get("pdfPage"),
            "sourcePdfSha256": source_sha, "catalogSha256": entry["catalogSha256"],
            "imageSha256": region.get("sha256"), "imageDimensionsPx": image_dims,
            "normalizedPageRect": region.get("normalizedPageRect"), "focusSha256": focus_sha,
            "contentSha256": content_sha, "ownerSourceLinkSha256": _FRAME_BRIDGE.canonical_sha(owner_link),
        }
        resolved = _FRAME_BRIDGE.resolve_owner_join(
            frame_registry,
            _FRAME_BRIDGE.owner_key(collection, item_id, binding, entry["catalogPath"], region.get("id")),
            observed,
        )
        if resolved.get("status") == "conflicting-frame-identity":
            raise RuntimeError(f"source-frame owner/region conflicts with the active registry: {entry['catalogPath']}#{region.get('id')}")
        if resolved.get("status") == "matched":
            if page_object is not None:
                resolved = _FRAME_BRIDGE.current_observation(
                    collection=collection, item_id=item_id, binding=binding, catalog_path=entry["catalogPath"],
                    catalog_hash=entry["catalogSha256"], catalog=catalog, region=region, owner_link=owner_link,
                    image_path=(data_root / "dist" / entry["catalogPath"]).parent / str(region.get("image", "")),
                    book=region.get("book"), printed_page=region.get("printedPage"), pdf_page=region.get("pdfPage"),
                    source_pdf_sha256=pdf_meta.get(region.get("book"), {}).get("sourcePdfSha256", source_sha), page=page_object,
                )
                if resolved.get("status") != "matched":
                    raise RuntimeError(f"source-frame owner/page-box replay failed: {entry['catalogPath']}#{region.get('id')}")
        return {
            "bindingKey": binding, "collection": collection, "itemId": item_id,
            **_FRAME_BRIDGE.public_resolution(resolved),
        }

    page_cache: dict[tuple[str, int], dict[str, Any]] = {}
    for book, pages in required.items():
        if book not in pdfs:
            continue
        pages_to_read = set(pages)
        for page_number in pages:
            pages_to_read.add(page_number - 1)
            pages_to_read.add(page_number + 1)
        for page_number in sorted(p for p in pages_to_read if p > 0):
            page = get_page(book, page_number)
            if page is None:
                page_cache[(book, page_number)] = {"available": False, "textLayer": "not-assessable", "wordCount": 0, "lines": [], "pageWidthPt": None, "pageHeightPt": None, "flowSignals": []}
                continue
            words = pdf_words(page)
            lines = source_lines(words, page.rect.width)
            page_cache[(book, page_number)] = {
                "available": True,
                "textLayer": "present" if len(words) >= 8 else "empty-or-insufficient",
                "wordCount": len(words),
                "lines": lines,
                "pageWidthPt": float(page.rect.width),
                "pageHeightPt": float(page.rect.height),
                "flowSignals": page_flow_signals(lines, page.rect),
                "_words": words,
            }

    for book in sorted(pdfs):
        book_pages = sorted(page_number for source_book, page_number in page_cache if source_book == book)
        for page_number in book_pages:
            next_page_number = page_number + 1
            previous, following = page_cache.get((book, page_number)), page_cache.get((book, next_page_number))
            if not previous or not following or not previous.get("available") or not following.get("available"):
                continue
            page_obj = get_page(book, next_page_number)
            following["pageBoundarySignalsFromPrevious"] = page_boundary_signals(previous["lines"], following["lines"], page_obj.rect)

    region_results = []
    flagged_regions = []
    source_page_results = []
    review_rows = []
    not_assessable = Counter()
    signal_counts = Counter()
    owners_by_source = defaultdict(set)
    for entry in catalog_entries:
        region, catalog = entry["region"], entry["catalog"]
        book, pdf_page = region.get("book"), region.get("pdfPage")
        supplemental_identity = supplemental_region_identity(catalog, region)
        owner = {"collection": catalog.get("collection"), "itemId": catalog.get("itemId"), "catalog": entry["catalogPath"]}
        page = page_cache.get((book, pdf_page), {"available": False, "textLayer": "not-assessable", "wordCount": 0, "lines": [], "pageWidthPt": None, "pageHeightPt": None, "flowSignals": []})
        page_object = get_page(book, pdf_page) if page.get("available") and isinstance(pdf_page, int) else None
        if supplemental_identity is not None and supplemental_identity["valid"]:
            coordinate_frame_resolutions = [
                {"bindingKey": use["bindingKey"], "collection": use["collection"], "itemId": use["itemId"],
                 "status": "not-applicable-supplemental-image-frame", "basis": "unassessable"}
                for use in entry["bindingUses"]
            ]
        else:
            coordinate_frame_resolutions = [
                resolution_for_use(entry, use, region, catalog, page_object)
                for use in entry["bindingUses"]
            ]
        matched_resolutions = [row for row in coordinate_frame_resolutions if row.get("status") == "matched"]
        registered_frame_bounds = None
        if matched_resolutions:
            if len(matched_resolutions) != len(coordinate_frame_resolutions) or len(matched_resolutions) != 1:
                raise RuntimeError(f"one catalog region has mixed or duplicated active frame owners: {entry['catalogPath']}#{region.get('id')}")
            matched_use = matched_resolutions[0]
            key = _FRAME_BRIDGE.owner_key(matched_use["collection"], matched_use["itemId"], matched_use["bindingKey"], entry["catalogPath"], region.get("id"))
            frame, bridge_row = frame_registry["owners"][key]
            if page_object is not None:
                page_rect, crop_box, media_box = page_object.rect, page_object.cropbox, page_object.mediabox
            else:
                boxes = frame["pdfBoxesPoints"]
                page_rect, crop_box, media_box = boxes["pageRect"], boxes["cropBox"], boxes["mediaBox"]
            registered_frame_bounds, projection_status = _FRAME_BRIDGE.normalized_rect_to_page_points(
                region.get("normalizedPageRect"), frame["coordinateSpace"], page_rect, crop_box, media_box,
            )
            if projection_status != "assessable" or registered_frame_bounds is None:
                raise RuntimeError(f"active source-frame projection is invalid: {entry['catalogPath']}#{region.get('id')}")
            matched_use["pdfPagePointsLTRB"] = registered_frame_bounds
        rect = rect_xywh(region.get("normalizedPageRect"))
        status = "assessed"
        geometry = None
        signal_names: list[str] = []
        if supplemental_identity is not None and supplemental_identity["valid"]:
            status = "not-assessable-supplemental-image-format"
            not_assessable[status] += 1
        elif supplemental_identity is not None:
            status = "invalid-source-identity"
            not_assessable[status] += 1
        elif not page["available"]:
            status = "source-page-unavailable"
            not_assessable[status] += 1
        elif page["textLayer"] != "present":
            status = "no-usable-text-layer"
            not_assessable[status] += 1
        elif rect is None:
            status = "crop-geometry-missing-or-invalid"
            not_assessable[status] += 1
        else:
            width, height = page["pageWidthPt"], page["pageHeightPt"]
            x, y, w, h = rect
            if registered_frame_bounds is not None:
                crop = tuple(registered_frame_bounds)
            else:
                crop = (x * width, y * height, (x + w) * width, (y + h) * height)
            words = page.get("_words", [])
            crop_features = crop_word_geometry(words, crop)
            geometry = {key: value for key, value in crop_features.items() if key != "cropBox"}
            if registered_frame_bounds is not None:
                geometry["cropBoundsPdfPagePointsLTRB"] = registered_frame_bounds
            if crop_features["crossings"]:
                signal_names.append("word-crosses-crop-boundary")
            lines = page["lines"]
            # The most downstream text line inside the crop: columns flow left then right.
            selected = [line for line in lines if line["box"][2] > crop[0] and line["box"][0] < crop[2] and line["box"][3] > crop[1] and line["box"][1] < crop[3] and not PAGE_NUMBER.fullmatch(line["text"].strip())]
            left_or_right_columns = []
            for line in selected:
                col = 0 if (line["box"][0] + line["box"][2]) / 2 < (crop[0] + crop[2]) / 2 else 1
                left_or_right_columns.append((col, line["box"][1], line["box"][0], line))
            ordered = [row[3] for row in sorted(left_or_right_columns)]
            last_line = ordered[-1] if ordered else None
            first_line = ordered[0] if ordered else None
            if last_line:
                line_height = max(1.0, last_line["box"][3] - last_line["box"][1])
                edge_gap = crop[3] - last_line["box"][3]
                end_cls = ending_class(last_line["text"])
                if edge_gap <= max(2.5 * line_height, 12) and end_cls in {"hyphenated-fragment", "dangling-connector", "unpunctuated"}:
                    signal_names.append(f"open-{end_cls}-at-crop-bottom")
            if first_line:
                line_height = max(1.0, first_line["box"][3] - first_line["box"][1])
                start_gap = first_line["box"][1] - crop[1]
                if start_gap <= max(2.5 * line_height, 12) and start_class(first_line["text"]) == "lowercase-opening":
                    signal_names.append("lowercase-text-at-crop-top")
            for name in set(signal_names):
                signal_counts[name] += 1
        context = {
            "regionId": region.get("id"), "book": book, "printedPage": region.get("printedPage"), "pdfPage": pdf_page,
            "sourceSha256": supplemental_identity["sourceSha256"] if supplemental_identity else catalog.get("sources", {}).get(book, {}).get("sha256"),
            "imageSha256": region.get("sha256"), "normalizedPageRect": region.get("normalizedPageRect"),
            "owner": owner, "bindingUses": [{"bindingKey": use["bindingKey"], "collection": use["collection"], "itemId": use["itemId"]} for use in entry["bindingUses"]],
            "coordinateFrameResolutions": coordinate_frame_resolutions,
            "coordinateFrameBoundsPdfPagePointsLTRB": registered_frame_bounds,
            "textGeometryStatus": status, "sourceTextWordCount": page["wordCount"],
            "signals": sorted(set(signal_names)), "geometry": geometry,
            "adjacentFlowSignals": list(page["flowSignals"]) + list(page.get("pageBoundarySignalsFromPrevious", [])),
        }
        if supplemental_identity is not None:
            context.update({
                "sourceKind": supplemental_identity["sourceKind"],
                "sourceArtifactId": supplemental_identity["sourceArtifactId"],
                "canonicalPdfSha256": supplemental_identity["canonicalPdfSha256"],
                "sourceDimensionsPx": supplemental_identity["sourceDimensionsPx"],
                "sourceCropBoundsPx": supplemental_identity["sourceCropBoundsPx"],
                "sourceCoordinateSpace": supplemental_identity["sourceCoordinateSpace"],
            })
        region_results.append(context)
        owners_by_source[(book, region.get("printedPage"), pdf_page)].add(f"{catalog.get('collection')}:{catalog.get('itemId')}")
        if signal_names:
            flagged_regions.append(context)

    manifest = json.loads((data_root / "research/citation-continuations.json").read_text())
    declared_pages = {(segment.get("book"), segment.get("printedPage")) for group in manifest.get("groups", []) for segment in group.get("segments", []) if isinstance(segment, dict)}

    for (book, pdf_page), page in sorted(page_cache.items()):
        if pdf_page not in required.get(book, set()):
            continue
        printed_pages = sorted({e["region"]["printedPage"] for e in all_region_groups[(book, pdf_page)] if isinstance(e["region"].get("printedPage"), int)})
        signals = list(page["flowSignals"])
        signals.extend(page.get("pageBoundarySignalsFromPrevious", []))
        page_flags = [flag for flag in flagged_regions if flag.get("book") == book and flag.get("pdfPage") == pdf_page]
        high_page_flow = [signal for signal in signals if signal.get("confidence", "").startswith("elevated-")]
        weak_page_flow = [signal for signal in signals if signal.get("confidence") == "weak-geometry-plus-text-shape"]
        high_region_flags = [flag for flag in page_flags if "open-hyphenated-fragment-at-crop-bottom" in flag.get("signals", [])]
        weak_region_flags = [flag for flag in page_flags if any(signal in flag.get("signals", []) for signal in ("open-dangling-connector-at-crop-bottom", "open-unpunctuated-at-crop-bottom", "lowercase-text-at-crop-top"))]
        edge_only = [flag for flag in page_flags if "word-crosses-crop-boundary" in flag.get("signals", []) and not any(signal.startswith("open-") or signal == "lowercase-text-at-crop-top" for signal in flag.get("signals", []))]
        known_declared = any((book, printed_page) in declared_pages for printed_page in printed_pages)
        if known_declared and (signals or page_flags):
            disposition = "existing-declared-continuation-page-control"
            strength = "known-positive-or-negative-control"
        elif high_page_flow or high_region_flags:
            disposition = "new-elevated-endpoint-or-flow-candidate"
            strength = "combined-endpoint-and-flow" if high_page_flow and high_region_flags else "elevated-endpoint-or-flow"
        elif weak_page_flow or weak_region_flags:
            disposition = "new-weak-shape-candidate"
            strength = "weak-only"
        elif edge_only:
            disposition = "word-box-edge-geometry-only"
            strength = "geometry-only"
        else:
            disposition = "no-implemented-signal-not-a-semantic-pass"
            strength = "none"
        owner_ids = sorted({f"{use['collection']}:{use['itemId']}" for entry in all_region_groups[(book, pdf_page)] for use in entry["bindingUses"]})
        catalog_owner_ids = sorted({entry["catalogOwner"] for entry in all_region_groups[(book, pdf_page)]})
        region_ids = sorted({entry["region"].get("id") for entry in all_region_groups[(book, pdf_page)]})
        page_queue_row = {
            "book": book,
            "printedPagesBound": printed_pages,
            "pdfPage": pdf_page,
            "disposition": disposition,
            "signalStrength": strength,
            "adjacentColumnAndPageSignals": signals,
            "regionSignalCaseIds": [{"regionId": flag.get("regionId"), "catalog": flag.get("owner", {}).get("catalog"), "signals": flag.get("signals"), "normalizedPageRect": flag.get("normalizedPageRect"), "geometry": flag.get("geometry")} for flag in page_flags],
            "catalogRegionIdsOnSourcePage": region_ids,
            "catalogOwnersOnSourcePage": catalog_owner_ids,
            "recordBindingOwnersOnSourcePage": owner_ids,
            "bindingKeysOnSourcePage": sorted({use["bindingKey"] for entry in all_region_groups[(book, pdf_page)] for use in entry["bindingUses"]}),
            "semanticReview": "not-done",
        }
        if disposition != "no-implemented-signal-not-a-semantic-pass":
            review_rows.append(page_queue_row)
        source_page_results.append({
            "book": book,
            "printedPagesBound": printed_pages,
            "pdfPage": pdf_page,
            "pdfPageTextLayer": page["textLayer"],
            "sourceTextWordCount": page["wordCount"],
            "catalogRegionUsageCount": len(all_region_groups[(book, pdf_page)]),
            "catalogOwnerCount": len(catalog_owner_ids),
            "recordBindingOwnerCount": len(owner_ids),
            "adjacentColumnCandidates": signals,
            "adjacentPdfPageCandidates": page.get("pageBoundarySignalsFromPrevious", []),
            "adjacentPdfPageAvailability": {"previousPage": page_cache.get((book, pdf_page - 1), {}).get("textLayer", "outside-scanned-window"), "nextPage": page_cache.get((book, pdf_page + 1), {}).get("textLayer", "outside-scanned-window")},
            "disposition": disposition,
            "signalStrength": strength,
        })

    source_pages = {(item["book"], item["printedPage"], item["pdfPage"]) for item in region_results if isinstance(item["book"], str) and isinstance(item["printedPage"], int) and isinstance(item["pdfPage"], int)}
    property_source_counts = property_summary["propertySourceLinkageCounts"]
    elevated_queue = [row for row in review_rows if row["disposition"] in {"new-elevated-endpoint-or-flow-candidate", "existing-declared-continuation-page-control"}]
    weak_queue = [row for row in review_rows if row["disposition"] == "new-weak-shape-candidate"]
    edge_queue = [row for row in review_rows if row["disposition"] == "word-box-edge-geometry-only"]
    linked_pairs = linked_crop_flow_candidates(data_root, catalog_entries, page_cache)
    resolution_counts = Counter(
        resolution["status"]
        for assessment in region_results
        for resolution in assessment.get("coordinateFrameResolutions", [])
    )
    source_frame_declaration = {
        "path": _FRAME_BRIDGE.REGISTRY_RELATIVE_PATH,
        "sha256": _FRAME_BRIDGE.REGISTRY_SHA256,
        "status": "scoped-geometric-provenance-only",
        "resolutionCounts": dict(sorted(resolution_counts.items())),
        "registryValidation": frame_registry_validation,
    }
    return {
        "schemaVersion": 1,
        "scope": "Discovery-only comparison of the complete current exposed catalog-region set and every scalar/null property pointer in the assembled content records against source-page text-layer word geometry. Candidate queue is not a semantic completeness verdict. No original source text, OCR transcript, PDF or image pixels are included.",
        "runMode": {"status": "current-active-source-frame-bridge-required"},
        "sourceFrameCoordinateBridge": source_frame_declaration,
        "privatePdfFrameReplay": private_frame_replay,
        "input": {
            "gitCommit": input_commit,
            "distDataSha256": sha256_bytes((data_root / "dist/data.json").read_bytes()),
            "continuationManifestSha256": sha256_bytes((data_root / "research/citation-continuations.json").read_bytes()),
            "historicalContinuationHistoryFixtureSha256": sha256_bytes((data_root / "tests/fixtures/citation-continuation-history.json").read_bytes()),
            "sourceDirectoryWasPrivateInput": True,
            "sources": pdf_meta,
            "sourceFrameCoordinateBridgeSha256": _FRAME_BRIDGE.REGISTRY_SHA256,
            "sourceFrameRegistryValidation": frame_registry_validation,
        },
        "exposedUniverse": {
            "catalogFileCount": len({entry["catalogPath"] for entry in catalog_entries}),
            "catalogRegionUsageCount": len(catalog_entries),
            "uniqueCatalogRegionIds": len({(entry["catalogPath"], entry["region"].get("id")) for entry in catalog_entries}),
            "bindingRegionUsageCount": sum(len(entry["bindingUses"]) for entry in catalog_entries),
            "uniqueSourcePageBindings": len(source_pages),
            "sourcePagesByBook": dict(Counter(book for book, _printed, _pdf in source_pages)),
            "propertyUniverse": {key: value for key, value in property_summary.items() if key != "records"},
        },
        "sourcePageUniverse": source_page_results,
        "regionAssessments": region_results,
        "reviewQueues": {"elevatedAndDeclaredControls": elevated_queue, "weakShapeOnly": weak_queue, "wordBoxGeometryOnlySourcePages": edge_queue},
        "pairedCropFlowCandidates": linked_pairs,
        "flaggedRegionGeometry": flagged_regions,
        "propertyPointerInventory": property_data,
        "assessmentCounts": {
            "regions": len(region_results),
            "regionTextGeometryStatus": dict(Counter(region["textGeometryStatus"] for region in region_results)),
            "regionsWithAnyCropSignal": len(flagged_regions),
            "regionsWithWordBoxCrossing": signal_counts["word-crosses-crop-boundary"],
            "elevatedAndDeclaredControlPages": len(elevated_queue),
            "weakShapeOnlyPages": len(weak_queue),
            "wordBoxGeometryOnlyPages": len(edge_queue),
            "heuristicSignalCounts": dict(signal_counts),
            "sourcePageFlowCandidateCount": sum(len(page["adjacentColumnCandidates"]) for page in source_page_results),
            "sameCatalogLeftBottomToRightTopPairs": len(linked_pairs),
            "unlinkedPairCandidates": sum(1 for pair in linked_pairs if pair["groupStatus"] == "both-current-regions-present-but-no-declared-linked-group"),
            "notAssessable": dict(not_assessable),
            "propertyPointersBySourceLinkage": dict(property_source_counts),
            "noSignalInterpretation": "No structural candidate means only that the implemented text-layer geometry and language-shape rules emitted no signal. It is not a semantic pass.",
        },
        "historicalControls": historical_controls(data_root, page_cache),
        "limits": [
            "Text-layer boxes can be imperfect and may represent OCR-like errors; edge crossings are candidates, not confirmed clipped ink.",
            "No text layer, invalid/missing crop geometry, fold damage, decoration, tables, equations and nonprose layouts remain not-assessable or high-false-positive contexts.",
            "The endpoint grammar detects shape cues, not sentence meaning, referents, source scope or correct continuation order.",
            "This scan checks the supplied pages directly bound by exposed catalogs plus their immediate PDF neighbors; it is not a full-book semantic census.",
            "Current declared continuation segments can satisfy a known historical case; this does not make unrelated no-signal regions complete.",
        ],
    }


def historical_controls(data_root: Path, page_cache: dict[tuple[str, int], dict[str, Any]] | None = None) -> dict[str, Any]:
    history_path = data_root / "tests/fixtures/citation-continuation-history.json"
    manifest_path = data_root / "research/citation-continuations.json"
    calibration_path = data_root / "research/citation-regression-calibration.json"
    controls = []
    history_cases: dict[str, dict[str, Any]] = {}
    if history_path.exists():
        history = json.loads(history_path.read_text())
        for case in history.get("cases", []):
            history_cases[case.get("id")] = case
            controls.append({
                "id": case.get("id"), "type": "historical-positive-known-omitted-segment",
                "historicalCommit": case.get("historicalCatalog", {}).get("gitCommit"),
                "sourceEvidenceStatus": case.get("originalSourceEvidence", {}).get("status"),
                "historicalSource": [{"book": page.get("book"), "printedPage": page.get("printedPage"), "pdfPage": page.get("pdfPage"), "sourceSha256": page.get("sourceSha256")} for page in case.get("originalSourceEvidence", {}).get("pages", [])],
                "currentExpectedRegionIds": case.get("correctedExpectedRegionIds", []),
                "detectorRegressionCue": "hyphenated crop endpoint or same-page column/page flow shape; this existing review is a historical control, not automatic confirmation",
                "disposition": "preserve-regression-control; current catalog may now contain the known continuation",
                "textIncluded": False,
            })
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text())
        for group in manifest.get("regressions", []):
            if group.get("id") == "animate-object-shared-phb-51-crop":
                controls.append({
                    "id": "animate-object-source-review-record",
                    "type": "historical-source-review-reference",
                    "evidenceReference": group.get("evidence"),
                    "sourceComparisonStatus": group.get("sourceComparison", {}).get("status"),
                    "disposition": "preserve old-right-edge crossing and corrected-crop noncrossing expected by numeric Git fixture",
                    "textIncluded": False,
                })
    calibration_path = data_root / "research/citation-regression-calibration.json"
    if calibration_path.exists():
        calibration = json.loads(calibration_path.read_text())
        case = next((item for item in calibration.get("clippingCases", []) if item.get("id") == "animate-object-phb51-right-edge-words"), None)
        if case:
            controls.append({
                "id": "animate-object-old-crop-right-edge",
                "type": "historical-positive-crop-boundary-regression",
                "book": case.get("sourcePage", {}).get("book"),
                "printedPage": case.get("sourcePage", {}).get("printedPage"),
                "pdfPage": case.get("sourcePage", {}).get("pdfPage"),
                "sourcePdfSha256": case.get("sourcePage", {}).get("sourcePdfSha256"),
                "oldCropPoints": case.get("oldCrop", {}).get("values"),
                "correctedCropPoints": case.get("correctedCrop", {}).get("values"),
                "sourceWordBoxes": case.get("sourceTextWordBoxes"),
                "expectedOldCrossingEdges": case.get("expectedOldCrossingEdges"),
                "expectedCorrectedCrossingEdges": case.get("expectedCorrectedCrossingEdges"),
                "disposition": "numeric source-word geometry positive on old crop, negative on corrected crop; only these three recorded word boxes are calibrated",
                "textIncluded": False,
            })
    # The old Charging p.67 page hypothesis is a source-reviewed negative control.
    controls.append({
        "id": "charging-dmg-page67-hypothesis",
        "type": "historical-source-reviewed-negative",
        "sourceReviewStatus": "superseded-by-source-review",
        "disposition": "DMG printed p.67 contains unrelated excerpts; the complete charge passage continues within printed p.66, across its columns.",
        "detectorExpectation": "do not promote a generic neighboring-page candidate to a confirmed continuation",
        "textIncluded": False,
    })
    # Re-evaluate historical pre-fix catalog footprints against source-page
    # shape without using a continuation manifest to emit or rank the cue.
    # This makes known omissions a generic-detector calibration, not a replay
    # of manifest-declared positives.
    if page_cache:
        for control in controls:
            case = history_cases.get(control.get("id"))
            if not case:
                continue
            historical = case.get("historicalCatalog", {})
            commit = historical.get("gitCommit")
            catalog_path = case.get("catalogPath")
            if not isinstance(commit, str) or not isinstance(catalog_path, str):
                continue
            try:
                raw_catalog = subprocess.run(
                    ["git", "show", f"{commit}:{catalog_path}"],
                    cwd=data_root, capture_output=True, check=True,
                ).stdout
                actual_blob = subprocess.run(
                    ["git", "rev-parse", f"{commit}:{catalog_path}"],
                    cwd=data_root, capture_output=True, text=True, check=True,
                ).stdout.strip()
                if historical.get("gitBlobOid") and actual_blob != historical["gitBlobOid"]:
                    raise ValueError("historical catalog blob differs from the pinned omission fixture")
                old_catalog = json.loads(raw_catalog)
                manifest_check = subprocess.run(
                    ["git", "cat-file", "-e", f"{commit}:research/citation-continuations.json"],
                    cwd=data_root, capture_output=True,
                )
                source_pages = []
                for page in case.get("originalSourceEvidence", {}).get("pages", []):
                    book, pdf_page = page.get("book"), page.get("pdfPage")
                    scanned = page_cache.get((book, pdf_page))
                    if not scanned:
                        source_pages.append({
                            "book": book, "printedPage": page.get("printedPage"), "pdfPage": pdf_page,
                            "sourceSha256": page.get("sourceSha256"),
                            "detectorStatus": "source-page-not-in-current-scan-window",
                            "samePageColumnCandidates": [],
                        })
                        continue
                    relevant_rows = [
                        region for region in old_catalog.get("regions", [])
                        if region.get("book") == book and region.get("printedPage") == page.get("printedPage") and region.get("pdfPage") == pdf_page
                    ]
                    candidates = [
                        signal for signal in scanned.get("flowSignals", [])
                        if signal.get("kind") == "same-page-column-opening-candidate"
                    ]
                    source_pages.append({
                        "book": book, "printedPage": page.get("printedPage"), "pdfPage": pdf_page,
                        "sourceSha256": page.get("sourceSha256"),
                        "historicalCatalogRegionCountOnPage": len(relevant_rows),
                        "historicalCatalogRegionIdsOnPage": [region.get("id") for region in relevant_rows],
                        "sourcePageTextLayer": scanned.get("textLayer"),
                        "samePageColumnCandidates": candidates,
                        "detectorStatus": "candidate" if candidates else "assessed-no-same-page-column-candidate-not-a-semantic-pass",
                    })
                control["historicalDetectorCalibration"] = {
                    "historicalCatalogPath": catalog_path,
                    "historicalCatalogCommit": commit,
                    "historicalCatalogBlobOid": historical.get("gitBlobOid"),
                    "historicalCatalogRawSha256": sha256_bytes(raw_catalog),
                    "historicalContinuationManifest": "present" if manifest_check.returncode == 0 else "absent-at-historical-commit",
                    "genericDetectorUsesManifest": False,
                    "historicalMissingOrders": case.get("historicalMissingOrders", []),
                    "sourcePages": source_pages,
                    "textIncluded": False,
                    "semanticReviewRequired": True,
                }
            except (subprocess.CalledProcessError, json.JSONDecodeError, OSError, ValueError) as error:
                control["historicalDetectorCalibration"] = {
                    "historicalCatalogPath": catalog_path,
                    "historicalCatalogCommit": commit,
                    "status": "historical-git-evidence-unavailable",
                    "detail": type(error).__name__,
                    "textIncluded": False,
                    "semanticReviewRequired": True,
                }
    return {"scope": "Historical evidence references and numeric crop calibration retained as regression controls; they are not new reviews and are not counted as current source-semantic confirmations.", "controls": controls}


def mechanics_field_denominator(root: Path) -> dict[str, Any]:
    script = """
import {readFileSync} from 'node:fs';
import {fieldsFor} from './tools/mechanics-audit.mjs';
const data=JSON.parse(readFileSync('./dist/data.json','utf8'));
const collections=['rules','spells','equipment','matrices','classes','progressionExplainer'];
const byCollection={}; let records=0,total=0;
for(const collection of collections){
 const values=Array.isArray(data[collection])?data[collection]:data[collection]&&typeof data[collection]==='object'?[data[collection]]:[];
 for(const item of values){const n=fieldsFor(collection,item).length;records++;total+=n;byCollection[collection]=(byCollection[collection]||0)+n;}
}
process.stdout.write(JSON.stringify({records,total,byCollection}));
"""
    result = subprocess.run(["node", "--input-type=module", "-e", script], cwd=root, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"mechanics-audit fieldsFor failed: {result.stderr.strip()}")
    value = json.loads(result.stdout)
    return {
        "method": "tools/mechanics-audit.mjs fieldsFor(collection, item)",
        "records": value["records"],
        "totalFields": value["total"],
        "byCollection": value["byCollection"],
        "mechanicsAuditModuleSha256": sha256_bytes((root / "tools/mechanics-audit.mjs").read_bytes()),
        "inputDataRawSha256": sha256_bytes((root / "dist/data.json").read_bytes()),
        "scope": "Tracked mechanics-field leaves only; generated citation/provenance metadata is outside this denominator.",
    }


def build_catalog_inventory(root: Path, data: dict[str, Any]) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    directory = root / "dist/scans"
    entries = []
    catalog_hashes = {}
    catalogs = sorted(directory.rglob("*.json"))
    refs: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for collection in DATA_COLLECTIONS:
        values = data.get(collection)
        records = values if isinstance(values, list) else [values] if isinstance(values, dict) else []
        for record in records:
            if not isinstance(record, dict):
                continue
            for key in ("sourceExcerpts", "scanVerification"):
                binding = record.get(key)
                if isinstance(binding, dict) and isinstance(binding.get("catalog"), str):
                    region_ids = [review["regionId"] for review in binding.get("regionReviews", []) if isinstance(review, dict) and isinstance(review.get("regionId"), str)] if isinstance(binding.get("regionReviews"), list) else []
                    refs[binding["catalog"]].append({
                        "bindingKey": key,
                        "collection": collection,
                        "itemId": record.get("id"),
                        "declaredRegionCount": binding.get("regionCount"),
                        "regionIds": list(dict.fromkeys(region_ids)),
                    })
    for path in catalogs:
        raw = path.read_bytes()
        try:
            catalog = json.loads(raw)
        except json.JSONDecodeError:
            continue
        rel = str(path.relative_to(root / "dist"))
        catalog_hashes[rel] = sha256_bytes(raw)
        if not isinstance(catalog.get("regions"), list):
            continue
        binding_uses = refs.get(rel, [])
        if not binding_uses:
            continue
        regions = catalog.get("regions", [])
        all_ids = [region.get("id") for region in regions if isinstance(region, dict) and isinstance(region.get("id"), str)]
        for use in binding_uses:
            if not use["regionIds"]:
                use["regionIds"] = list(all_ids)
        for region_index, region in enumerate(catalog.get("regions", [])):
            if not isinstance(region, dict):
                continue
            region_id = region.get("id")
            region_uses = [use for use in binding_uses if region_id in use["regionIds"]]
            entries.append({"catalogPath": rel, "catalog": catalog, "catalogSha256": catalog_hashes[rel], "regionIndex": region_index, "region": region, "bindingUses": region_uses, "exposedOwners": sorted({f"{use['collection']}:{use['itemId']}" for use in region_uses}), "catalogOwner": f"{catalog.get('collection')}:{catalog.get('itemId')}"})
    exposed = {
        "catalogJsonFilesUnderScans": len(catalog_hashes),
        "catalogFilesReferencedByExposedRecords": len(refs),
        "catalogRegionRows": len(entries),
        "regionRowsBoundToAnyExposedRecord": sum(1 for entry in entries if entry["bindingUses"]),
        "recordCatalogBindingUsages": sum(len(uses) for uses in refs.values()),
        "regionBindingUsageCount": sum(len(use["regionIds"]) for uses in refs.values() for use in uses),
        "regionBindingUsageCountsByBindingKey": dict(Counter(use["bindingKey"] for uses in refs.values() for use in uses for _region in use["regionIds"])),
        "catalogCountByBindingKey": dict(Counter(use["bindingKey"] for uses in refs.values() for use in uses)),
        "unreferencedCatalogJsonFiles": len(set(catalog_hashes) - set(refs)),
        "catalogsWithRegionRows": len({entry["catalogPath"] for entry in entries}),
        "catalogSourcePages": len({(entry["region"].get("book"), entry["region"].get("printedPage"), entry["region"].get("pdfPage")) for entry in entries}),
        "bookCounts": dict(Counter(entry["region"].get("book", "unknown") for entry in entries)),
        "regionBoundCounts": dict(Counter("normalized-rect-present" if rect_xywh(entry["region"].get("normalizedPageRect")) else "normalized-rect-missing-or-invalid" for entry in entries)),
        "catalogHashesSha256": catalog_hashes,
    }
    return entries, exposed


def render_markdown(report: dict[str, Any]) -> str:
    universe = report["exposedUniverse"]
    counts = report["assessmentCounts"]
    queues = report["reviewQueues"]
    queue = queues["elevatedAndDeclaredControls"] + queues["weakShapeOnly"]
    rows = [
        "# Batch 5 continuation and crop-boundary discovery",
        "",
        f"Baseline commit: `{report['input']['gitCommit']}`. The report covers {universe['catalogFilesReferencedByExposedRecords']} referenced catalog files, {universe['catalogRegionUsageCount']} unique catalog-region rows, {universe['bindingRegionUsageCount']} record-to-region binding uses, {universe['uniqueSourcePageBindings']} distinct source-page triples, and {universe['propertyUniverse']['propertyPointerCount']} scalar/null property pointers.",
        "",
        "Automated boundary and adjacent-flow signals are candidates only. No signal is not a semantic pass. The compressed JSON includes the complete numeric region universe and a compact, lossless property-pointer/source-linkage inventory. It excludes source text, OCR transcripts, PDFs, and image bytes.",
        "",
        "## Universe and assessability",
        "",
        "| Measure | Count |",
        "|---|---:|",
        f"| Catalog JSON files referenced by exposed records | {universe['catalogFilesReferencedByExposedRecords']} |",
        f"| Unique catalog-region rows | {universe['catalogRegionUsageCount']} |",
        f"| Record-to-region binding uses, both binding types | {universe['bindingRegionUsageCount']} |",
        f"| Unique catalog and region IDs | {universe['uniqueCatalogRegionIds']} |",
        f"| Distinct source page bindings | {universe['uniqueSourcePageBindings']} |",
        f"| Exposed property pointers | {universe['propertyUniverse']['propertyPointerCount']} |",
        f"| Mechanics fields (`fieldsFor`, separate denominator) | {universe['propertyUniverse']['mechanicsFieldDenominator']['totalFields']} |",
        f"| Regions with any crop signal (including broad word-box edges) | {counts['regionsWithAnyCropSignal']} |",
        f"| Region word boxes crossing a crop edge | {counts['regionsWithWordBoxCrossing']} |",
        f"| Elevated or declared-control source pages | {counts['elevatedAndDeclaredControlPages']} |",
        f"| Weak-shape-only source pages | {counts['weakShapeOnlyPages']} |",
        f"| Source pages with only word-box edge geometry | {counts['wordBoxGeometryOnlyPages']} |",
        f"| No signal (not a semantic pass) | {counts['regionTextGeometryStatus'].get('assessed', 0) - counts['regionsWithAnyCropSignal']} region assessments |",
        "",
        "Property categories: `" + json.dumps(universe['propertyUniverse']['propertyCategoryCounts'], sort_keys=True) + "`.",
        "Property source linkage: `" + json.dumps(counts['propertyPointersBySourceLinkage'], sort_keys=True) + "`.",
        "Catalog binding categories: `" + json.dumps(report['exposedCatalogSummary']['catalogCountByBindingKey'], sort_keys=True) + "` catalog-record bindings; region usage counts: `" + json.dumps(report['exposedCatalogSummary']['regionBindingUsageCountsByBindingKey'], sort_keys=True) + "`.",
        "Region text-geometry status: `" + json.dumps(counts['regionTextGeometryStatus'], sort_keys=True) + "`.",
        "Heuristic signal types: `" + json.dumps(counts['heuristicSignalCounts'], sort_keys=True) + "`.",
        "",
        "## Source-review queue",
        "",
    ]
    rows.append("Elevated/declared controls are grouped by source page. A same-page or adjacent-page text-shape cue can still be unrelated, and lowercase openings can be intentional source excerpts.")
    for candidate in sorted(queue, key=lambda item: (item.get("book", ""), item.get("printedPagesBound", [0])[0], item.get("pdfPage", 0))):
        pages = ", ".join(str(page) for page in candidate.get("printedPagesBound", []))
        regions = candidate.get("catalogRegionIdsOnSourcePage", [])
        owners = candidate.get("catalogOwnersOnSourcePage", [])
        flow_kinds = sorted({signal["kind"] for signal in candidate.get("adjacentColumnAndPageSignals", [])})
        crop_kinds = sorted({signal for case in candidate.get("regionSignalCaseIds", []) for signal in case.get("signals", [])})
        examples = ", ".join(regions[:4]) + (f" +{len(regions) - 4}" if len(regions) > 4 else "")
        rows.append(f"- **{candidate['book']} p.{pages} (PDF p.{candidate['pdfPage']})** — `{candidate['disposition']}`, strength `{candidate['signalStrength']}`; source owners {len(owners)}, region IDs {len(regions)} ({examples or 'none'}); flow cues `{', '.join(flow_kinds) or 'none'}`, crop cues `{', '.join(crop_kinds) or 'none'}`. Review remains pending.")
    if not queue:
        rows.append("No endpoint or flow source-review case was emitted. This is not a semantic pass.")
    unlinked = [pair for pair in report.get("pairedCropFlowCandidates", []) if pair.get("groupStatus") == "both-current-regions-present-but-no-declared-linked-group"]
    rows += ["", "## Current crops present without a declared linked group", ""]
    if unlinked:
        grouped_pairs = defaultdict(list)
        for pair in unlinked:
            key = (pair["book"], pair["printedPage"], pair["pdfPage"], pair["openingRegion"]["regionId"], pair["continuationRegion"]["regionId"])
            grouped_pairs[key].append(pair)
        for (book, printed_page, pdf_page, opening, continuation), uses in sorted(grouped_pairs.items()):
            owners = sorted({owner for pair in uses for owner in pair["recordBindingOwners"]})
            rows.append(f"- **{book} p.{printed_page} (PDF p.{pdf_page})** — left-bottom `{opening}` followed by right-top `{continuation}`; {len(owners)} exposed record owners share the pair (`{', '.join(owners)}`). The text-layer endpoint/flow shape is a candidate only; no linked continuation group appears in the baseline manifest.")
    else:
        rows.append("No same-catalog left-bottom/right-top pair with an endpoint/flow shape was found outside the declared group list. This is not a semantic pass.")
    rows += [
        "",
        "## Historical controls and source inputs",
        "",
        "Historical Abjure and Charging omissions and the old Animate Object crop remain explicitly listed in `historicalControls`. The Charging printed-p.67 hypothesis is retained as a reviewed negative control; a neighboring-page or open-ending cue cannot establish semantic continuation.",
        "",
        f"The snapshot reports {counts['regionTextGeometryStatus'].get('crop-geometry-missing-or-invalid', 0)} regions without valid normalized crop bounds and {counts['regionTextGeometryStatus'].get('no-usable-text-layer', 0)} with no usable text layer. Source PDF hashes and catalog source-hash comparisons are in `input.sources`; local regeneration requires authorized PDFs. Full numeric evidence: `{report['fullEvidence']['path']}` ({report['fullEvidence']['compressedBytes']:,} compressed bytes, SHA-256 `{report['fullEvidence']['sha256']}`).",
        "",
        "## Limits",
        "",
    ]
    rows.extend(f"- {limit}" for limit in report["limits"])
    rows.append("")
    return "\n".join(rows)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", "--repo-root", type=Path, default=Path(__file__).resolve().parent.parent)
    parser.add_argument("--source-dir", type=Path, required=True, help="Directory containing the five authorized private source PDFs")
    parser.add_argument("--output", type=Path, default=Path("research/source-audit-batch5-continuation-full.json.gz"), help="Full numeric evidence output (gzip JSON)")
    parser.add_argument("--summary", type=Path, default=Path("research/source-audit-batch5-continuation.json"), help="Small hash-bound summary JSON")
    parser.add_argument("--markdown", type=Path, default=Path("research/source-audit-batch5-continuation.md"))
    parser.add_argument("--commit", default="679b15d", help="Input tree commit label to bind into the report")
    args = parser.parse_args(argv)
    root = args.root.resolve()
    actual_commit = subprocess.run(["git", "rev-parse", "HEAD"], cwd=root, capture_output=True, text=True, check=True).stdout.strip()
    if not actual_commit.startswith(args.commit):
        raise RuntimeError(f"--commit {args.commit} does not match repo-root HEAD {actual_commit}")
    source_changes = subprocess.run(["git", "status", "--porcelain", "--", "dist/data.json", "dist/scans", "research/citation-continuations.json"], cwd=root, capture_output=True, text=True, check=True).stdout
    source_tree_mode = "working-tree" if source_changes.strip() else "pinned-git-commit"
    data_path = root / "dist/data.json"
    data_raw = data_path.read_bytes()
    data = json.loads(data_raw)
    catalogs, catalog_summary = build_catalog_inventory(root, data)
    property_data, property_summary = collect_data_properties(data)
    property_summary["mechanicsFieldDenominator"] = mechanics_field_denominator(root)
    report = text_inventory(root, args.source_dir.resolve(), catalogs, property_data, property_summary, actual_commit, data)
    report["exposedCatalogSummary"] = catalog_summary
    report["exposedUniverse"]["catalogFilesReferencedByExposedRecords"] = catalog_summary["catalogFilesReferencedByExposedRecords"]
    report["exposedUniverse"]["catalogFilesUnderScans"] = catalog_summary["catalogJsonFilesUnderScans"]
    report["exposedUniverse"]["catalogRegionRows"] = catalog_summary["catalogRegionRows"]
    report["exposedUniverse"]["catalogRegionUsageCount"] = catalog_summary["catalogRegionRows"]
    report["exposedUniverse"]["bindingRegionUsageCount"] = catalog_summary["regionBindingUsageCount"]
    # Bind precise file inputs; catalog hashes are metadata only, never source text.
    report["input"]["distDataRawFileSha256"] = sha256_bytes(data_raw)
    report["input"]["catalogUniverseSha256"] = sha256_bytes(json.dumps(catalog_summary["catalogHashesSha256"], sort_keys=True, separators=(",", ":")).encode())
    report["input"]["generatorSha256"] = sha256_bytes(Path(__file__).read_bytes())
    report["input"]["generator"] = "tools/continuation-candidates.py"
    report["input"]["sourceTreeMode"] = source_tree_mode
    out_path = args.output if args.output.is_absolute() else root / args.output
    summary_path = args.summary if args.summary.is_absolute() else root / args.summary
    md_path = args.markdown if args.markdown.is_absolute() else root / args.markdown
    out_path.parent.mkdir(parents=True, exist_ok=True)
    summary_path.parent.mkdir(parents=True, exist_ok=True)
    md_path.parent.mkdir(parents=True, exist_ok=True)
    raw_report = (json.dumps(report, separators=(",", ":"), ensure_ascii=False) + "\n").encode()
    compressed = gzip.compress(raw_report, compresslevel=9, mtime=0)
    out_path.write_bytes(compressed)
    report["fullEvidence"] = {
        "path": out_path.name,
        "sha256": sha256_bytes(compressed),
        "rawReportSha256": sha256_bytes(raw_report),
        "compressedBytes": len(compressed),
        "uncompressedBytes": len(raw_report),
        "compression": "gzip, mtime=0, JSON UTF-8",
    }
    def compact_queue(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        compact_rows = []
        for row in rows:
            compact_rows.append({
                "book": row["book"], "printedPagesBound": row["printedPagesBound"], "pdfPage": row["pdfPage"],
                "disposition": row["disposition"], "signalStrength": row["signalStrength"],
                "adjacentColumnAndPageSignals": row["adjacentColumnAndPageSignals"],
                "regionSignalCaseIds": [{"regionId": case["regionId"], "catalog": case["catalog"], "signals": case["signals"]} for case in row["regionSignalCaseIds"]],
                "catalogRegionIdsOnSourcePage": row["catalogRegionIdsOnSourcePage"],
                "catalogOwnersOnSourcePage": row["catalogOwnersOnSourcePage"],
                "recordBindingOwnersOnSourcePage": row["recordBindingOwnersOnSourcePage"],
                "bindingKeysOnSourcePage": row["bindingKeysOnSourcePage"],
            })
        return compact_rows
    summary = {
        "schemaVersion": 1,
        "scope": "Hash-bound batch-5 summary over both exposed catalog binding types, every unique catalog-region row, and the complete property pointer/source-linkage denominator. Full numeric geometry and lossless property tuples are in the compressed evidence file.",
        "input": report["input"],
        "runMode": report["runMode"],
        "sourceFrameCoordinateBridge": report["sourceFrameCoordinateBridge"],
        "privatePdfFrameReplay": report["privatePdfFrameReplay"],
        "fullEvidence": report["fullEvidence"],
        "exposedCatalogSummary": catalog_summary,
        "exposedUniverse": report["exposedUniverse"],
        "assessmentCounts": report["assessmentCounts"],
        "reviewQueues": {key: compact_queue(value) for key, value in report["reviewQueues"].items()},
        "pairedCropFlowCandidates": report["pairedCropFlowCandidates"],
        "historicalControls": report["historicalControls"],
        "limits": report["limits"],
        "validationContract": "Current mode checks the compressed evidence hash, exact data and all catalog hashes/region/image/source bindings, the active pinned nine-frame bridge, per-binding frame-resolution annotations, and registered PDF-page crop bounds. Private PDFs are absent in CI, so text-word geometry is not regenerated there; the registered frame projection is checked against the trusted bridge and candidate semantics remain unresolved.",
    }
    summary_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n")
    md_path.write_text(render_markdown(report))
    print(json.dumps({
        "fullEvidence": str(out_path), "summary": str(summary_path), "markdown": str(md_path),
        "catalogFilesReferenced": catalog_summary["catalogFilesReferencedByExposedRecords"],
        "catalogRegionRows": len(catalogs), "bindingRegionUses": catalog_summary["regionBindingUsageCount"],
        "sourcePages": report["exposedUniverse"]["uniqueSourcePageBindings"],
        "propertyPointers": property_summary["propertyPointerCount"],
        "candidatePages": {key: len(value) for key, value in report["reviewQueues"].items()},
        "unlinkedCropFlowPairs": sum(1 for pair in report["pairedCropFlowCandidates"] if pair["groupStatus"] == "both-current-regions-present-but-no-declared-linked-group"),
        "mechanicsFields": property_summary["mechanicsFieldDenominator"]["totalFields"],
        "compressedBytes": len(compressed), "regionStatuses": report["assessmentCounts"]["regionTextGeometryStatus"],
    }, sort_keys=True))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        print(f"continuation-candidates: {exc}", file=sys.stderr)
        if getattr(exc, "__traceback__", None):
            import traceback
            traceback.print_exc(file=sys.stderr)
        sys.exit(1)
