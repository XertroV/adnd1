"""Bounded regression tests for exact source-frame coordinate projection."""
import importlib.util
import json
import sys
import unittest
import fitz
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
RESEARCH=ROOT/'research'
sys.path.insert(0,str(RESEARCH))
spec=importlib.util.spec_from_file_location('source_frame_coordinate_bridge',RESEARCH/'source_frame_coordinate_bridge.py')
bridge=importlib.util.module_from_spec(spec);spec.loader.exec_module(bridge)

class FrameCoordinateBridgeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.loaded=bridge.load_registry()
        cls.registry=cls.loaded['registry']
        cls.proposal=json.loads((RESEARCH/'source-audit-pass8-exact-frame-adjudication-proposal.json').read_text())

    def _frame(self, book, printed_page):
        return next(frame for frame in self.registry['frames'] if frame['book']==book and frame['printedPage']==printed_page)

    def test_registry_is_exactly_scoped_to_nine_frames_102_regions_and_owners(self):
        self.assertEqual(self.registry['counts'],{'frameGroups':9,'physicalPdfPages':7,'regionBindings':102,'ownerBindings':102})
        self.assertEqual(len(self.loaded['owners']),102)
        self.assertEqual(self.registry['provenance']['proposalSha256'],'1a8078c14e1c73c2597bf837a8e2d8c9a2c28beea3f51aef4bda0484197449cc')
        self.assertEqual(self.registry['provenance']['independentReviewSha256'],'5734f710cf12bca2eb9dc316a077dd6f880abd8338c92a61329501258cbbcc4c')
        self.assertTrue(all(frame['observedRender']['uniqueExactPositionCount']==1 for frame in self.registry['frames']))
        self.assertTrue(all(owner['reviewAssessments']['default']=='missing' for frame in self.registry['frames'] for owner in frame['regions']))

    def test_current_xp_refresh_keeps_13_appends_outside_the_old_102_join_denominator(self):
        self.assertEqual(self.registry['provenance']['dataSha256AtRegistryBuild'],'a4225fbd2015c5ba7d225738ec1a9bf4658f4a9a9700e340a37dde79317119f3')
        refresh=self.registry['provenance']['refreshFromBase777']
        self.assertEqual(refresh['baseRegistrySha256'],'dec13c8419afae87d00551718a56d9dc232cec59ffe9760627e7b0d5037b309e')
        rows=refresh['appendedCatalogRegions']
        self.assertEqual(len(rows),13)
        ids={row['regionId'] for row in rows}
        self.assertEqual(len(ids),13)
        self.assertTrue(all(row['correctionRegistryMembership']=='outside-this-bounded-correction-registry' for row in rows))
        self.assertTrue(all(row['frameDecision']=='not added to the 102 existing joins by this append-only refresh' for row in rows))
        self.assertIn('pass8-thief-xp-continuation-rule',ids)
        self.assertFalse(any(key[1]=='thief' and key[4]=='pass8-thief-xp-continuation-rule' for key in self.loaded['owners']))
        self.assertEqual(len(refresh['changedOwnerLinks']),11)
        self.assertEqual(len(refresh['existingReviewMetadataChanges']),1)

    def test_all_102_review_hash_and_assessment_pins_are_copied_exactly(self):
        proposed={}
        for frame in self.proposal['typedFrameSidecarProposal']['records']:
            for join in frame['regionOwnerJoins']:
                owner=join['owner']
                key=(owner['collection'],owner['itemId'],owner['binding'],join['catalog'],join['regionId'])
                proposed[key]=(join['currentReviewHashBinding'],join['currentReviewAssessments'])
        self.assertEqual(len(proposed),102)
        for key,(frame,row) in self.loaded['owners'].items():
            self.assertIn(key,proposed)
            self.assertEqual((row['reviewHashBinding'],row['reviewAssessments']),proposed[key])

    def test_phb_p27_uses_mediabox_normalization_not_cropbox_projection(self):
        frame=self._frame('PHB',27)
        region=next(r for r in frame['regions'] if r['owner']['itemId']=='assassin')
        boxes=frame['pdfBoxesPoints']
        actual,status=bridge.normalized_rect_to_page_points(region['normalizedPageRect'],frame['coordinateSpace'],boxes['pageRect'],boxes['cropBox'],boxes['mediaBox'])
        self.assertEqual(status,'assessable')
        self.assertEqual(actual,[292.7997,16.8,566.3993,167.9999])
        r=region['normalizedPageRect'];page=boxes['pageRect']
        old=[round(r['x']*page[2],4),round(r['y']*page[3],4),round((r['x']+r['width'])*page[2],4),round((r['y']+r['height'])*page[3],4)]
        self.assertEqual(old,[290.9757,16.8,562.8711,167.9999])
        self.assertNotEqual(actual,old)

    def test_phb_p37_ten_owners_share_mediabox_to_cropbox_projection(self):
        frame=self._frame('PHB',37)
        self.assertEqual(len(frame['regions']),10)
        expected=[20.16,27.36,576.9593,172.8]
        for region in frame['regions']:
            actual,status=bridge.normalized_rect_to_page_points(region['normalizedPageRect'],frame['coordinateSpace'],frame['pdfBoxesPoints']['pageRect'],frame['pdfBoxesPoints']['cropBox'],frame['pdfBoxesPoints']['mediaBox'])
            self.assertEqual(status,'assessable')
            self.assertEqual(actual,expected)

    def test_cropbox_and_coincident_box_projection_keep_their_declared_basis(self):
        dmg=self._frame('DMG',75)
        r=dmg['regions'][0]
        actual,status=bridge.normalized_rect_to_page_points(r['normalizedPageRect'],dmg['coordinateSpace'],dmg['pdfBoxesPoints']['pageRect'],dmg['pdfBoxesPoints']['cropBox'],dmg['pdfBoxesPoints']['mediaBox'])
        self.assertEqual(status,'assessable')
        values=r['normalizedPageRect']
        expected=[round(values[0]*dmg['pdfBoxesPoints']['pageRect'][2],4),round(values[1]*dmg['pdfBoxesPoints']['pageRect'][3],4),round((values[0]+values[2])*dmg['pdfBoxesPoints']['pageRect'][2],4),round((values[1]+values[3])*dmg['pdfBoxesPoints']['pageRect'][3],4)]
        self.assertEqual(actual,expected)
        equal=next(f for f in self.registry['frames'] if f['coordinateSpace']=='coincident-cropbox-mediabox-pageRect-normalized')
        self.assertTrue(all(abs(a-b)<=0.0002 for a,b in zip(equal['pdfBoxesPoints']['cropBox'],equal['pdfBoxesPoints']['mediaBox'])))
        self.assertEqual(bridge.normalized_rect_to_page_points([0.1,0.1,0.2,0.2],'coincident-cropbox-mediabox-pageRect-normalized',equal['pdfBoxesPoints']['pageRect'],equal['pdfBoxesPoints']['cropBox'],equal['pdfBoxesPoints']['mediaBox'])[1],'assessable')
        wrong_media=list(equal['pdfBoxesPoints']['mediaBox']);wrong_media[2]-=1
        self.assertEqual(bridge.normalized_rect_to_page_points([0.1,0.1,0.2,0.2],'coincident-cropbox-mediabox-pageRect-normalized',equal['pdfBoxesPoints']['pageRect'],equal['pdfBoxesPoints']['cropBox'],wrong_media)[1],'frame-box-conflict')

    def test_media_box_offsets_are_translated_into_cropbox_local_page_coordinates(self):
        result,status=bridge.normalized_rect_to_page_points([0.1,0.1,0.2,0.2],'mediabox-normalized',[0,0,90,90],[5,5,95,95],[0,0,100,100])
        self.assertEqual(status,'assessable')
        for actual,expected in zip(result,[5.0,5.0,25.0,25.0]):
            self.assertAlmostEqual(actual,expected,places=8)

    def test_unregistered_fallback_stays_explicitly_unassessable(self):
        visual_spec=importlib.util.spec_from_file_location('source_visual_audit',RESEARCH/'source-visual-audit.py')
        visual=importlib.util.module_from_spec(visual_spec);visual_spec.loader.exec_module(visual)
        region={'normalizedPageRect':[0.1,0.2,0.2,0.3]}
        legacy_bounds,shape=visual.rect_for(region,fitz.Rect(0,0,100,200))
        unresolved=bridge.resolve_owner_join(self.loaded,('rules','unknown','sourceExcerpts','scans/other.json','unregistered-region'),{})
        for actual,expected in zip(legacy_bounds,[10.0,40.0,30.0,100.0]):
            self.assertAlmostEqual(actual,expected,places=8)
        self.assertEqual(shape,'flat')
        self.assertEqual(bridge.public_resolution(unresolved),{
            'status':'outside-bounded-correction-registry',
            'basis':'legacy-diagnostic-projection-retained',
            'reason':'No exact owner/region binding is present in this bounded correction registry; this does not make a claim about separate frame evidence.',
            'correctionRegistryMembership':'outside-this-bounded-correction-registry',
            'resolutionStatus':'legacy-diagnostic-projection-retained; no new frame approval by this registry',
        })

    def test_wrong_owner_page_source_catalog_image_or_geometry_is_not_assessable(self):
        key, (frame,row)=next(iter(self.loaded['owners'].items()))
        base={
            'book':frame['book'],'printedPage':frame['printedPage'],'pdfPage':frame['pdfPage'],
            'sourcePdfSha256':frame['sourcePdfSha256'],'catalogSha256':row['catalogSha256'],
            'imageSha256':row['imageSha256'],'imageDimensionsPx':row['imageDimensionsPx'],
            'normalizedPageRect':row['normalizedPageRect'],'focusSha256':row['focusSha256'],
            'contentSha256':row['contentSha256'],'ownerSourceLinkSha256':row['ownerSourceLinkSha256'],
        }
        self.assertEqual(bridge.resolve_owner_join(self.loaded,key,base)['status'],'matched')
        mutations={
            'wrong book':('book','MM'),'wrong printed page':('printedPage',999),'wrong PDF page':('pdfPage',999),
            'wrong source PDF':('sourcePdfSha256','0'*64),'wrong catalog file':('catalogSha256','0'*64),
            'wrong source image':('imageSha256','0'*64),'wrong image dimensions':('imageDimensionsPx',[1,1]),
            'wrong normalized rect':('normalizedPageRect',[0,0,1,1]),'wrong focus hash':('focusSha256','0'*64),
            'wrong content hash':('contentSha256','0'*64),'changed owner link':('ownerSourceLinkSha256','0'*64),
        }
        for label,(field,value) in mutations.items():
            with self.subTest(label=label):
                observed=dict(base);observed[field]=value
                result=bridge.resolve_owner_join(self.loaded,key,observed)
                self.assertEqual(result['status'],'conflicting-frame-identity')
                self.assertEqual(result['basis'],'unassessable')
                self.assertIn(field,result['mismatchedFields'])
        outside=bridge.resolve_owner_join(self.loaded,('rules','unregistered','sourceExcerpts','scans/unknown.json','unknown'),base)
        self.assertEqual(outside['status'],'outside-bounded-correction-registry')
        self.assertEqual(outside['correctionRegistryMembership'],'outside-this-bounded-correction-registry')

    def test_unregistered_unknown_dpi_never_becomes_a_guessed_frame(self):
        known=self._frame('PHB',27)
        dpi=bridge.source_frame_dpi_for_render(known,known['observedRender']['fullPageRawRgbSha256'])
        self.assertEqual(dpi,{'status':'render-hash-matched-but-historical-dpi-unassessed','renderDpi':None})
        unknown=bridge.source_frame_dpi_for_render(known,'f'*64)
        self.assertEqual(unknown,{'status':'unassessable-no-dpi-binding','renderDpi':None})

    def test_live_owner_source_links_are_pinned_and_mutations_fail_closed(self):
        data=json.loads((ROOT/'dist/data.json').read_text())
        clean=bridge.validate_live_registry(data,ROOT/'dist')
        self.assertEqual(clean['status'],'current-pins-match')
        self.assertEqual(clean['ownerJoinsValidated'],102)
        self.assertEqual(clean['mismatchCount'],0)
        changed=json.loads(json.dumps(data))
        frame=self._frame('PHB',27)
        owner=frame['regions'][0]['owner']
        item=next(x for x in changed[owner['collection']] if x.get('id')==owner['itemId'])
        item[owner['binding']]['catalog']='scans/verified/wrong-frame.json'
        result=bridge.validate_live_registry(changed,ROOT/'dist')
        self.assertEqual(result['status'],'current-pins-conflict')
        expected_count=sum(1 for frame in self.registry['frames'] for row in frame['regions'] if row['owner']==owner)
        self.assertEqual(result['mismatchCount'],expected_count)
        self.assertTrue(all('ownerBinding' in row['fields'] or 'ownerSourceLinkSha256' in row['fields'] for row in result['mismatches']))

    def test_unregistered_region_id_with_same_exact_crop_is_conflict_not_guess(self):
        key,(frame,row)=next(iter(self.loaded['owners'].items()))
        changed_key=(*key[:-1],'renamed-region-id')
        observed={'book':frame['book'],'printedPage':frame['printedPage'],'pdfPage':frame['pdfPage'],
          'sourcePdfSha256':frame['sourcePdfSha256'],'imageSha256':row['imageSha256'],
          'normalizedPageRect':row['normalizedPageRect']}
        result=bridge.resolve_owner_join(self.loaded,changed_key,observed)
        self.assertEqual(result['status'],'conflicting-frame-identity')
        self.assertIn('regionId',result['mismatchedFields'])

    def test_before_fixture_preserves_exact_11_boundary_rows_without_grade_changes(self):
        fixture=self.proposal['currentBeforeBoundaryFixture']
        rows=fixture['rows']
        self.assertEqual(len(rows),11)
        self.assertEqual(sum(row['printedPage']==27 for row in rows),1)
        self.assertEqual(sum(row['printedPage']==37 for row in rows),10)
        self.assertTrue(all(row['sourceRasterUsageBefore']['semanticReviewStatus']=='unresolved-requires-source-review' for row in rows))
        self.assertTrue(all(row['currentReviewAssessments']['default']=='missing' for row in rows))
        for row in rows:
            hashes=row['currentReviewHashBinding']
            self.assertEqual(hashes['imageSha256'],row['imageSha256'])
            self.assertEqual(hashes['focusSha256'],row['focusSha256'])
            self.assertEqual(hashes['contentSha256'],row['contentSha256'])

if __name__=='__main__': unittest.main()
