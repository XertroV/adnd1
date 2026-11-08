import importlib.util
import hashlib
import json
import os
import unittest
from pathlib import Path
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parent.parent
MODULE_PATH = ROOT / "tools/continuation-candidates.py"
spec = importlib.util.spec_from_file_location("continuation_candidates", MODULE_PATH)
detector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(detector)


class ContinuationCandidateFixtures(unittest.TestCase):
    def test_user_confirmed_supplemental_page_has_typed_identity_not_pdf_page_status(self):
        catalog = json.loads((ROOT / "dist/scans/verified/rules-encounter-types.json").read_text())
        regions = [region for region in catalog["regions"] if region.get("printedPage") == 175]
        self.assertEqual(len(regions), 2)
        for region in regions:
            identity = detector.supplemental_region_identity(catalog, region)
            self.assertIsNotNone(identity)
            self.assertTrue(identity["valid"])
            self.assertEqual(identity["sourceKind"], "supplemental-image")
            self.assertEqual(identity["sourceArtifactId"], "dmg175-user-confirmed-supplement")
            self.assertEqual(identity["sourceSha256"], "e4acdde4a9fed34ae4c60945db53a37e9e7d1b3682f967bc83ccc481e63e5ba7")
            self.assertEqual(identity["canonicalPdfSha256"], catalog["sources"]["DMG"]["sha256"])
            self.assertEqual(identity["sourceDimensionsPx"], [1329, 1796])
            self.assertIsNone(region["pdfPage"])

        ordinary = json.loads((ROOT / "dist/scans/verified/spells-phb-cleric-animate-object.json").read_text())
        pdf_region = next(region for region in ordinary["regions"] if region.get("pdfPage") is not None)
        self.assertIsNone(detector.supplemental_region_identity(ordinary, pdf_region))

        for field, value in [
            ("sourceArtifactId", "unknown-artifact"),
            ("sourceArtifactId", None),
            ("sourceArtifactId", {"id": "dmg175-user-confirmed-supplement"}),
            ("sourceCropBoundsPx", [0, 0, 635, 490]),
            ("sourceCropBoundsPx", [1250, 1700, 1400, 1800]),
            ("sourceCoordinateSpace", "PDF page points"),
            ("pdfPage", 176),
        ]:
            changed = dict(regions[0])
            changed[field] = value
            rejected = detector.supplemental_region_identity(catalog, changed)
            self.assertIsNotNone(rejected, field)
            self.assertFalse(rejected["valid"], field)

    def test_pdf_crop_flow_grouping_keeps_null_page_supplements_out_of_pdf_sort(self):
        entries = [
            {"region": {"book": "DMG", "printedPage": 175, "pdfPage": None}, "catalogPath": "scans/verified/rules-encounter-types.json"},
            {"region": {"book": "DMG", "printedPage": 76, "pdfPage": 77}, "catalogPath": "scans/verified/rules-example.pdf-crop.json"},
        ]
        self.assertEqual(detector.linked_crop_flow_candidates(ROOT, entries, {}), [])

    def test_historical_ua60_contingency_crop_clips_left_edge_and_candidate_extent_clears_it(self):
        receipt = json.loads((ROOT / "research/source-audit-batch5-continuation-integration.json").read_text())
        case = receipt["historicalCropRegression"]
        self.assertEqual(case["historicalTree"]["gitCommit"], "679b15d1c580172e54314829c1c3c86dc78b65f3")
        old = case["historicalTree"]["normalizedPageRect"]
        corrected = case["candidateRender"]["normalizedPageRect"]
        calibration = case["localSourceGeometryCalibration"]
        old_page_rect = calibration["oldCropRectPoints"]
        new_page_rect = calibration["candidateCropRectPoints"]
        for item in calibration["selectedLeftEdgeWordBoxes"]:
            box = item["bboxPoints"]
            self.assertIn("left", detector.box_crossing_edges(box, old_page_rect))
            self.assertNotIn("left", detector.box_crossing_edges(box, new_page_rect))
        self.assertEqual(calibration["legacyAlgorithmCrossingCounts"]["historicalCrop"]["left"], 68)
        self.assertEqual(calibration["legacyAlgorithmCrossingCounts"]["repairedCrop"]["left"], 0)
        self.assertEqual(calibration["orthogonalIntersectionCrossingCounts"]["historicalCrop"]["left"], 30)
        self.assertEqual(calibration["orthogonalIntersectionCrossingCounts"]["repairedCrop"], {"left": 0, "right": 0, "top": 0, "bottom": 0})
        self.assertEqual(old, [0.04, 0.035, 0.45, 0.4])
        self.assertEqual(corrected, [0.03, 0.035, 0.46, 0.4])
        pixels = case["sourcePixelReview"]
        self.assertEqual(pixels["historicalCropPixels"]["inkPixelsAtLeftmostColumn"], 162)
        self.assertEqual(pixels["repairedCropPixels"]["inkPixelsAtLeftmostColumn"], 0)
        self.assertEqual(pixels["repairedCropPixels"]["leftInsetPixels"], 6)
        self.assertEqual(pixels["repairedCropPixels"]["rightInsetPixels"], 17)
        self.assertEqual(pixels["repairedCropPixels"]["topInsetPixels"], 3)
        self.assertEqual(pixels["repairedCropPixels"]["bottomInsetPixels"], 9)
        dispositions = case["remainingGeometrySignalDispositions"]
        self.assertEqual(dispositions["right"]["legacyAlgorithmRawCount"], 1)
        self.assertEqual(dispositions["right"]["orthogonalIntersectionCount"], 0)
        self.assertGreater(dispositions["right"]["minimumVerticalGapPoints"], 400)
        self.assertEqual(dispositions["top"]["legacyAlgorithmRawCount"], 12)
        self.assertEqual(dispositions["top"]["orthogonalIntersectionCount"], 0)
        self.assertGreater(dispositions["top"]["minimumHorizontalGapPoints"], 16)
        self.assertEqual(dispositions["bottom"]["legacyAlgorithmRawCount"], 12)
        self.assertEqual(dispositions["bottom"]["orthogonalIntersectionCount"], 0)
        self.assertGreater(dispositions["bottom"]["minimumHorizontalGapPoints"], 15)
        self.assertEqual(dispositions["left"]["legacyAlgorithmRawCount"], 0)
        self.assertEqual(dispositions["left"]["orthogonalIntersectionCount"], 0)
        for edge in ("right", "top", "bottom"):
            for item in dispositions[edge]["legacyAlgorithmWordBoxes"]:
                box = item["bboxPoints"]
                self.assertIn(edge, detector.legacy_box_crossing_edges(box, new_page_rect))
                self.assertNotIn(edge, detector.box_crossing_edges(box, new_page_rect))

    def test_historical_animate_object_old_crop_crosses_right_edge_but_corrected_crop_does_not(self):
        calibration = json.loads((ROOT / "research/citation-regression-calibration.json").read_text())
        case = next(item for item in calibration["clippingCases"] if item["id"] == "animate-object-phb51-right-edge-words")
        old = case["oldCrop"]["values"]
        corrected = case["correctedCrop"]["values"]
        boxes = case["sourceTextWordBoxes"]
        old_edges = [detector.box_crossing_edges(box, old) for box in boxes]
        new_edges = [detector.box_crossing_edges(box, corrected) for box in boxes]
        self.assertTrue(all("right" in edges for edges in old_edges))
        self.assertEqual(new_edges, [[], [], []])

    def test_exact_touch_is_not_a_crossing(self):
        self.assertEqual(detector.box_crossing_edges([10, 10, 20, 20], [0, 0, 10, 20]), [])
        self.assertEqual(detector.box_crossing_edges([10, 10, 20, 20], [0, 0, 20, 10]), [])

    def test_legacy_axis_only_cues_are_preserved_but_orthogonal_intersection_is_required(self):
        crop = [10, 10, 20, 20]
        top_box_outside_horizontal_span = [30, 0, 40, 15]
        bottom_box_outside_horizontal_span = [30, 15, 40, 25]
        right_box_outside_vertical_span = [15, 30, 25, 40]
        for edge, box in [
            ("top", top_box_outside_horizontal_span),
            ("bottom", bottom_box_outside_horizontal_span),
            ("right", right_box_outside_vertical_span),
        ]:
            self.assertIn(edge, detector.legacy_box_crossing_edges(box, crop))
            self.assertNotIn(edge, detector.box_crossing_edges(box, crop))

    def test_abjure_hyphen_and_phb70_connector_classification(self):
        self.assertEqual(detector.ending_class("return a creature from another plane of ex-"), "hyphenated-fragment")
        self.assertEqual(detector.ending_class("with respect to"), "dangling-connector")
        self.assertEqual(detector.ending_class("The spell is complete."), "terminal-punctuation")
        self.assertEqual(detector.ending_class("37"), "not-prose-or-empty")

    def test_same_page_columns_carry_endpoint_and_lowercase_shape_without_semantic_claim(self):
        page = SimpleNamespace(width=500, height=700)
        left = {"block": 0, "line": 0, "box": [10, 650, 250, 661], "text": "... with respect to", "column": 0}
        right = {"block": 1, "line": 0, "box": [260, 40, 490, 51], "text": "noises normal to it", "column": 1}
        result = detector.page_flow_signals([left, right], page)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["kind"], "same-page-column-opening-candidate")
        self.assertEqual(result[0]["confidence"], "elevated-geometry-plus-endpoint-cue")
        self.assertTrue(result[0]["semanticReviewRequired"])

    def test_local_animate_object_crop_extracts_endpoint_and_edge_geometry(self):
        source_dir = os.environ.get("ADND1_PRIVATE_SOURCE_DIR")
        if not source_dir:
            self.skipTest("authorized source PDF is absent in this CI environment")
        source = Path(source_dir) / "tsr2010-players-handbook.pdf"
        if not source.exists():
            self.skipTest("authorized source PDF is absent in this CI environment")
        import fitz
        document = fitz.open(source)
        page = document[51]
        words = detector.pdf_words(page)
        row = json.loads((ROOT / "dist/scans/verified/spells-phb-cleric-animate-object.json").read_text())
        self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(), row["sources"]["PHB"]["sha256"])
        region = next(region for region in row["regions"] if region["printedPage"] == 51)
        x, y, width, height = detector.rect_xywh(region["normalizedPageRect"])
        crop = (x * page.rect.width, y * page.rect.height, (x + width) * page.rect.width, (y + height) * page.rect.height)
        result = detector.crop_word_geometry(words, crop)
        # Even for a previously source-reviewed crop, source text shape and
        # crossing boxes remain detector evidence only; unpunctuated does not
        # establish that a passage continues or is incomplete.
        self.assertEqual(result["endClass"], "unpunctuated")
        self.assertGreater(result["lineCount"], 0)
        calibration = json.loads((ROOT / "research/citation-regression-calibration.json").read_text())
        case = next(item for item in calibration["clippingCases"] if item["id"] == "animate-object-phb51-right-edge-words")
        historical = detector.crop_word_geometry(words, case["oldCrop"]["values"])
        self.assertGreater(len(historical["crossings"]), 0, "the archived clipped crop remains a positive regression")
        self.assertEqual(result["crossings"], [], "the current corrected crop must not inherit the historical failure")


if __name__ == "__main__":
    unittest.main(verbosity=2)
