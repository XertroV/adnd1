"""Numeric regression tests for the source-raster boundary candidate inventory."""
import importlib.util
import hashlib
import io
import json
import sys
import tempfile
import types
import unittest
from pathlib import Path
from contextlib import redirect_stderr
from unittest import mock

import numpy as np

REPO = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "source_raster_boundary_audit", REPO / "research/source-raster-boundary-audit.py"
)
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


class SourceRasterBoundaryTests(unittest.TestCase):
    def setUp(self):
        self.registry_validation = {
            "status": "current-pins-match", "frameGroups": 9,
            "ownerJoinsValidated": 102, "mismatchCount": 0, "mismatches": [],
        }
        self.registry_patcher = mock.patch.object(audit, "validate_live_registry", return_value=self.registry_validation)
        self.registry_patcher.start()
        self.addCleanup(self.registry_patcher.stop)

    def _bridge_declaration(self, count, status):
        return {
            "path": "research/source-frame-coordinate-bridge.json",
            "sha256": audit.REGISTRY_SHA256,
            "status": "scoped-geometric-provenance-only",
            "resolutionCounts": {status: count},
            "registryValidation": self.registry_validation,
        }

    def _write_small_live_fixture(self, root):
        data_root = root / "dist"
        catalog_relpath = "scans/verified/rules-example.json"
        catalog_path = data_root / catalog_relpath
        catalog_path.parent.mkdir(parents=True)
        catalog = {
            "collection": "rules",
            "itemId": "example",
            "sources": {"PHB": {"sha256": "a" * 64}},
            "regions": [{
                "id": "phb-1-example",
                "book": "PHB",
                "printedPage": 1,
                "pdfPage": 2,
                "image": "phb-1-example.png",
                "sha256": "b" * 64,
                "boundsPdfPoints": [10, 10, 20, 20],
            }],
        }
        catalog_bytes = json.dumps(catalog).encode()
        catalog_path.write_bytes(catalog_bytes)
        data = {"rules": [{
            "id": "example",
            "sourceExcerpts": {"catalog": catalog_relpath},
        }]}
        data_root.mkdir(exist_ok=True)
        data_path = data_root / "data.json"
        data_path.write_text(json.dumps(data))
        pdf_hashes = {book: hashlib.sha256(book.encode()).hexdigest() for book in audit.PDF_FILENAMES}
        pdf_hashes["PHB"] = "a" * 64
        usage = {
            "collection": "rules",
            "itemId": "example",
            "binding": "sourceExcerpts",
            "catalog": catalog_relpath,
            "regionId": "phb-1-example",
            "book": "PHB",
            "printedPage": 1,
            "pdfPage": 2,
            "image": "scans/verified/phb-1-example.png",
            "imageSha256": "b" * 64,
            "sourceHashMatches": True,
            "boundsType": "boundsPdfPoints",
            "pdfBounds": [10, 10, 20, 20],
            "coordinateFrameResolution": {
                "status": "outside-bounded-correction-registry",
                "basis": "legacy-diagnostic-projection-retained",
                "reason": "No exact owner/region binding is present in this bounded correction registry; this does not make a claim about separate frame evidence.",
                "correctionRegistryMembership": "outside-this-bounded-correction-registry",
                "resolutionStatus": "legacy-diagnostic-projection-retained; no new frame approval by this registry",
            },
        }
        catalog_hashes = {catalog_relpath: hashlib.sha256(catalog_bytes).hexdigest()}
        catalog_snapshot = hashlib.sha256(json.dumps(catalog_hashes, separators=(",", ":"), ensure_ascii=False).encode()).hexdigest()
        source_map = {
            "inputDataSha256": hashlib.sha256(data_path.read_bytes()).hexdigest(),
            "catalogSha256": catalog_hashes,
            "catalogSnapshotSha256": catalog_snapshot,
            "sourcePdfSha256": pdf_hashes,
            "sourceFrameCoordinateBridge": self._bridge_declaration(1, "outside-bounded-correction-registry"),
            "usages": [usage],
        }
        source_map_path = root / "source-map.json"
        source_map_path.write_text(json.dumps(source_map))
        return data_root, source_map_path, source_map, usage

    def _write_supplemental_fixture(self, root, artifact_id="dmg175-user-confirmed-supplement"):
        data_root = root / "dist"
        catalog_relpath = "scans/verified/rules-supplement.json"
        catalog_path = data_root / catalog_relpath
        catalog_path.parent.mkdir(parents=True)
        source_bytes = b"synthetic authorized source image"
        crop_bytes = b"synthetic published crop"
        source_sha = hashlib.sha256(source_bytes).hexdigest()
        crop_sha = hashlib.sha256(crop_bytes).hexdigest()
        canonical_pdf_sha = "d" * 64
        region = {
            "id": "supplement-region", "book": "DMG", "printedPage": 175, "pdfPage": None,
            "sourceArtifactId": artifact_id, "sourceCropBoundsPx": [10, 20, 40, 60],
            "sourceCoordinateSpace": "supplement-image pixels; top-left origin; LTRB half-open",
            "width": 30, "height": 40, "image": "supplement.png", "sha256": crop_sha,
            "normalizedPageRect": {"x": 0.1, "y": 0.2, "width": 0.3, "height": 0.4},
        }
        catalog = {
            "sources": {"DMG": {"sha256": canonical_pdf_sha}},
            "regions": [region],
        }
        catalog_bytes = json.dumps(catalog).encode()
        catalog_path.write_bytes(catalog_bytes)
        image_path = catalog_path.parent / region["image"]
        image_path.write_bytes(crop_bytes)
        source_dir = root / "sources"
        source_dir.mkdir()
        (source_dir / "dmg175.jpg").write_bytes(source_bytes)
        data = {"rules": [{"id": "supplement", "sourceExcerpts": {"catalog": catalog_relpath}}]}
        data_path = data_root / "data.json"
        data_path.write_text(json.dumps(data))
        pdf_hashes = {book: hashlib.sha256(book.encode()).hexdigest() for book in audit.PDF_FILENAMES}
        pdf_hashes["DMG"] = canonical_pdf_sha
        usage = {
            "collection": "rules", "itemId": "supplement", "binding": "sourceExcerpts",
            "catalog": catalog_relpath, "regionId": region["id"], "book": "DMG",
            "printedPage": 175, "pdfPage": None,
            "image": "scans/verified/supplement.png", "imageSha256": crop_sha,
            "sourceHashMatches": True, "boundsType": "object", "pdfBounds": None,
            "sourceKind": "supplemental-image", "sourceArtifactId": artifact_id,
            "sourceSha256": source_sha, "sourceArtifactSha256": source_sha,
            "canonicalPdfSha256": canonical_pdf_sha, "sourcePdfSha256": canonical_pdf_sha,
            "canonicalPdfContainsPrintedPage": False, "sourceFrameDimensionsPx": [100, 100],
            "sourceCropBoundsPx": [10, 20, 40, 60],
            "sourceCoordinateSpace": "supplement-image pixels; top-left origin; LTRB half-open",
            "sourceArtifactHashMatches": True, "normalizedImageRectMatches": True,
            "notAssessableReason": audit.SUPPLEMENTAL_NA_REASON,
            "coordinateFrameResolution": {"status": "not-applicable-supplemental-image-frame", "basis": "unassessable"},
        }
        catalog_hashes = {catalog_relpath: hashlib.sha256(catalog_bytes).hexdigest()}
        source_map = {
            "inputDataSha256": hashlib.sha256(data_path.read_bytes()).hexdigest(),
            "catalogSha256": catalog_hashes,
            "catalogSnapshotSha256": hashlib.sha256(json.dumps(catalog_hashes, separators=(",", ":"), ensure_ascii=False).encode()).hexdigest(),
            "sourcePdfSha256": pdf_hashes,
            "sourceFrameCoordinateBridge": self._bridge_declaration(1, "not-applicable-supplemental-image-frame"),
            "usages": [usage],
        }
        source_map_path = root / "source-map.json"
        source_map_path.write_text(json.dumps(source_map))
        identity = {
            "valid": True, "sourceKind": "supplemental-image", "sourceArtifactId": "dmg175-user-confirmed-supplement",
            "sourceSha256": source_sha, "canonicalPdfSha256": canonical_pdf_sha,
            "sourceDimensionsPx": [100, 100], "sourceCropBoundsPx": [10, 20, 40, 60],
            "sourceCoordinateSpace": "supplement-image pixels; top-left origin; LTRB half-open",
        }
        return data_root, source_map_path, source_map, source_dir, identity

    def test_rejects_empty_catalog_and_usage_map_against_live_data(self):
        """A self-consistent empty map must not turn live catalog coverage into zero uses."""
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            data_root, usage_map_path, source_map, _ = self._write_small_live_fixture(root)
            source_map["catalogSha256"] = {}
            source_map["catalogSnapshotSha256"] = hashlib.sha256(b"{}").hexdigest()
            source_map["usages"] = []
            usage_map_path.write_text(json.dumps(source_map))

            with self.assertRaisesRegex(ValueError, "catalog"):
                audit.build_audit(usage_map_path, root / "missing-sources", data_root)

    def test_rejects_missing_duplicate_extra_and_changed_source_identity_rows(self):
        mutations = {
            "missing": lambda rows: [],
            "duplicate": lambda rows: rows + [dict(rows[0])],
            "extra": lambda rows: rows + [{**rows[0], "regionId": "phb-2-extra"}],
            "source identity": lambda rows: [{**rows[0], "book": "UA"}],
        }
        for label, mutate in mutations.items():
            with self.subTest(label=label), tempfile.TemporaryDirectory() as temp:
                root = Path(temp)
                data_root, source_map_path, source_map, _ = self._write_small_live_fixture(root)
                source_map["usages"] = mutate(source_map["usages"])
                source_map_path.write_text(json.dumps(source_map))
                with self.assertRaisesRegex(ValueError, "multiset"):
                    audit.reconcile_live_catalog_usage(source_map, data_root, source_map_path, {})

    def test_rejects_catalog_hash_and_source_hash_identity_mismatch(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            data_root, source_map_path, source_map, _ = self._write_small_live_fixture(root)
            source_map["catalogSha256"]["scans/verified/rules-example.json"] = "0" * 64
            source_map_path.write_text(json.dumps(source_map))
            with self.assertRaisesRegex(ValueError, "catalog SHA mismatch"):
                audit.reconcile_live_catalog_usage(source_map, data_root, source_map_path, {})

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            data_root, source_map_path, source_map, _ = self._write_small_live_fixture(root)
            source_map["sourcePdfSha256"]["PHB"] = "c" * 64
            source_map_path.write_text(json.dumps(source_map))
            with self.assertRaisesRegex(ValueError, "multiset"):
                audit.reconcile_live_catalog_usage(source_map, data_root, source_map_path, {})

    def test_rejects_supplemental_identity_forged_onto_pdf_region(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            data_root, source_map_path, source_map, _ = self._write_small_live_fixture(root)
            source_map["usages"][0]["sourceKind"] = "supplemental-image"
            source_map["usages"][0]["sourceArtifactId"] = "dmg175-user-confirmed-supplement"
            source_map_path.write_text(json.dumps(source_map))
            with self.assertRaisesRegex(ValueError, "assigns a supplemental identity"):
                audit.reconcile_live_catalog_usage(source_map, data_root, source_map_path, {})

    def test_missing_source_remains_an_explicit_not_assessable_use(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            data_root, source_map_path, _, _ = self._write_small_live_fixture(root)
            report = audit.build_audit(source_map_path, root / "missing-sources", data_root)
            self.assertEqual(report["counts"]["regionUsages"], 1)
            self.assertEqual(report["counts"]["assessedUsages"], 0)
            self.assertEqual(report["counts"]["notAssessableUsages"], 1)
            self.assertEqual(report["notAssessableUsages"][0]["notAssessableReason"], "source-hash-mismatch-or-source-unavailable")

    def test_supplemental_image_is_preserved_as_typed_pdf_raster_na(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            data_root, source_map_path, _, source_dir, identity = self._write_supplemental_fixture(root)
            with mock.patch.object(audit, "supplemental_region_identity", return_value=identity):
                report = audit.build_audit(source_map_path, source_dir, data_root)
            self.assertEqual(report["counts"]["regionUsages"], 1)
            self.assertEqual(report["counts"]["notAssessableUsages"], 1)
            self.assertEqual(report["counts"]["assessedUsages"], 0)
            self.assertEqual(report["sourceFrames"], [])
            row = report["notAssessableUsages"][0]
            self.assertEqual(row["notAssessableReason"], audit.SUPPLEMENTAL_NA_REASON)
            self.assertEqual(row["sourceKind"], "supplemental-image")
            self.assertEqual(row["sourceArtifactId"], "dmg175-user-confirmed-supplement")
            self.assertEqual(row["sourceArtifactSha256"], identity["sourceSha256"])
            self.assertEqual(row["sourcePdfSha256"], identity["canonicalPdfSha256"])
            self.assertIsNone(row["pdfPage"])

    def test_supplemental_identity_rejects_corrupt_source_crop_and_unknown_artifact(self):
        for case in ("source", "crop", "unknown-artifact"):
            with self.subTest(case=case), tempfile.TemporaryDirectory() as temp:
                root = Path(temp)
                data_root, source_map_path, source_map, source_dir, identity = self._write_supplemental_fixture(root)
                catalog_path = data_root / "scans/verified/rules-supplement.json"
                if case == "source":
                    (source_dir / "dmg175.jpg").write_bytes(b"changed source bytes")
                elif case == "crop":
                    (data_root / "scans/verified/supplement.png").write_bytes(b"changed crop bytes")
                else:
                    catalog = json.loads(catalog_path.read_text())
                    catalog["regions"][0]["sourceArtifactId"] = "unrecognized-supplement"
                    catalog_bytes = json.dumps(catalog).encode()
                    catalog_path.write_bytes(catalog_bytes)
                    source_map["catalogSha256"]["scans/verified/rules-supplement.json"] = hashlib.sha256(catalog_bytes).hexdigest()
                    source_map["catalogSnapshotSha256"] = hashlib.sha256(json.dumps(source_map["catalogSha256"], separators=(",", ":"), ensure_ascii=False).encode()).hexdigest()
                    source_map["usages"][0]["sourceArtifactId"] = "unrecognized-supplement"
                    source_map_path.write_text(json.dumps(source_map))
                with mock.patch.object(audit, "supplemental_region_identity", return_value=identity):
                    expected = "unknown supplemental" if case == "unknown-artifact" else "SHA mismatch"
                    with self.assertRaisesRegex(ValueError, expected):
                        audit.reconcile_live_catalog_usage(source_map, data_root, source_map_path, {}, source_dir)

    def test_cli_refuses_to_overwrite_existing_immutable_output(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            output_path = root / "already-published.json.gz"
            output_path.write_bytes(b"preserve-this")
            with mock.patch.object(audit, "build_audit", side_effect=AssertionError("must not scan before refusing overwrite")) as build:
                with redirect_stderr(io.StringIO()):
                    with self.assertRaises(SystemExit) as raised:
                        audit.main([
                            "--source-dir", str(root / "missing-sources"),
                            "--source-usage-map", str(root / "missing-map.json"),
                            "--output", str(output_path),
                        ])
            self.assertEqual(raised.exception.code, 2)
            build.assert_not_called()
            self.assertEqual(output_path.read_bytes(), b"preserve-this")

    def test_current_bridge_is_required_and_registered_windows_are_replayed_without_private_pdfs(self):
        current_path = REPO / "research/source-visual-audit-current-a46-frame-guard.json"
        if not current_path.is_file():
            self.skipTest("current frame-bridge source map has not been generated")
        original = json.loads(current_path.read_text())
        data_root = REPO / "dist"
        bridge = audit.load_registry()

        def check(candidate, message):
            with tempfile.TemporaryDirectory() as temp:
                map_path = Path(temp) / "source-map.json"
                map_path.write_text(json.dumps(candidate))
                receipt_rows = {row["regionId"]: row for row in original["usages"] if row.get("sourceKind") == "supplemental-image"}
                def supplemental_receipt(_catalog, region, *_args):
                    row = receipt_rows[region["id"]]
                    return {key: row[key] for key in (
                        "sourceKind", "sourceArtifactId", "sourceArtifactSha256", "sourcePdfSha256",
                        "canonicalPdfSha256", "sourceFrameDimensionsPx", "sourceCropBoundsPx", "sourceCoordinateSpace")}
                with mock.patch.object(audit, "_supplemental_region_receipt", side_effect=supplemental_receipt):
                    with self.assertRaisesRegex(ValueError, message):
                        audit.reconcile_live_catalog_usage(candidate, data_root, map_path, {}, Path(temp))

        for value in (None, False):
            changed = json.loads(json.dumps(original))
            changed["sourceFrameCoordinateBridge"] = value
            with self.subTest(declaration=value):
                check(changed, "missing the active source-frame bridge declaration")
        changed = json.loads(json.dumps(original))
        del changed["sourceFrameCoordinateBridge"]
        check(changed, "missing the active source-frame bridge declaration")

        changed = json.loads(json.dumps(original))
        changed["usages"][0].pop("coordinateFrameResolution", None)
        check(changed, "multiset mismatch")

        changed = json.loads(json.dumps(original))
        row = next(row for row in changed["usages"] if row.get("coordinateFrameResolution", {}).get("status") == "matched" and row.get("printedPage") == 27)
        catalog = json.loads((data_root / row["catalog"]).read_text())
        region = next(region for region in catalog["regions"] if region.get("id") == row["regionId"])
        frame = next(frame for frame in bridge["frames"] if frame["book"] == "PHB" and frame["printedPage"] == 27)
        raw_rect = region["normalizedPageRect"]
        rect = ([raw_rect["x"], raw_rect["y"], raw_rect.get("width", raw_rect.get("w")), raw_rect.get("height", raw_rect.get("h"))]
                if isinstance(raw_rect, dict) else raw_rect)
        page = frame["pdfBoxesPoints"]["pageRect"]
        row["pdfBounds"] = [round(rect[0] * page[2], 4), round(rect[1] * page[3], 4), round((rect[0] + rect[2]) * page[2], 4), round((rect[1] + rect[3]) * page[3], 4)]
        check(changed, "registered frame bounds mismatch")

    def test_components_cross_each_edge(self):
        gray = np.full((64, 64), 255, dtype=np.uint8)
        gray[24:30, 14:18] = 40  # left boundary x=16
        gray[34:40, 46:50] = 40  # right boundary x=48
        gray[14:18, 24:30] = 40  # top boundary y=16
        gray[46:50, 34:40] = 40  # bottom boundary y=48
        result = audit.scan_edge_bands(gray, [16, 16, 48, 48], band_px=8)
        self.assertTrue(result["crossingComponentCandidate"])
        for edge in ("left", "right", "top", "bottom"):
            self.assertGreater(result["edges"][edge]["crossingComponentCountLt254"], 0)
            self.assertGreater(result["edges"][edge]["crossingComponentCountWithMinGrayLt230"], 0)
            self.assertGreater(result["edges"][edge]["outsideInkPixels"]["lt180"], 0)
            self.assertGreater(result["edges"][edge]["insideInkPixels"]["lt180"], 0)
        self.assertTrue(result["strongCrossingComponentCandidate"])
        self.assertEqual(result["semanticReviewStatus"], "unresolved-requires-source-review")

    def test_faint_crossing_remains_distinct_from_strong_candidate(self):
        gray = np.full((40, 40), 255, dtype=np.uint8)
        gray[15:19, 7:13] = 240  # crossing crop boundary x=10, but faint only
        result = audit.scan_edge_bands(gray, [10, 10, 30, 30], band_px=8)
        left = result["edges"]["left"]
        self.assertEqual(left["crossingComponentCountLt254"], 1)
        self.assertEqual(left["crossingComponentCountWithMinGrayLt230"], 0)
        self.assertEqual(left["faintCrossingComponentCountMinGray230To253"], 1)
        self.assertTrue(result["crossingComponentCandidate"])
        self.assertFalse(result["strongCrossingComponentCandidate"])

    def test_outside_only_component_is_retained(self):
        gray = np.full((40, 40), 255, dtype=np.uint8)
        gray[12:18, 5:9] = 150  # wholly left of crop x=10
        result = audit.scan_edge_bands(gray, [10, 10, 30, 30], band_px=8)
        left = result["edges"]["left"]
        self.assertEqual(left["crossingComponentCountLt254"], 0)
        self.assertGreaterEqual(left["outsideOnlyComponentCountLt254"], 1)
        self.assertGreater(left["outsideInkPixels"]["lt180"], 0)
        self.assertEqual(result["semanticReviewStatus"], "unresolved-requires-source-review")

    def test_empty_band_is_not_a_semantic_pass(self):
        gray = np.full((40, 40), 255, dtype=np.uint8)
        result = audit.scan_edge_bands(gray, [10, 10, 30, 30], band_px=4)
        self.assertEqual(result["edgeStatus"], "no-near-edge-component-at-configured-threshold")
        self.assertFalse(result["crossingComponentCandidate"])
        self.assertEqual(result["semanticReviewStatus"], "unresolved-requires-source-review")

    def test_missing_geometry_stays_not_assessable(self):
        page = types.SimpleNamespace(rect=types.SimpleNamespace(width=100, height=100))
        pix = types.SimpleNamespace(x=0, y=0, width=417, height=417)
        self.assertEqual(audit.rect_to_pixels(None, page, pix, 300), (None, "missing-geometry"))
        self.assertEqual(audit.rect_to_pixels([0, 0, 101, 50], page, pix, 300), (None, "out-of-page-geometry"))

    def test_three_frozen_prefix_positives_and_two_revised_boundary_controls(self):
        fixture_path = REPO / "tests/fixtures/source-raster-boundary-calibration.json"
        fixture = json.loads(fixture_path.read_text())
        targets = audit._calibration_targets()
        self.assertEqual(len(fixture["positivePrefixCutCases"]), 3)
        self.assertEqual(len(fixture["revisedBoundaryNegativeControls"]), 2)
        expected_positive = {row["targetId"] for row in fixture["positivePrefixCutCases"]}
        expected_negative = {row["targetId"] for row in fixture["revisedBoundaryNegativeControls"]}
        self.assertEqual({target_id for target_id, role, _ in targets if role == "prefix-cut-positive"}, expected_positive)
        self.assertEqual({target_id for target_id, role, _ in targets if role == "revised-crop-negative-control"}, expected_negative)
        for case in fixture["positivePrefixCutCases"]:
            self.assertEqual(case["sourcePdfSha256"], fixture["sourcePdfSha256"])
            self.assertEqual(case["cropBoundsPdfPagePointsLTRB"][0], 25)
            self.assertEqual(case["cropBoundsRasterPixelsLTRB"][0], 104)
            self.assertLess(case["excludedInkPixelBounds"][0], case["cropBoundsRasterPixelsLTRB"][0])
            self.assertGreater(case["outsideInkPixelsLt254"], 0)
            self.assertGreater(case["insideInkPixelsLt254"], 0)
        for case in fixture["revisedBoundaryNegativeControls"]:
            self.assertGreater(case["priorBottomOutsideInkPixelsLt230"], 0)
            self.assertGreater(case["priorBottomInsideInkPixelsLt230"], 0)
            self.assertEqual(case["revisedBottomOutsideInkPixelsLt230"], 0)
            self.assertEqual(case["revisedBottomInsideInkPixelsLt230"], 0)


if __name__ == "__main__":
    unittest.main()
