"""Focused executable calibration for source-frame v3 replay helpers."""
import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

import fitz
from PIL import Image

TOOL = Path(__file__).resolve().parents[1] / "tools/source-frame-universe-v3.py"
SPEC = importlib.util.spec_from_file_location("source_frame_universe_v3", TOOL)
V3 = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(V3)


class SourceFrameUniverseV3Tests(unittest.TestCase):
    def test_exact_pixel_detector_rejects_single_channel_mutation(self):
        source = Image.new("RGB", (2, 2), (17, 29, 41))
        exact = V3.pixel_comparison(source, source.copy())
        self.assertTrue(exact["exactRgbPixels"])
        mutated = source.copy()
        mutated.putpixel((1, 1), (17, 29, 42))
        observed = V3.pixel_comparison(source, mutated)
        self.assertFalse(observed["exactRgbPixels"])
        self.assertEqual(observed["differingRgbChannels"], 1)

    def test_dimension_filter_only_returns_crop_compatible_normalized_frames(self):
        page = SimpleNamespace(rect=SimpleNamespace(width=612, height=792))
        fit = V3.poppler_crop_candidates(page, [0.1, 0.2, 0.2, 0.1], (122, 79), 72)
        self.assertEqual(fit["expectedFullPageDimensions"], [612, 792])
        self.assertTrue(fit["cropBoundsCandidates"])
        self.assertTrue(all((b[2] - b[0], b[3] - b[1]) == (122, 79) for b in fit["cropBoundsCandidates"]))
        miss = V3.poppler_crop_candidates(page, [0.1, 0.2, 0.2, 0.1], (300, 300), 72)
        self.assertEqual(miss["cropBoundsCandidates"], [])
        self.assertTrue(all(dpi <= 432 for dpi in V3.candidate_dpis([0, 0, 1, 1], (10000, 10000))))
        self.assertIn(600, V3.candidate_dpis([0, 0, 1, 1], (10000, 10000), [600]))
        self.assertNotIn(600, V3.candidate_dpis([0, 0, 1, 1], (10000, 10000)))

    def test_full_page_cache_is_bound_to_source_renderer_dimensions_and_rgb_hash(self):
        with tempfile.TemporaryDirectory(prefix="source-frame-v3-test-") as td:
            directory = Path(td)
            pdf_path = directory / "fixture.pdf"
            doc = fitz.open()
            page = doc.new_page(width=120, height=160)
            page.draw_rect(fitz.Rect(10, 20, 80, 110), color=(0.1, 0.2, 0.3), fill=(0.1, 0.2, 0.3))
            doc.save(pdf_path)
            doc.close()
            opened = fitz.open(pdf_path)
            old_source = V3.SOURCE_HASHES["PHB"]
            V3.SOURCE_HASHES["PHB"] = (pdf_path.name, hashlib.sha256(pdf_path.read_bytes()).hexdigest())
            replay = V3.Replay(directory, {"PHB": opened}, "RGB")
            try:
                first = replay.full_page("PHB", 1, 72, "pymupdf")
                self.assertEqual(replay.disk_cache_misses, 1)
                # Evict the in-memory entry to exercise the disk sidecar validator.
                replay.full_cache.clear()
                replay.full_cache_core_to_key.clear()
                second = replay.full_page("PHB", 1, 72, "pymupdf")
                self.assertEqual(first.tobytes(), second.tobytes())
                self.assertEqual(replay.disk_cache_hits, 1)
                index = next(replay.render_cache_dir.glob("*.index.json"))
                metadata = json.loads(index.read_text())
                self.assertEqual(metadata["core"]["sourceSha256"], V3.SOURCE_HASHES["PHB"][1])
                self.assertEqual(metadata["core"]["pdfOrdinal"], 1)
                self.assertEqual(metadata["core"]["renderer"], "pymupdf")
                self.assertEqual(metadata["core"]["dpi"], 72)
                self.assertEqual(metadata["core"]["colorMode"], "RGB, alpha false")
                self.assertEqual(metadata["measuredDimensions"], list(first.size))
                self.assertEqual(metadata["rawRgbSha256"], hashlib.sha256(first.tobytes()).hexdigest())
                png = replay.render_cache_dir / metadata["file"]
                Image.new("RGB", first.size, (0, 0, 0)).save(png)
                replay.full_cache.clear()
                replay.full_cache_core_to_key.clear()
                with self.assertRaises(AssertionError):
                    replay.full_page("PHB", 1, 72, "pymupdf")
            finally:
                replay.cleanup()
                opened.close()
                V3.SOURCE_HASHES["PHB"] = old_source


if __name__ == "__main__":
    unittest.main(verbosity=2)
