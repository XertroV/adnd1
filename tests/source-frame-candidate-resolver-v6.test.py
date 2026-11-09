"""Calibrate exact full-page template search and bounded DPI generation."""
import importlib.util
import unittest
from pathlib import Path
from types import SimpleNamespace

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("source_frame_candidate_resolver_v6", ROOT / "tools/source-frame-candidate-resolver-v6.py")
V6 = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(V6)


class SourceFrameCandidateResolverV6Tests(unittest.TestCase):
    def test_exact_subimage_search_finds_measured_integer_bounds(self):
        full = Image.new("RGB", (64, 48), "white")
        draw = ImageDraw.Draw(full)
        draw.rectangle((12, 9, 40, 30), fill=(12, 35, 80))
        draw.line((13, 10, 39, 29), fill=(255, 0, 0), width=2)
        target = full.crop((12, 9, 41, 31))
        result = V6.exact_template_positions(full, target)
        self.assertTrue(result["exactRgbTemplateFound"])
        self.assertIn([12, 9], result["matches"])

    def test_single_channel_mutation_is_not_a_template_match(self):
        full = Image.new("RGB", (12, 10), (40, 60, 80))
        for y in range(2, 7):
            for x in range(3, 9):
                full.putpixel((x, y), (x * 11, y * 17, (x + y) * 9))
        target = full.crop((3, 2, 9, 7))
        target.putpixel((1, 1), (0, 0, 0))
        self.assertFalse(V6.exact_template_positions(full, target)["exactRgbTemplateFound"])

    def test_all_occurrences_are_reported_for_repeated_exact_template(self):
        target = Image.new("RGB", (3, 2))
        target.putdata([(1, 2, 3), (4, 5, 6), (7, 8, 9), (9, 8, 7), (6, 5, 4), (3, 2, 1)])
        full = Image.new("RGB", (12, 6), (255, 255, 255))
        full.paste(target, (1, 1))
        full.paste(target, (7, 3))
        result = V6.exact_template_positions(full, target)
        self.assertEqual(result["matches"], [[1, 1], [7, 3]])
        self.assertEqual(result["matchCount"], 2)

    def test_zero_comparison_scale_candidates_are_target_derived_and_bounded(self):
        page = SimpleNamespace(rect=SimpleNamespace(width=612, height=792))
        scale = V6.normalized_scale_dpis(page, [0.03, 0.2, 0.94, 0.4], (1200, 640))
        expected_width = 1200 * 72 / (0.94 * 612)
        expected_height = 640 * 72 / (0.4 * 792)
        self.assertAlmostEqual(scale["perAxisDpiEstimates"]["width"], expected_width)
        self.assertAlmostEqual(scale["perAxisDpiEstimates"]["height"], expected_height)
        self.assertTrue(scale["candidateDpis"])
        self.assertTrue(all(36 <= dpi <= 432 for dpi in scale["candidateDpis"]))
        self.assertIn(round(expected_width), scale["candidateDpis"])

    def test_render_recipe_renderer_inference_is_explicit(self):
        self.assertEqual(V6.renderer_for_recipe({"type": "dimension-guided-poppler-page-crop"}), "poppler-pdftoppm")
        self.assertEqual(V6.renderer_for_recipe({"type": "sourcePixelFrame-pymupdf-page-crop"}), "pymupdf")
        self.assertIsNone(V6.renderer_for_recipe({"type": "unclassified-render"}))

    def test_page_cropbox_position_is_serialized_as_point(self):
        self.assertEqual(V6.point_values(SimpleNamespace(x=17.5, y=-4)), [17.5, -4])


if __name__ == "__main__":
    unittest.main(verbosity=2)
