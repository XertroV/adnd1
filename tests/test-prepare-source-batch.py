#!/usr/bin/env python3
import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import fitz
from PIL import Image

TOOL = Path(__file__).resolve().parents[1] / 'tools/prepare-source-batch.py'


class BatchTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)
        doc = fitz.open()
        for i in range(240):
            p = doc.new_page(width=100, height=200)
            p.insert_text((10, 30), str(i + 1))
        self.pdf = self.dir / 'synthetic.pdf'
        doc.save(self.pdf)
        doc.close()

    def tearDown(self):
        self.tmp.cleanup()

    def run_batch(self, entries):
        manifest = self.dir / 'input.json'
        manifest.write_text(json.dumps({'sources': {'DMG': 'synthetic.pdf', 'MM2': 'synthetic.pdf'}, 'entries': entries}))
        out = self.dir / 'batch'
        run = subprocess.run([sys.executable, str(TOOL), str(manifest), str(out), '--dpi', '72'], capture_output=True, text=True)
        return run, out

    def test_mapping_provenance_and_images(self):
        entries = [{'id': 'a', 'book': 'DMG', 'printedPage': 174, 'rect': [0.1, 0.2, 0.3, 0.4]},
                   {'id': 'b', 'book': 'DMG', 'printedPage': 176},
                   {'id': 'c', 'book': 'MM2', 'printedPage': 83},
                   {'id': 'd', 'book': 'MM2', 'printedPage': 84}]
        run, out = self.run_batch(entries)
        self.assertEqual(run.returncode, 0, run.stderr)
        review = json.loads((out / 'review.json').read_text())
        self.assertEqual([e['pdfPage'] for e in review['entries']], [175, 176, 92, 84])
        self.assertEqual(review['status'], 'pending-independent-visual-verification')
        self.assertEqual(review['sources']['DMG']['sha256'], hashlib.sha256(self.pdf.read_bytes()).hexdigest())
        first = review['entries'][0]
        self.assertEqual(first['verification'], 'pending-independent-visual-verification')
        with Image.open(out / 'a-crop.png') as crop:
            self.assertEqual(crop.size, (30, 81))  # floating point ceil is conservative
        for item in first['files'].values():
            self.assertEqual(item['sha256'], hashlib.sha256((out / item['file']).read_bytes()).hexdigest())

    def test_mapping_matches_viewer(self):
        import importlib.util
        spec = importlib.util.spec_from_file_location('batch', TOOL)
        batch = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(batch)
        viewer = Path(__file__).resolve().parents[1] / 'dist/books.js'
        script = "const b=require(process.argv[1]); console.log(JSON.stringify(Object.fromEntries(Object.entries(b.books).map(([k,v])=>[k,Array.from({length:v.lastPage},(_,i)=>b.pdfPage(k,i+1))]))))"
        expected = json.loads(subprocess.check_output(['node', '-e', script, str(viewer)], text=True))
        for book, pages in expected.items():
            for printed, value in enumerate(pages, 1):
                if value is None:
                    with self.assertRaises(ValueError):
                        batch.pdf_page(book, printed)
                else:
                    self.assertEqual(batch.pdf_page(book, printed), value, (book, printed))

    def test_missing_pages_and_invalid_rectangles_fail_without_output(self):
        for entry in [{'id': 'x', 'book': 'DMG', 'printedPage': 175},
                      {'id': 'x', 'book': 'DMG', 'printedPage': 240},
                      {'id': 'x', 'book': 'DMG', 'printedPage': 1, 'rect': [0.8, 0, 0.3, 1]},
                      {'id': 'x', 'book': 'DMG', 'printedPage': 1, 'rect': [0, 0, 0, 1]}]:
            with self.subTest(entry=entry):
                run, out = self.run_batch([{'id': 'good', 'book': 'DMG', 'printedPage': 1}, entry])
                self.assertNotEqual(run.returncode, 0)
                self.assertFalse(out.exists())


if __name__ == '__main__':
    unittest.main()
