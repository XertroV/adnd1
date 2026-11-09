"""Focused calibration for v5 normalized coordinate schema decisions."""
import importlib.util
import unittest
from pathlib import Path
from types import SimpleNamespace

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("source_frame_universe_v5", ROOT / "tools/source-frame-universe-v5.py")
V5 = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(V5)


class SourceFrameUniverseV5SchemaTests(unittest.TestCase):
    def setUp(self):
        self.page = SimpleNamespace(rect=SimpleNamespace(width=100, height=200))

    def test_list_and_wrapped_list_forms_are_supported(self):
        expected = [0.2, 0.3, 0.4, 0.2]
        self.assertEqual(V5.normalized_schema(expected), {"status": "supported-list", "values": expected})
        self.assertEqual(V5.normalized_schema([expected]), {"status": "supported-list", "values": expected})

    def test_long_and_short_object_aliases_produce_same_clip(self):
        long = {"x": 0.2, "y": 0.3, "width": 0.4, "height": 0.2}
        short = {"x": 0.2, "y": 0.3, "w": 0.4, "h": 0.2}
        for value, expected_status in ((long, "supported-object-width-height"), (short, "supported-object-w-h")):
            parsed = V5.normalized_schema(value)
            self.assertEqual(parsed["status"], expected_status)
            self.assertEqual(parsed["values"], [0.2, 0.3, 0.4, 0.2])
            clips = V5.pdf_clips({"normalizedPageRect": value}, self.page)
            self.assertEqual(len(clips), 1)
            self.assertEqual(clips[0][0], "normalizedPageRect-on-canonical-CropBox")
            for observed, expected in zip(clips[0][1], [20.0, 60.0, 60.0, 100.0]):
                self.assertAlmostEqual(observed, expected)

    def test_mixed_conflicting_aliases_are_rejected_not_selected(self):
        value = {"x": 0.2, "y": 0.3, "width": 0.4, "height": 0.2, "w": 0.5, "h": 0.2}
        parsed = V5.normalized_schema(value)
        self.assertEqual(parsed["status"], "conflicting-mixed-width-height-and-w-h")
        self.assertIsNone(parsed["values"])
        self.assertIsNone(V5.normalized(value))
        self.assertEqual(V5.pdf_clips({"normalizedPageRect": value}, self.page), [])
        self.assertEqual(V5.unresolved_status(parsed["status"], 0, 0), "conflicting-normalized-coordinate-schema; zero pixel recipes attempted")

    def test_equal_duplicate_aliases_are_explicit_and_partial_mixtures_unsupported(self):
        equal = {"x": 0.2, "y": 0.3, "width": 0.4, "height": 0.2, "w": 0.4, "h": 0.2}
        self.assertEqual(V5.normalized_schema(equal)["status"], "supported-object-equal-mixed-aliases")
        partial = {"x": 0.2, "y": 0.3, "width": 0.4, "h": 0.2}
        self.assertEqual(V5.normalized_schema(partial)["status"], "unsupported-object-schema-incomplete-or-mixed-aliases")
        self.assertEqual(V5.pdf_clips({"normalizedPageRect": partial}, self.page), [])

    def test_unresolved_status_distinguishes_zero_attempt_from_actual_pixel_miss(self):
        unsupported = V5.normalized_schema({"x": 0.1, "y": 0.2, "w": 0.3})["status"]
        self.assertTrue(unsupported.startswith("unsupported-"))
        self.assertEqual(V5.unresolved_status(unsupported, 0, 0), "unsupported-normalized-coordinate-schema; zero pixel recipes attempted")
        self.assertEqual(V5.unresolved_status("supported-object-w-h", 1, 0), "supported-schema-no-dimension-compatible-pixel-recipe")
        self.assertEqual(V5.unresolved_status("supported-object-w-h", 1, 2), "tried-no-exact-pixel-match")

    def test_pixel_identity_still_requires_every_channel_to_match(self):
        target = Image.new("RGB", (2, 2), (8, 16, 24))
        self.assertTrue(V5.pixel_comparison(target, target.copy())["exactRgbPixels"])
        altered = target.copy()
        altered.putpixel((0, 1), (8, 16, 25))
        result = V5.pixel_comparison(target, altered)
        self.assertFalse(result["exactRgbPixels"])
        self.assertEqual(result["differingRgbChannels"], 1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
