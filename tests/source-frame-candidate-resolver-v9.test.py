"""Unit checks for the bounded fractional-scale frame replay helper."""
import importlib.util
import tempfile
import unittest
from pathlib import Path

import fitz
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "source_frame_candidate_resolver_v9",
    ROOT / "tools/source-frame-candidate-resolver-v9.py",
)
V9 = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(V9)


class SourceFrameCandidateResolverV9Tests(unittest.TestCase):
    def test_explicit_grid_is_fractional_and_contains_mm_calibration(self):
        self.assertEqual(V9.MATRIX_SCALES, (2.0, 2.1, 2.2, 2.3, 2.4, 2.5))
        self.assertIn(2.2, V9.MATRIX_SCALES)
        self.assertTrue(all(scale > 0 for scale in V9.MATRIX_SCALES))

    def test_normalized_rect_supports_frozen_list_and_object_forms(self):
        self.assertEqual(V9.normalized_rect([0.01, 0.2, 0.48, 0.3]), (0.01, 0.2, 0.48, 0.3))
        self.assertEqual(V9.normalized_rect({"x": 0.01, "y": 0.2, "w": 0.48, "h": 0.3}),
                         (0.01, 0.2, 0.48, 0.3))
        self.assertEqual(V9.normalized_rect({"x": 0.01, "y": 0.2, "width": 0.48, "height": 0.3}),
                         (0.01, 0.2, 0.48, 0.3))

    def test_clip_uses_page_rect_and_matrix_scale_for_render(self):
        doc = fitz.open()
        page = doc.new_page(width=100, height=200)
        page.draw_rect(fitz.Rect(0, 0, 100, 200), color=(0, 0, 0), fill=(1, 1, 1))
        rect = V9.normalized_rect([0.1, 0.2, 0.5, 0.5])
        clip = V9.source_clip(page, rect)
        self.assertEqual(list(clip), [10, 40, 60, 140])
        pix = V9.render_rgb(page, rect, 2.2)
        self.assertEqual((pix.width, pix.height), (110, 220))
        doc.close()

    def test_exact_pixel_comparator_requires_dimensions_and_all_rgb_bytes(self):
        exact = bytes([1, 2, 3, 4, 5, 6])
        good = V9.compare_candidate(type("P", (), {"samples": exact, "width": 2, "height": 1})(), exact, (2, 1))
        self.assertTrue(good["dimensionMatch"])
        self.assertTrue(good["exactRgbPixelMatch"])
        changed = V9.compare_candidate(type("P", (), {"samples": bytes([1, 2, 3, 4, 5, 7]), "width": 2, "height": 1})(), exact, (2, 1))
        self.assertFalse(changed["exactRgbPixelMatch"])
        wrong_size = V9.compare_candidate(type("P", (), {"samples": exact, "width": 1, "height": 2})(), exact, (2, 1))
        self.assertFalse(wrong_size["dimensionMatch"])
        self.assertFalse(wrong_size["exactRgbPixelMatch"])

    def test_mm_calibration_scale_reproduces_private_exact_png_recipe(self):
        source = fitz.open("/workspace/vault-audit-private/sources/Monster_Manual.pdf")
        page = source[54]
        rect = V9.normalized_rect([0.01, 0.46, 0.98, 0.52])
        pix = V9.render_rgb(page, rect, 2.2)
        image = Image.open("/workspace/adnd1-semantic-audit/dist/scans/verified/mm-54-e646ad924b9182a5.png").convert("RGB")
        result = V9.compare_candidate(pix, image.tobytes(), image.size)
        self.assertEqual(image.size, (1214, 887))
        self.assertTrue(result["exactRgbPixelMatch"])
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "replay.png"
            pix.save(path)
            self.assertEqual(V9.sha256_file(path), "e646ad924b9182a5a9d774c2f8587fd7731455673ff074fbac46b3a032ca4c6d")
        source.close()


if __name__ == "__main__":
    unittest.main(verbosity=2)
