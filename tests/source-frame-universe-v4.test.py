"""Executable source identity, render-order and DPI cache regressions for v4."""
import hashlib
import importlib.util
import io
import tempfile
import unittest
from pathlib import Path

import fitz
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def load_tool(version):
    spec = importlib.util.spec_from_file_location(version, ROOT / f"tools/source-frame-universe-{version}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


V3, V4 = load_tool("v3"), load_tool("v4")


class SourceFrameUniverseV4Tests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="source-frame-v4-regression-")
        self.directory = Path(self.temp.name)
        self.documents = {}
        self.old_sources = dict(V4.SOURCE_HASHES)
        for book, shade in (("PHB", (1, 0, 0)), ("UA", (0, 0, 1))):
            path = self.directory / f"{book}.pdf"
            doc = fitz.open()
            page = doc.new_page(width=120, height=160)
            page.draw_rect(page.rect, color=shade, fill=shade)
            doc.save(path)
            doc.close()
            self.documents[book] = fitz.open(path)
            V4.SOURCE_HASHES[book] = (path.name, hashlib.sha256(path.read_bytes()).hexdigest())
        self.replay = V4.Replay(self.directory, self.documents, "RGB")

    def tearDown(self):
        self.replay.cleanup()
        for doc in self.documents.values():
            doc.close()
        V4.SOURCE_HASHES.clear()
        V4.SOURCE_HASHES.update(self.old_sources)
        self.temp.cleanup()

    def target(self, book, clip, dpi):
        fitz.TOOLS.store_shrink(100)
        pix = self.documents[book][0].get_pixmap(dpi=dpi, clip=fitz.Rect(clip), alpha=False, colorspace=fitz.csRGB)
        return Image.frombytes("RGB", (pix.width, pix.height), pix.samples)

    def test_warm_cache_rejects_wrong_source_and_mutated_target(self):
        clip = [10, 20, 40, 60]
        target = self.target("PHB", clip, 72)
        good = self.replay.direct("PHB", self.documents["PHB"][0], clip, target, [])
        wrong = self.replay.direct("UA", self.documents["UA"][0], clip, target, [])
        self.assertTrue(good["exact"])
        self.assertFalse(wrong["exact"])
        self.assertTrue(wrong["trials"])
        self.assertTrue(all(not trial["exactRgbPixels"] for trial in wrong["trials"]))
        mutation = target.copy()
        mutation.putpixel((0, 0), (254, 0, 0))
        self.assertFalse(self.replay.direct("PHB", self.documents["PHB"][0], clip, mutation, [])["exact"])

    def test_same_book_substituted_document_rejected_before_warm_cache_lookup(self):
        clip = [10, 20, 40, 60]
        target = self.target("PHB", clip, 72)
        self.assertTrue(self.replay.direct("PHB", self.documents["PHB"][0], clip, target, [])["exact"])
        with self.assertRaisesRegex(AssertionError, "page does not belong"):
            self.replay.direct("PHB", self.documents["UA"][0], clip, target, [])
        # Even a new handle for the same hash-verified file is a different owner.
        replacement = fitz.open(self.directory / "PHB.pdf")
        try:
            with self.assertRaisesRegex(AssertionError, "page does not belong"):
                self.replay.direct("PHB", replacement[0], clip, target, [])
            self.replay.docs = {**self.documents, "PHB": replacement}
            with self.assertRaisesRegex(AssertionError, "replaced after binding"):
                self.replay.full_page("PHB", 1, 72, "pymupdf")
        finally:
            self.replay.docs = self.documents
            replacement.close()

    def test_explicit_dpi_policy_does_not_inherit_cached_miss(self):
        clip = [12, 24, 24, 36]
        target = self.target("PHB", clip, 600)
        without = self.replay.direct("PHB", self.documents["PHB"][0], clip, target, [])
        with_declared = self.replay.direct("PHB", self.documents["PHB"][0], clip, target, [600])
        self.assertFalse(without["exact"])
        self.assertEqual(without["trials"], [])
        self.assertTrue(with_declared["exact"])
        self.assertEqual([trial["dpi"] for trial in with_declared["trials"]], [600])
        self.assertIs(self.replay.direct("PHB", self.documents["PHB"][0], clip, target, []), without)

    def test_source_path_hash_is_checked_when_binding_document(self):
        self.replay.cleanup()
        path = self.directory / "PHB.pdf"
        path.write_bytes(path.read_bytes() + b"changed-source")
        with self.assertRaisesRegex(AssertionError, "source PDF hash mismatch"):
            V4.Replay(self.directory, self.documents, "RGB")

    def test_full_page_first_and_clip_first_produce_isolated_pixels(self):
        # A generated image PDF reproduces the actual MuPDF order defect without
        # requiring private books. The frozen v3 must fail this observed ordering.
        image = Image.new("RGB", (600, 800))
        image.putdata([(i * 17 % 256, i * 31 % 256, i * 47 % 256) for i in range(600 * 800)])
        stream = io.BytesIO()
        image.save(stream, format="PNG")
        path = self.directory / "image.pdf"
        writer = fitz.open()
        page = writer.new_page(width=120, height=160)
        page.insert_image(page.rect, stream=stream.getvalue())
        writer.save(path)
        writer.close()
        doc = fitz.open(path)
        old_source = V4.SOURCE_HASHES["PHB"]
        V4.SOURCE_HASHES["PHB"] = (path.name, hashlib.sha256(path.read_bytes()).hexdigest())
        replay = V4.Replay(self.directory, {"PHB": doc}, "RGB")
        legacy = V3.Replay(self.directory, {"PHB": doc}, "RGB")
        clip = [10.3, 20.7, 40.3, 60.7]
        try:
            fitz.TOOLS.store_shrink(100)
            pix = doc[0].get_pixmap(dpi=144, clip=fitz.Rect(clip), alpha=False, colorspace=fitz.csRGB)
            target = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
            fitz.TOOLS.store_shrink(100)
            doc[0].get_pixmap(dpi=144, alpha=False, colorspace=fitz.csRGB)
            self.assertFalse(legacy.direct("PHB", doc[0], clip, target, [])["exact"])
            self.assertTrue(replay.direct("PHB", doc[0], clip, target, [])["exact"])
            first = replay.full_page("PHB", 1, 144, "pymupdf")
            replay.direct_cache.clear()
            self.assertTrue(replay.direct("PHB", doc[0], clip, target, [])["exact"])
            replay.full_cache.clear()
            replay.full_cache_core_to_key.clear()
            second = replay.full_page("PHB", 1, 144, "pymupdf")
            self.assertEqual(first.tobytes(), second.tobytes())
            self.assertEqual(replay.disk_cache_hits, 1)
        finally:
            replay.cleanup()
            legacy.cleanup()
            doc.close()
            V4.SOURCE_HASHES["PHB"] = old_source


if __name__ == "__main__":
    unittest.main(verbosity=2)
