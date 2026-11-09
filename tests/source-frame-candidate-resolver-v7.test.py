"""Focused checks for v7 scale-window planning and pair-specific deduplication."""
import importlib.util
import unittest
from pathlib import Path
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[1]


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


V5 = load("source_frame_v5_for_v7_test", ROOT / "tools/source-frame-universe-v5.py")
V6 = load("source_frame_v6_for_v7_test", ROOT / "tools/source-frame-candidate-resolver-v6.py")
V7 = load("source_frame_v7_for_test", ROOT / "tools/source-frame-candidate-resolver-v7.py")


class SourceFrameCandidateResolverV7Tests(unittest.TestCase):
    def geometry(self, key, dimensions=(300, 300)):
        return {"geometryKey": key, "book": "PHB", "pdfPage": 1,
                "normalizedPageRectSchemaStatus": "supported-list",
                "rawDeclarations": {"normalizedPageRect": [0.1, 0.1, 0.5, 0.5]},
                "imageDimensions": list(dimensions),
                "candidateSearch": {"status": "no-exact-template-match-in-bounded-render-set"}}

    def test_prior_trial_filters_only_that_geometry_pair(self):
        page = SimpleNamespace(rect=SimpleNamespace(width=612, height=792))
        geom_a, geom_b = self.geometry("geometry-a"), self.geometry("geometry-b")
        window = V6.normalized_scale_dpis(page, [0.1, 0.1, 0.5, 0.5], (300, 300))
        dpi = window["candidateDpis"][0]
        candidate_key = f"PHB:1:pymupdf:{dpi}"
        configs, windows = V7.candidate_plan([geom_a, geom_b], {(candidate_key, "geometry-a")}, V5, V6,
                                               {"PHB": [page]})
        pair = configs[candidate_key]["geometryKeys"]
        self.assertNotIn("geometry-a", pair)
        self.assertIn("geometry-b", pair)
        self.assertEqual(windows["geometry-a"]["status"], "dimension-scale-window-planned")

    def test_already_exact_v6_geometry_is_not_reopened(self):
        page = SimpleNamespace(rect=SimpleNamespace(width=612, height=792))
        geometry = self.geometry("already-exact")
        geometry["candidateSearch"]["status"] = "exact-full-page-template-found-one-rendered-position"
        configs, windows = V7.candidate_plan([geometry], set(), V5, V6, {"PHB": [page]})
        self.assertEqual(configs, {})
        self.assertEqual(windows["already-exact"]["status"], "skipped-v6-has-exact-template")


if __name__ == "__main__":
    unittest.main(verbosity=2)
