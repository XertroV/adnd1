"""Pure calibration for v8 finite standard-DPI candidate planning."""
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


V5 = load("source_frame_v5_for_v8_test", ROOT / "tools/source-frame-universe-v5.py")
V6 = load("source_frame_v6_for_v8_test", ROOT / "tools/source-frame-candidate-resolver-v6.py")
V8 = load("source_frame_v8_for_test", ROOT / "tools/source-frame-candidate-resolver-v8.py")


class SourceFrameCandidateResolverV8Tests(unittest.TestCase):
    def test_nearest_grid_selects_two_finite_values_per_axis(self):
        result = V8.nearest_standard_dpis({"width": 173.1, "height": 164.8}, V5.COMMON_DPI)
        self.assertEqual(result["nearestCommonDpisByAxis"], {"width": [180, 160], "height": [160, 150]})
        self.assertEqual(result["candidateDpis"], [150, 160, 180])
        self.assertTrue(set(result["candidateDpis"]).issubset(V5.COMMON_DPI))

    def test_prior_render_filters_only_exact_geometry_pair(self):
        page = SimpleNamespace(rect=SimpleNamespace(width=612, height=792))
        geometries = []
        for key in ("geometry-a", "geometry-b"):
            geometries.append({"geometryKey": key, "book": "PHB", "pdfPage": 1,
                               "imageDimensions": [1000, 1000],
                               "rawDeclarations": {"normalizedPageRect": [0.1, 0.1, 0.5, 0.5]},
                               "v7DimensionScaleSearch": {"cumulativeBoundedStatus": "no-exact-template-in-v6-or-v7-bounded-render-sets"}})
        nearest = V8.nearest_standard_dpis({"width": 1000 * 72 / (0.5 * page.rect.width),
                                            "height": 1000 * 72 / (0.5 * page.rect.height)}, V5.COMMON_DPI)
        dpi = nearest["candidateDpis"][0]
        candidate_key = f"PHB:1:pymupdf:{dpi}"
        configs, plans = V8.plan_candidates(geometries, {(candidate_key, "geometry-a")}, V5, V6, {"PHB": [page]})
        self.assertNotIn("geometry-a", configs[candidate_key]["geometryKeys"])
        self.assertIn("geometry-b", configs[candidate_key]["geometryKeys"])
        self.assertEqual(plans["geometry-a"]["status"], "standard-dpi-window-planned")

    def test_prior_exact_geometry_is_not_reopened(self):
        geometry = {"geometryKey": "already-exact", "book": "PHB", "pdfPage": 1,
                    "v7DimensionScaleSearch": {"cumulativeBoundedStatus": "exact-template-found-in-v7-dimension-scale-window"}}
        configs, plans = V8.plan_candidates([geometry], set(), V5, V6, {})
        self.assertEqual(configs, {})
        self.assertEqual(plans["already-exact"]["status"], "skipped-prior-exact-template")


if __name__ == "__main__":
    unittest.main(verbosity=2)
