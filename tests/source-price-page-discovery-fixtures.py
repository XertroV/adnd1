"""Pure standard-library cue fixtures; no PyMuPDF or source PDFs are needed."""
import importlib.util
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TOOL = ROOT / 'tools' / 'source-price-page-discovery.py'
SPEC = importlib.util.spec_from_file_location('source_price_page_discovery', TOOL)
DISCOVERY = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(DISCOVERY)


class SourcePriceDiscoveryCues(unittest.TestCase):
    def analyze(self, text):
        return DISCOVERY.analyze_page_text([{
            'lines': [{'spans': [{'text': text, 'bbox': [10, 20, 150, 32]}]}],
        }], 'PHB', 35)

    def test_abbreviations_written_denominations_and_dollars(self):
        fixtures = [
            ('100 gp', 'gp', 'direct-money-value-candidate'),
            ('25 s.p.', 's.p.', 'direct-money-value-candidate'),
            ('3 cp', 'cp', 'direct-money-value-candidate'),
            ('4 ep', 'ep', 'direct-money-value-candidate'),
            ('5 pp', 'pp', 'direct-money-value-candidate'),
            ('7 copper pieces', 'copper pieces', 'direct-money-value-candidate'),
            ('$1,250', 'USD', 'direct-money-value-candidate'),
        ]
        for text, currency, classification in fixtures:
            with self.subTest(text=text):
                candidate = self.analyze(text)['candidates'][0]
                self.assertEqual(candidate['classification'], classification)
                self.assertEqual(candidate['moneyValueCandidates'][0]['currencyText'], currency)
                self.assertEqual(candidate['sourcePdfPointBounds'], {
                    'coordinateSpace': 'source-pdf-points-top-left-origin',
                    'format': 'x0-y0-x1-y1',
                    'precision': 'union-of-text-span-boxes-for-line',
                    'rect': [10.0, 20.0, 150.0, 32.0],
                })

    def test_formula_wealth_and_broad_transaction_cues_remain_candidates(self):
        formula = self.analyze('A batch costs 1d4 x 100 gp per lot.')['candidates'][0]
        self.assertEqual(formula['classification'], 'formula-candidate')
        wealth = self.analyze('Treasure: 2,000 gold pieces.')['candidates'][0]
        self.assertEqual(wealth['classification'], 'wealth-or-treasure-value-candidate')
        wealth_cue = self.analyze('Treasure may include gems.')['candidates'][0]
        self.assertEqual(wealth_cue['classification'], 'wealth-language-cue-candidate')
        transaction = self.analyze('The owner will purchase the item.')['candidates'][0]
        self.assertEqual(transaction['classification'], 'transaction-or-valuation-cue-candidate')

    def test_weight_and_xp_are_only_line_exclusions_when_no_money_cue(self):
        self.assertEqual(self.analyze('Weight 10 lb.')['candidates'][0]['classification'], 'known-exclusion-weight-only')
        self.assertEqual(self.analyze('The weight is 10 pounds.')['candidates'][0]['classification'], 'known-exclusion-weight-only')
        self.assertEqual(self.analyze('Award 1,500 XP.')['candidates'][0]['classification'], 'known-exclusion-xp-only')
        self.assertEqual(self.analyze('10 pounds.')['candidateCount'], 0,'bare pounds are ambiguous and are not excluded as weight')
        mixed = self.analyze('Weight 10 lb.; fee 2 gp.')['candidates'][0]
        self.assertEqual(mixed['classification'], 'direct-money-value-candidate')

    def test_no_cue_and_empty_text_are_not_absence_passes(self):
        no_cue = self.analyze('Ordinary descriptive text with no configured tokens.')
        self.assertEqual(no_cue['screenStatus'], 'screened-no-configured-cue-not-absence')
        self.assertEqual(no_cue['candidateCount'], 0)
        empty = DISCOVERY.analyze_page_text([], 'PHB', 1)
        self.assertEqual(empty['screenStatus'], 'not-assessable-empty-text-layer')
        self.assertEqual(empty['textLayer']['status'], 'empty-or-unextractable')

    def test_detected_spans_keep_pending_status_and_reproducible_configuration(self):
        result = self.analyze('The price is 100 gp.')
        candidate = result['candidates'][0]
        self.assertEqual(candidate['reviewStatus'], 'pending-source-review')
        self.assertEqual(candidate['semanticStatus'], 'not-assessed')
        self.assertTrue(any(match['matchedText'].lower().startswith('gp') for match in candidate['cueMatches']))
        config = DISCOVERY.detector_config()
        self.assertEqual(config['cuePatterns'], DISCOVERY.CUE_PATTERNS)
        self.assertIn('negativePolicy', config)

    def test_output_directory_must_be_new_and_outside_repository(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / 'sources'
            source.mkdir()
            for filename in DISCOVERY.PDF_FILES.values():
                (source / filename).write_bytes(b'fixture-only-not-a-pdf')
            existing = root / 'existing-output'
            existing.mkdir()
            marker = existing / 'manual-review.json'
            marker.write_text('{"mustPreserve":true}', encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'already exists'):
                DISCOVERY.validate_paths(source, existing)
            self.assertEqual(marker.read_text(encoding='utf-8'), '{"mustPreserve":true}')
            with self.assertRaisesRegex(ValueError, 'outside the repository'):
                DISCOVERY.validate_paths(source, ROOT / 'research' / 'new-discovery-output')


if __name__ == '__main__':
    unittest.main()
