"""Replay the saved actual-current downgrade with standard-library-only inputs.

Numeric PDF page rectangles stand in for rendering objects. The two separately
supplied image identities use their frozen numeric receipts; this test does not
read source pixels or repeat the private-PDF review.
"""
import gzip
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile
import types

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "tests/fixtures"
fixture = json.loads(gzip.decompress((FIXTURES / "source-frame-current-guard-before-code.json.gz").read_bytes()))
raw = gzip.decompress((FIXTURES / "source-frame-accepted-downgrade-before.json.gz").read_bytes())
assert hashlib.sha256(raw).hexdigest() == fixture["actualMapRawSha256"]
source_map = json.loads(raw)

# Only reconciliation is exercised. None of the rendering APIs is called.
sys.modules["fitz"] = types.SimpleNamespace()
sys.modules["numpy"] = types.SimpleNamespace(ones=lambda *_args, **_kwargs: None, uint8=object)
scipy = types.ModuleType("scipy")
scipy.ndimage = types.SimpleNamespace()
sys.modules["scipy"] = scipy


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class NumericRect(tuple):
    x0 = property(lambda self: self[0])
    y0 = property(lambda self: self[1])
    x1 = property(lambda self: self[2])
    y1 = property(lambda self: self[3])
    width = property(lambda self: self[2] - self[0])
    height = property(lambda self: self[3] - self[1])


with tempfile.TemporaryDirectory(prefix="source-frame-current-before-") as temp:
    sandbox = Path(temp)
    for key, path in (("pythonRaster", "research/source-raster-boundary-audit.py"),
                      ("pythonBridge", "research/source_frame_coordinate_bridge.py"),
                      ("pythonContinuation", "tools/continuation-candidates.py")):
        saved = fixture["beforeCode"][key]
        code = saved["utf8"].encode()
        assert hashlib.sha256(code).hexdigest() == saved["sha256"]
        destination = sandbox / path
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(code)

    # Read exact public Git objects instead of depending on the future live tree.
    paths = ["dist/data.json", "dist/books.js"] + ["dist/" + path for path in source_map["catalogSha256"]]
    archive = subprocess.check_output(["git", "archive", fixture["inputCommit"], *paths], cwd=ROOT)
    with tarfile.open(fileobj=io.BytesIO(archive)) as stored:
        for member in stored.getmembers():
            if not member.isfile():
                continue
            assert member.name.startswith("dist/") and ".." not in Path(member.name).parts
            destination = sandbox / member.name
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(stored.extractfile(member).read())
    assert hashlib.sha256((sandbox / "dist/data.json").read_bytes()).hexdigest() == source_map["inputDataSha256"]

    pdfs = {}
    for book, count in fixture["pageCounts"].items():
        pages = [None] * count
        for number, points in fixture["pageRectPointsByBookAndPdfPage"][book].items():
            pages[int(number) - 1] = types.SimpleNamespace(rect=NumericRect(points))
        pdfs[book] = pages

    supplemental_rows = {row["regionId"]: row for row in source_map["usages"] if row.get("sourceKind") == "supplemental-image"}

    def supplemental_receipt(_catalog, region, *_args):
        row = supplemental_rows[region["id"]]
        return {key: row[key] for key in (
            "sourceKind", "sourceArtifactId", "sourceArtifactSha256", "sourcePdfSha256",
            "canonicalPdfSha256", "sourceFrameDimensionsPx", "sourceCropBoundsPx",
            "sourceCoordinateSpace", "canonicalPdfContainsPrintedPage")}

    before = load_module("preserved_source_frame_raster_before", sandbox / "research/source-raster-boundary-audit.py")
    before._supplemental_region_receipt = supplemental_receipt
    accepted = before.reconcile_live_catalog_usage(source_map, sandbox / "dist", sandbox / "actual-map.json", pdfs, sandbox)
    assert len(accepted) == fixture["counts"]["catalogs"] == 1020

    current = load_module("current_source_frame_raster_guard", ROOT / "research/source-raster-boundary-audit.py")
    try:
        current.reconcile_live_catalog_usage(source_map, sandbox / "dist", sandbox / "actual-map.json", pdfs, sandbox)
    except ValueError as error:
        assert "missing the active source-frame bridge declaration" in str(error), str(error)
        rejected_reason = str(error)
    else:
        raise AssertionError("the current guard accepted the exact saved a46 downgrade")

    bridge = current._frame_bridge
    changed = 0
    for row in fixture["registeredRows"]:
        boxes = row["pdfBoxesPoints"]
        points, status = bridge.normalized_rect_to_page_points(
            row["normalizedPageRect"], row["resolution"]["basis"],
            boxes["pageRect"], boxes["cropBox"], boxes["mediaBox"])
        assert status == "assessable" and points == row["correctBounds"]
        changed += points != row["legacyBounds"]
    assert changed == fixture["counts"]["registeredChangedBounds"] == 11

print(json.dumps({"classification": "executed-prospective-current-input-mutation",
                  "beforeAcceptedCatalogs": len(accepted), "usageCount": len(source_map["usages"]),
                  "registeredJoins": len(fixture["registeredRows"]), "knownWrongLegacyWindows": changed,
                  "currentRejectedReason": rejected_reason,
                  "sourcePixelsOrSemanticReviewPerformed": False}))
