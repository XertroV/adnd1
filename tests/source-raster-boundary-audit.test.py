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
        }
        catalog_hashes = {catalog_relpath: hashlib.sha256(catalog_bytes).hexdigest()}
        catalog_snapshot = hashlib.sha256(json.dumps(catalog_hashes, separators=(",", ":"), ensure_ascii=False).encode()).hexdigest()
        source_map = {
            "inputDataSha256": hashlib.sha256(data_path.read_bytes()).hexdigest(),
            "catalogSha256": catalog_hashes,
            "catalogSnapshotSha256": catalog_snapshot,
            "sourcePdfSha256": pdf_hashes,
            "usages": [usage],
        }
        source_map_path = root / "source-map.json"
        source_map_path.write_text(json.dumps(source_map))
        return data_root, source_map_path, source_map, usage

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

    def test_missing_source_remains_an_explicit_not_assessable_use(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            data_root, source_map_path, _, _ = self._write_small_live_fixture(root)
            report = audit.build_audit(source_map_path, root / "missing-sources", data_root)
            self.assertEqual(report["counts"]["regionUsages"], 1)
            self.assertEqual(report["counts"]["assessedUsages"], 0)
            self.assertEqual(report["counts"]["notAssessableUsages"], 1)
            self.assertEqual(report["notAssessableUsages"][0]["notAssessableReason"], "source-hash-mismatch-or-source-unavailable")

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
