// Root-reviewed fixed historical installation pins; no caller overrides.
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
export const historicalReaderInstallationPins=freeze({
  "materialized": true,
  "bridgePath": "research/class-mapping-source-epoch-v1/class-mapping-historical-bridge-v1.json",
  "bridgeSha256": "44db8fc8218895812d5610b8ccf382c55859097234d7d4233307183053285678",
  "bridgeCommit": "8a16a2eb4f18a6bbd583e1239b1b41f53b5188ab",
  "bridgeTree": "2a843200505eddaf5d7d8b9f6b1cac51ba70c204",
  "codeCommit": "a923d24e56a2c457f3b0569034c2411ca83ba04d",
  "codeTree": "845b009c1062122270ea09ae91a78df1a184aebe",
  "codePins": {
    "dist/books.js": {
      "sha256": "99928f8e954ef213a51c70dc97d8f63b16a7b5eea9f1cba10b76b527ec17f811",
      "sizeBytes": 19067
    },
    "dist/citations.js": {
      "sha256": "63e1667cd93c773e950bf6c53d8cf56e6beb29490278cecdeeb952cfa2663032",
      "sizeBytes": 8056
    },
    "research/class-mapping-current-adapters-v1/current-consumer-code-stage-pins-v1.mjs": {
      "sha256": "7ee70d26cd2e6267f3e959c6f75d512370f61478658f0a47213c49930853465c",
      "sizeBytes": 5012
    },
    "research/class-mapping-current-adapters-v1/current-consumer-code-stage-pins-v1.qcc-stub.mjs": {
      "sha256": "8549e478c6ef762a49145420c610d12d8ed767b34648bdaa894b82ec09b08bb5",
      "sizeBytes": 3415
    },
    "research/class-mapping-current-adapters-v1/current-consumer-pins-v1.mjs": {
      "sha256": "396ce633bbef29e90b3393c5c8bb3e44f304f0da27de1c37ce3e9b4e38229888",
      "sizeBytes": 5026
    },
    "research/class-mapping-current-adapters-v1/current-consumer-pins-v1.qcc-stub.mjs": {
      "sha256": "53023f4f607223b96a012ef855671b5e2bda6d0c684b62a98dc6f9d054b8e385",
      "sizeBytes": 3256
    },
    "research/class-mapping-history-v1/closed-version29-reader-class-mapping-v1.mjs": {
      "sha256": "f43b6b8fd0b47f23308ba706bd3e0672ea6545048c2dffbbd9603b71ff06ee6e",
      "sizeBytes": 4382
    },
    "research/class-mapping-history-v1/historical-controlled-git-v1.mjs": {
      "sha256": "94e841bc827b418a5b997a0a75254e6b256809e6d1f54a61a276d0914aa8496b",
      "sizeBytes": 2094
    },
    "research/class-mapping-history-v1/history-recovery-v1/dmg175-equipment-context-v28.mjs": {
      "sha256": "3e3dd8543b3c83339cae3af06b9e2ee45e910409a6c9309a2391546115ac6ec6",
      "sizeBytes": 9054
    },
    "research/class-mapping-history-v1/history-recovery-v1/dmg175-equipment-epoch-outer-v2.proposed.mjs": {
      "sha256": "9ad7259e03b2dce4cf23a72c463e17d295e73765dd5fc609356a023b6a852836",
      "sizeBytes": 9253
    },
    "research/class-mapping-history-v1/mm-native-capsule-manifest-v1.json": {
      "sha256": "5798f30b425f3a908682dfd860226036fe3a88d017b27d37c9c30bd8afd25003",
      "sizeBytes": 9542
    },
    "research/class-mapping-history-v1/mm-replay-child-process-v1.mjs": {
      "sha256": "0ae7ecb6d60b81146f6c0c0f2306bb5c25d8d5b8878dc82e70e8bec2e7c64731",
      "sizeBytes": 7052
    },
    "research/class-mapping-history-v1/mm-replay-fs-promises-v1.mjs": {
      "sha256": "235f899c4869548b599e848657f42d9adae86882230cecf71e62d4b807ce122a",
      "sizeBytes": 313
    },
    "research/class-mapping-history-v1/mm-replay-fs-v1.mjs": {
      "sha256": "aae501259b9ca46b9b1c91107cda45e978da63c50720e00dd695b156d8b1fd17",
      "sizeBytes": 10020
    },
    "research/class-mapping-history-v1/mm-replay-io-contract-v1.mjs": {
      "sha256": "7a03d1bada79fa6845119ea47fb9f66665f52daf5bbeac46a48b39cecf060223",
      "sizeBytes": 4956
    },
    "research/class-mapping-history-v1/mm-search-cjs-transport-v1.mjs": {
      "sha256": "8030880f7b17a1f0799ecd21cb3b1881ab4e56af70c20d996d55a7b5908410e6",
      "sizeBytes": 2570
    },
    "research/class-mapping-history-v1/mm-test-input-manifest-v6.json": {
      "sha256": "a063dd1910847d94e363f1cee502dfa34fd283ccf2c79f1370bcffe00f886070",
      "sizeBytes": 851530
    },
    "research/class-mapping-history-v1/original-top-level-test-entries-v1.json": {
      "sha256": "33e7e87992f529f0c90a39b3a0d7103c49da4127f8d8b03ca663832d648d040e",
      "sizeBytes": 10031
    },
    "research/class-mapping-history-v1/p175-historical-module-contract-v1.mjs": {
      "sha256": "a4b3258f1f9c4c5578f70539308ae1beea14fa03ed5cd2d55cb83f6efc1e34c8",
      "sizeBytes": 1996
    },
    "research/class-mapping-history-v1/p175-historical-module-v1.mjs": {
      "sha256": "df5823ccd0aa4940018b4b0c2b711cd7d184887a4e94c8135657c828bb85761d",
      "sizeBytes": 2320
    },
    "research/class-mapping-history-v1/replay-kernels/native-monetary-source-questions-kernel-mm-v1.mjs": {
      "sha256": "6e839e30bb15ba1ef3166024e2754cce8c16046fa0f59ffdb92ac46cd03b7efd",
      "sizeBytes": 28320
    },
    "research/class-mapping-history-v1/replay-test-helpers/batch6-dmg175-source-history.mjs": {
      "sha256": "a05d69b744492eca3024937b42b986879100a8746db05407bdb6bdfd4caae442",
      "sizeBytes": 2380
    },
    "research/class-mapping-history-v1/replay-test-helpers/pass8-character-reference-history.mjs": {
      "sha256": "54222b5ebce3073a6ae5df9c0b97a3c2570592a85df8698b99c7c54e69578148",
      "sizeBytes": 6584
    },
    "research/class-mapping-history-v1/replay-test-helpers/pass8-citation-target-crop-history.mjs": {
      "sha256": "1b16a64b0b0abdb05119dc1ee3df63c3c9603a355413e3f6000c6ff95a144ec7",
      "sizeBytes": 11542
    },
    "research/class-mapping-history-v1/replay-test-helpers/pass8-phb-source-history.mjs": {
      "sha256": "154005bc740cb74022b5c3f2f964defd2b44de287e328848144fb63c618c21da",
      "sizeBytes": 9473
    },
    "research/class-mapping-history-v1/replay-test-helpers/pass8-ua-source-history.mjs": {
      "sha256": "6069df3f11aebcdd947b9fa503919904cd45ebcb6c11a3811de1f549ff58c26f",
      "sizeBytes": 10899
    },
    "research/class-mapping-history-v1/replay-test-helpers/pass8-weapon-source-history.mjs": {
      "sha256": "53d909de2e0d40ddc036e3fbf25ac304876f7893af61f9db130cf84ffc662e90",
      "sizeBytes": 12527
    },
    "research/class-mapping-history-v1/replay-test-helpers/pass8-xp-continuation-history.mjs": {
      "sha256": "486003ac3bb8bcc1e55f80b51b97de1a14a64cfe1d6bf1a46c82f465deaba920",
      "sizeBytes": 10076
    },
    "research/class-mapping-history-v1/replay-test-helpers/ua-source-dmg74-matrix-batch.mjs": {
      "sha256": "ebbf3e425d4ecee2f4b7afa87487076d66834c1b96599cb2315e48e210b87013",
      "sizeBytes": 8216
    },
    "research/class-mapping-history-v1/replay-tools/citation-context-contract.mjs": {
      "sha256": "b4c8c8560762ffd52d0ceec611eaea6db4554393ae53e811bd3b4a43bf89549b",
      "sizeBytes": 4159
    },
    "research/class-mapping-history-v1/replay-tools/citation-override-identity.mjs": {
      "sha256": "140de83cbc9b039e43615cdc934ca9e2d998ad7fc2c39ae4b140d68ec9123067",
      "sizeBytes": 4268
    },
    "research/class-mapping-history-v1/replay-tools/citation-region-role.mjs": {
      "sha256": "e96802384ce7328055150da935b4279dff252b7ebfd5e5a954559b38b75257c5",
      "sizeBytes": 1976
    },
    "research/class-mapping-history-v1/replay-tools/citation-systemic-inventory.mjs": {
      "sha256": "99b9a7af746da941c9e36ac32ef951a8d4d2200e8cafc4a0889aa60d7fa550ec",
      "sizeBytes": 97111
    },
    "research/class-mapping-history-v1/replay-tools/class-xp-continuation-target-review.mjs": {
      "sha256": "67196db3db83e91a3e5582137613abec9056b47609279299093dffe19c745b69",
      "sizeBytes": 9082
    },
    "research/class-mapping-history-v1/replay-tools/continuation-alias-audit.mjs": {
      "sha256": "3e73af53e5b780351e04b2718b601bdfbaa3a069bdec955dd2ecdaa4439440ca",
      "sizeBytes": 7631
    },
    "research/class-mapping-history-v1/replay-tools/continuation-candidates-validate.mjs": {
      "sha256": "f5bff7582608b9401e862a1cbdd78fb60a0e9c2d471a30d06f1408d39df3f012",
      "sizeBytes": 40618
    },
    "research/class-mapping-history-v1/replay-tools/continuation-contract.mjs": {
      "sha256": "4905713fb4b2ebba9219eecee479f07f7c4656c0140313ed5006267ba8dfd456",
      "sizeBytes": 61091
    },
    "research/class-mapping-history-v1/replay-tools/continuation-order-audit.mjs": {
      "sha256": "24c38cd30874c697225c4aeaac87810e8f410de25be14f3e536812933bb3a364",
      "sizeBytes": 6485
    },
    "research/class-mapping-history-v1/replay-tools/coverage-gaps.mjs": {
      "sha256": "342db1c0fe3145bfbd1803952c0cd614dfb177df43ad4ec072f1855f29b7877a",
      "sizeBytes": 64099
    },
    "research/class-mapping-history-v1/replay-tools/dmg175-availability-projection.mjs": {
      "sha256": "1469d1c99d5dc2a59aab7f1e2aa3d2cbecbf3727f716011e81a2107dc0de46ff",
      "sizeBytes": 30811
    },
    "research/class-mapping-history-v1/replay-tools/dmg175-current-jo-source-gap-mm-v1.mjs": {
      "sha256": "fc78c1915afe38a614f4226e3dd23fce798eed9e449109ee66ba9ef65019d3f2",
      "sizeBytes": 7579
    },
    "research/class-mapping-history-v1/replay-tools/dmg175-current-monetary-source-questions-mm-v1.mjs": {
      "sha256": "48e0c26a5274a54a11571fbb7302488b26bc8cdd5ef8c3a6110970cf75393218",
      "sizeBytes": 3111
    },
    "research/class-mapping-history-v1/replay-tools/dmg175-current-source-handoff-mm-v1.mjs": {
      "sha256": "8b10179e630020373bff9658dddd5f8cc73d70700ab4f6a5ff47bea95c131c6a",
      "sizeBytes": 11650
    },
    "research/class-mapping-history-v1/replay-tools/dmg175-current-successors-mm-v1.mjs": {
      "sha256": "1a839c69802f995e04ed3ac9846f9ef32bf8014b968fcecdef629e93b52cb53f",
      "sizeBytes": 657
    },
    "research/class-mapping-history-v1/replay-tools/dmg175-hired-native-source-handoff-v2.mjs": {
      "sha256": "718ddf789911e84a6888ac8584cb46762b78e93391dee83778b753fd34d06340",
      "sizeBytes": 17658
    },
    "research/class-mapping-history-v1/replay-tools/dmg175-source-handoff-transition-v1.mjs": {
      "sha256": "8f246f4fb0e9ed2d970819140c7881f2ccc2e1384219fab0af2a98e4bb81b8be",
      "sizeBytes": 7905
    },
    "research/class-mapping-history-v1/replay-tools/jo-unextracted-price-registration.mjs": {
      "sha256": "fc6b65c2f62b3aa0ddfa90a72a02b83358de02d43d4d2f85efd1b924a5163dc5",
      "sizeBytes": 4826
    },
    "research/class-mapping-history-v1/replay-tools/mechanics-audit.mjs": {
      "sha256": "3217969241adda3df05cb119635ff691d87fbcefcb5ec29988d76dede8b6c4e4",
      "sizeBytes": 17012
    },
    "research/class-mapping-history-v1/replay-tools/mechanics-citation-page-transfer.mjs": {
      "sha256": "96c75f18696db3b423cbdff5e2f68f1099ae72dc206aa84a150e681e61b384c1",
      "sizeBytes": 5144
    },
    "research/class-mapping-history-v1/replay-tools/mm-current-safe-json-v1.mjs": {
      "sha256": "e024b07175cddb34f5daf35c8b04fcd0a7e06977bcbe3e1a30a2405dac84bb38",
      "sizeBytes": 2405
    },
    "research/class-mapping-history-v1/replay-tools/monetary-context-extent-contract.mjs": {
      "sha256": "64838c56e5303a6a63f4ff0e33c3ee2bb15cd445c4fca50c276dc2906af3074d",
      "sizeBytes": 10935
    },
    "research/class-mapping-history-v1/replay-tools/monetary-current-source-questions.mjs": {
      "sha256": "f93fa8141ff8fb5edf7930e0b7052ae0ce3e6b1e9cb50fccde974f11a41d5d7f",
      "sizeBytes": 11446
    },
    "research/class-mapping-history-v1/replay-tools/monetary-row-identity-audit.mjs": {
      "sha256": "1b36cb1fc9c6449d9c7172974d87293e155fea6613af9666b47c72f4fd6947d5",
      "sizeBytes": 165238
    },
    "research/class-mapping-history-v1/replay-tools/monetary-source-geometry.mjs": {
      "sha256": "a89f9681bf5e9ea24537a444ff5f3cdde0659eef90bd78ac4163b2b2ec2b8274",
      "sizeBytes": 2141
    },
    "research/class-mapping-history-v1/replay-tools/monetary-source-inventory.mjs": {
      "sha256": "3ca54d389e55efdb2c225c0e5da4564e1ce1831b641c7a02fac911a8c568f0be",
      "sizeBytes": 211101
    },
    "research/class-mapping-history-v1/replay-tools/monetary-source-render-frames.mjs": {
      "sha256": "d6abef6fc1cf44f322ffc5a5a203c0539a23c5e4bd6d4827682aa5d947b24de7",
      "sizeBytes": 2582
    },
    "research/class-mapping-history-v1/replay-tools/monetary-unit-provenance-audit.mjs": {
      "sha256": "ba0d03096cb47f2454dbd923055988e7e96cc26c4d5f28086cd651fff5056406",
      "sizeBytes": 51713
    },
    "research/class-mapping-history-v1/replay-tools/native-h-epoch-guard-v2.mjs": {
      "sha256": "b20082de376a824e9e6f73bbdf8b510b427588a2eda0f3613e08a55560797afe",
      "sizeBytes": 4304
    },
    "research/class-mapping-history-v1/replay-tools/price-source-inventory.mjs": {
      "sha256": "0bee75f1a3398194f53637a9e4b7b463c559b193d8722edb9a3a40698fc1b951",
      "sizeBytes": 143163
    },
    "research/class-mapping-history-v1/replay-tools/quantity-source-absence-audit.mjs": {
      "sha256": "305badd4557d6d51554ed14ab61a86d9224684b5b3e2c00b0892dc487826c965",
      "sizeBytes": 31187
    },
    "research/class-mapping-history-v1/replay-tools/refresh-gaps-handoff.mjs": {
      "sha256": "69260c2c9ab870f8c00edd4fb879b2d14cd0425647b67fc88b65385cbd6eb949",
      "sizeBytes": 86957
    },
    "research/class-mapping-history-v1/replay-tools/scan-catalog.mjs": {
      "sha256": "903e88c09682ac76807203d518ee82b8c23afafc636f325cfdc4e21be87c2273",
      "sizeBytes": 3335
    },
    "research/class-mapping-history-v1/replay-tools/source-completeness-coverage.mjs": {
      "sha256": "16a79ceec8e152c09feff665cb6f04514f8f1dd8d31963fd42d1208c95f8a014",
      "sizeBytes": 13716
    },
    "research/class-mapping-history-v1/replay-tools/source-frame-coordinate-bridge.mjs": {
      "sha256": "096fbde06e129f8f6e0a70ceee45aee60357ca304c2290dec7a8969a427dc93e",
      "sizeBytes": 11465
    },
    "research/class-mapping-history-v1/replay-tools/source-owner-identity-audit.mjs": {
      "sha256": "1e4871a757b8b80fd98a1ae8f9960dac336e78e840995a29009a11a59132ab47",
      "sizeBytes": 33828
    },
    "research/class-mapping-history-v1/replay-tools/source-raster-coverage.mjs": {
      "sha256": "0e1861b259eaf3d269279238e735b7c6884926cb032b277ff115235846c771fb",
      "sizeBytes": 45221
    },
    "research/class-mapping-history-v1/replay-tools/source-report-consistency-audit.mjs": {
      "sha256": "ce1a70b89bf9fcb289062b6c7516e131559f2459a8a9b03a942ff7b15bb1dff5",
      "sizeBytes": 17320
    },
    "research/class-mapping-history-v1/replay-tools/source-scan-inventory.mjs": {
      "sha256": "62782478451b6d2d558dcd7edc99b9a96711f196d56b4f9bf7a5a5aefa40632c",
      "sizeBytes": 7783
    },
    "research/class-mapping-history-v1/replay-tools/source-target-label-audit.mjs": {
      "sha256": "f9e5c6719b7a8b383fc5afd0b577f6cdf2b151d3bcb4ea1f9d0b04c8293a36d1",
      "sizeBytes": 14930
    },
    "research/class-mapping-history-v1/replay-tools/source-visual-coverage.mjs": {
      "sha256": "28a8594cdee85717353b9aa849f4f1cde4a350cba46d6a5581a045c0d250b0b9",
      "sizeBytes": 66513
    },
    "research/class-mapping-history-v1/replay-tools/source-visual-dispositions.mjs": {
      "sha256": "ab85c300cabcf687dfafbaec71d18401d6de1788793c59210410a0cacdf5a196",
      "sizeBytes": 14694
    },
    "research/class-mapping-history-v1/replay-tools/ua-source-handoff-transition.mjs": {
      "sha256": "3adfe83ac23945e103c00c0c860d4d741b2ee0af4015db3bb91925d34e544cc2",
      "sizeBytes": 5877
    },
    "research/class-mapping-history-v1/source-postmetadata-facade-v1/pass8-ua-source-history-v1.proposed.mjs": {
      "sha256": "68b4bbcaa3033926191d2a07c45b0ec134625487b290fb8ee4cc1fd0dfc9c311",
      "sizeBytes": 24543
    },
    "research/class-mapping-history-v1/source-postmetadata-facade-v1/ua-source-batch6-jo-fixture-v1.proposed.mjs": {
      "sha256": "c9aa948bca45e9301b6c5654b153156c68e0940b7ee5be554b69c8a679aa570e",
      "sizeBytes": 16165
    },
    "research/class-mapping-history-v1/source-postmetadata-facade-v2/jo-closed-loader-context-v1.mjs": {
      "sha256": "d3449de7a88946ca32a67bd821e173cc1160935a0169ae5e6bcc15ac408fecf5",
      "sizeBytes": 5532
    },
    "research/class-mapping-history-v1/source-postmetadata-facade-v2/pass8-ua-source-history-v2.proposed.mjs": {
      "sha256": "40aac4c618d30f0e275eca5d043280259254fb3e8f84ae1e5298f260dc93e62e",
      "sizeBytes": 27702
    },
    "research/class-mapping-history-v1/source-postmetadata-facade-v2/ua-source-batch6-jo-fixture-v2.proposed.mjs": {
      "sha256": "694e7f1cd4862ae256aac8db20b00db1fd42e7fce8753c2a48a1fab0dd5be4fd",
      "sizeBytes": 16673
    },
    "research/class-mapping-source-epoch-v1/closed-historical-reader-v1.mjs": {
      "sha256": "106a2586b32603b30e5fb507d443f9bbafbd8d2ae20756c25e9998c95fd75088",
      "sizeBytes": 43677
    },
    "research/class-mapping-source-epoch-v1/historical-projection-kernel-v2.mjs": {
      "sha256": "606787395de0b70a4843becf80273c6cc23e532537e986c4e534312c5c267867",
      "sizeBytes": 13069
    },
    "research/class-mapping-source-epoch-v1/historical-reader-auxiliary-policy-v1.mjs": {
      "sha256": "e6f79a3b58f333b97616b33be4b645f6ac6363d3c5b770a24980a2638434a8ea",
      "sizeBytes": 15290
    },
    "research/class-mapping-source-epoch-v1/historical-reader-code-roots-v1.mjs": {
      "sha256": "dc5c7d596430fb9ecc321af75074c8af1e878e98aff47ef03778520d5f3df24f",
      "sizeBytes": 11274
    },
    "research/class-mapping-source-epoch-v1/native-qualification-pins-v1.mjs": {
      "sha256": "c418e9deca9013edefdd57a76555886a944de2cd730cefecdb70224f1bee0c4b",
      "sizeBytes": 1533
    },
    "research/class-mapping-source-epoch-v1/precoverage-builder-v1/production-readonly.mjs": {
      "sha256": "7ffeaec1a66a94732960524861b8eaec8a3cf7b39e667c7d13c37e9c612f81e2",
      "sizeBytes": 6627
    },
    "research/class-mapping-source-epoch-v1/precoverage-builder-v1/source-body.mjs": {
      "sha256": "ef09d17bebb081f7705b61974df8f5aec2ee62896459ad6e22e4c57826a27c61",
      "sizeBytes": 12976
    },
    "research/dmg175-validation-coordinator-v1/first-fullsuite-classification-v1/whale-counterfactual-context-v1/v5/dmg175-h-native-jo-test-context-shim-v5.mjs": {
      "sha256": "5a5e285100aef213789035a55d89816e2a0ac99570d9eba33f9a7633a8c6bd27",
      "sizeBytes": 4470
    },
    "research/dmg175-validation-coordinator-v1/first-fullsuite-classification-v1/whale-counterfactual-context-v1/v5/whale-counterfactual-context-v5.mjs": {
      "sha256": "af9f8ccd6cb66259530c4cd2d964349bd74bae13b34bb0cacda47e47c4a46b68",
      "sizeBytes": 32029
    },
    "research/mm-current-cli-successors-v1/native-monetary-source-questions-kernel-mm-v1.mjs": {
      "sha256": "d9a24bf0562b73263196fa832f09d4677e35701be6a2e1875882e8435e40ded1",
      "sizeBytes": 28192
    },
    "research/mm-source-history-v1/historical-h-catalog-blobs-v1.json": {
      "sha256": "c35dbe28d2d4a96dceac0a78979dcd97972b4c3a776c129976d627993642b28e",
      "sizeBytes": 209937
    },
    "research/mm-source-history-v1/historical-h-continuation-images-v2.json": {
      "sha256": "54da91999758bb4d4ad236fcf16196d9d46ace2820fe8a3065837a586762c0fe",
      "sizeBytes": 65989
    },
    "tests/class-mapping-current-handoff-alias-v1.test.mjs": {
      "sha256": "4056a1331a24f3dc306641a84dc51049c6f3fd1f2ad610aaabb2378f87075095",
      "sizeBytes": 3934
    },
    "tests/class-mapping-current-handoff-builder-v1.test.mjs": {
      "sha256": "2ad4bc5f44014962105eaeb2598b405c333f3170732458b8e3bd9ed461f492e4",
      "sizeBytes": 8096
    },
    "tests/class-mapping-current-jo-gap-v2.test.mjs": {
      "sha256": "870f615df448ff1b4966e59785e0b3ad3bdf41d91c0a48f7e10c8257c5cb4562",
      "sizeBytes": 10293
    },
    "tests/class-mapping-current-report-phase-interface-v1.test.mjs": {
      "sha256": "16f6709b0d8e0447fca96d54db83d3267901549d778ab83e6477be9558df2970",
      "sizeBytes": 8035
    },
    "tests/class-mapping-current-s1-report-behavior.test.mjs": {
      "sha256": "24edddd8ac83aac4ab7c70cfaccf5ff37bdc6d7aadf10e7e27bf3e919fd27b55",
      "sizeBytes": 30659
    },
    "tests/current-s1-import-boundary-v2.test.mjs": {
      "sha256": "7f26176ff2be5488c384f6f2fb44f6d9e884b26e5baad7948a61a2f6792056b8",
      "sizeBytes": 3754
    },
    "tests/fixtures/class-mapping-current-report-phase-before-v1.json": {
      "sha256": "7206750ec06fb8b2eed6479e8765afe1ce85c5d8893fd743c95067070f23dc4f",
      "sizeBytes": 4423
    },
    "tests/fixtures/class-mapping-source-handoff-before-mechanics-input-v1.json": {
      "sha256": "8f79a9b023f86a158857feed6b089cc39435384702403b4c7f8eb81e5c975c92",
      "sizeBytes": 7897
    },
    "tests/fixtures/matrix-baseline.mjs": {
      "sha256": "fb5ddc3f922e84799589d9019fe9a87f4f6cedbcffe68c51e3b2217a9b9684a7",
      "sizeBytes": 663
    },
    "tests/fixtures/source-report-consistency-record-target-old-helper-before.mjs": {
      "sha256": "4fe4ce940f0822732b98d59f009d6ee3e0d1dd5659973b2a9a0ccc9c251b65e4",
      "sizeBytes": 14226
    },
    "tests/fixtures/source-report-consistency-record-target-partial-helper-before.mjs": {
      "sha256": "4bd65904bc1d6983ceda83e449c45a59c7873264a15f6e7869de3b37791ce7d4",
      "sizeBytes": 14469
    },
    "tests/fixtures/weapon-source-report-consistency-before.mjs": {
      "sha256": "8f10a0dfa96047f19c53deb3283505a42954092323c2bbf698d8e8091e8e25f5",
      "sizeBytes": 15047
    },
    "tests/helpers/batch6-dmg175-source-history.mjs": {
      "sha256": "d8485809eb27d9debdfa686e403d82d2a9947d4eb1863348548321319df50517",
      "sizeBytes": 2100
    },
    "tests/helpers/class-mapping-current-cohort-factory-v1.mjs": {
      "sha256": "1ded2b77aa722b3650556030ebdbf9fede68ef7a5c547358655bb9993a3ef24e",
      "sizeBytes": 12122
    },
    "tests/helpers/class-mapping-current-cohort-v1.mjs": {
      "sha256": "dbdcd4bb84de1c74a7f458f94a8610f95ddac38d4a38a4cba5d8f78e815b96f8",
      "sizeBytes": 1054
    },
    "tests/helpers/class-mapping-historical-mm-test-inputs-v1.mjs": {
      "sha256": "23a8ea646bfc280489a7466646ea3b2aeecca713db87bde36d533a9720296a1f",
      "sizeBytes": 5069
    },
    "tests/helpers/class-mapping-historical-test-inputs-v1.mjs": {
      "sha256": "e12468020344c51587db958ffd99d23eaa33a30e914847c739c4e80176e66522",
      "sizeBytes": 13746
    },
    "tests/helpers/historical-h-catalog-view-v1.mjs": {
      "sha256": "3725a74917e27b7ca3ac877555cd221593ae58705c6f8d2b9a763e363897b5c1",
      "sizeBytes": 15239
    },
    "tests/helpers/pass8-character-reference-history.mjs": {
      "sha256": "67ebc08c45e088b41c3b208c1f01cffa6965c36ed8f9875a9d603f84ff5840b9",
      "sizeBytes": 6305
    },
    "tests/helpers/pass8-citation-target-crop-history.mjs": {
      "sha256": "aa04c851bf8f89f2cb1a16105ae277003a1a3c2256356f3d058bb1ce91aa2785",
      "sizeBytes": 11247
    },
    "tests/helpers/pass8-phb-source-history.mjs": {
      "sha256": "a8a62458de8467f76500dd942c7f8e2f48e97227e7d555df26d5358c7175ac75",
      "sizeBytes": 9188
    },
    "tests/helpers/pass8-s1-paladin-catalog-history-v1.json": {
      "sha256": "b8b734885b277e839466ccec33d45d6ed97e4bfe2404b3ee906df499c9bb8429",
      "sizeBytes": 2641
    },
    "tests/helpers/pass8-s1-paladin-catalog-history-v1.mjs": {
      "sha256": "5eee41d189276ac818bffbd470212be1cf857f3a5950901d8d0cf9e6c1cc1fce",
      "sizeBytes": 3814
    },
    "tests/helpers/pass8-ua-source-history.mjs": {
      "sha256": "9c19efb6aaee7ce19a9a84ef57ebd8002a95f7315f95222914910cf8326cfe00",
      "sizeBytes": 10615
    },
    "tests/helpers/pass8-weapon-source-history.mjs": {
      "sha256": "439a7b08c83eabb80d419e79b9b2d7820dbc8c47b62f23166721eb6ab1c8c339",
      "sizeBytes": 12239
    },
    "tests/helpers/pass8-xp-continuation-history.mjs": {
      "sha256": "cc8a0ff5ad473026c71c6353b224903eabac8e960b4945df88e5da8191c4e9e7",
      "sizeBytes": 9801
    },
    "tests/helpers/ua-history-source-directory-v1.mjs": {
      "sha256": "14009e910dee1347111e28237ed6fe565c59a22b4b88214b6e584aa1e3fc24d5",
      "sizeBytes": 7737
    },
    "tests/helpers/ua-source-batch6-jo-fixture.mjs": {
      "sha256": "9db628a8d0ad22d0a07449bf3921621bf5dc48a6d443cbb817cf084031efc0b3",
      "sizeBytes": 15365
    },
    "tests/helpers/ua-source-dmg74-matrix-batch.mjs": {
      "sha256": "c1c0b1069fe9a2f7eb4a48339812b8886c9d4e0bc9fbc1d00453f35d60ea5e4f",
      "sizeBytes": 7930
    },
    "tests/helpers/version29-native-source-context.mjs": {
      "sha256": "12296c341deebe41c44111d6eec9cfd1a8d4b9ca7d58a2aa1105cbc746530c09",
      "sizeBytes": 2016
    },
    "tests/helpers/xp-mutation-child-transport-v1.mjs": {
      "sha256": "a1e011f7b8fca32b98a2d9bfc9dda457ecf38f2a6848dc236d960ecdc67fa42c",
      "sizeBytes": 5337
    },
    "tests/mm-search-cjs-transport-v1.test.mjs": {
      "sha256": "c2bd4c31aa3e775d92a0dc5493f4b756a27300960a6a1359bbd7289ff7b4c4e1",
      "sizeBytes": 3633
    },
    "tests/p175-historical-current-boundary-v1.test.mjs": {
      "sha256": "ef92fc3647ce40fae98cda0c724107cb7bae5848e0dfb68ad667613d3e0d38d2",
      "sizeBytes": 2962
    },
    "tests/p175-historical-module-transport-v1.test.mjs": {
      "sha256": "2bbb94dad3a6630da1f0510997065eca072d1a3b04c66e296ff5ff6645ecd322",
      "sizeBytes": 2507
    },
    "tools/assemble-class-mapping-v1.mjs": {
      "sha256": "aef3ec575c85f669d55df111c6f88b9e576877b5f9c9531f3e43fda7b198fb91",
      "sizeBytes": 7283
    },
    "tools/bind-class-mapping-source-audit-input-commit-v2.mjs": {
      "sha256": "6cc7708c0aabf14ccf9c4c03059a884f81e90bec50aa949ef5c458c5e37a68fb",
      "sizeBytes": 39040
    },
    "tools/citation-context-contract.mjs": {
      "sha256": "78c6b2d52c5bfa477f06bd520c5fc568d8c1fbc2f1bf76b00e1fb29b01f67129",
      "sizeBytes": 4153
    },
    "tools/citation-override-identity.mjs": {
      "sha256": "140de83cbc9b039e43615cdc934ca9e2d998ad7fc2c39ae4b140d68ec9123067",
      "sizeBytes": 4268
    },
    "tools/citation-region-role.mjs": {
      "sha256": "e96802384ce7328055150da935b4279dff252b7ebfd5e5a954559b38b75257c5",
      "sizeBytes": 1976
    },
    "tools/citation-systemic-inventory.mjs": {
      "sha256": "613504f65cd8cd2dbf6d0147dc312fe6f92850ecff41e6fc2320d9352f320f30",
      "sizeBytes": 97077
    },
    "tools/class-mapping-assembly-core-v1.mjs": {
      "sha256": "ac18372a4f518e504db7141102d866397cd388e93e52a4c2d851446b68ef2ea8",
      "sizeBytes": 4698
    },
    "tools/class-mapping-current-consumer-runtime-v1.mjs": {
      "sha256": "eddac05f87eb17876f70fc93952a0be04f3139a2f8815c38c47668b9d5e38a5b",
      "sizeBytes": 19934
    },
    "tools/class-mapping-current-consumer-seal-verifier-v1.mjs": {
      "sha256": "2024a67b10faf01292838f4c1f69f70b634ee6cdbab063cdaa04b72e36902678",
      "sizeBytes": 12159
    },
    "tools/class-mapping-current-head-commit-v1.mjs": {
      "sha256": "318de6e784b3ea6932878ed8fcc25592def4e27bff0b95355aa73f99ef227f22",
      "sizeBytes": 1734
    },
    "tools/class-mapping-current-jo-gap-v1.mjs": {
      "sha256": "1a36b58c8e6da6bc281d46b3028372feb6e5c26014cb79ff4ef01cf004d44199",
      "sizeBytes": 18036
    },
    "tools/class-mapping-current-monetary-question-kernel-v1.mjs": {
      "sha256": "79a0c66c3e5085a4d442d6497497671631691a0042654cc95dd0bb8be575a085",
      "sizeBytes": 32041
    },
    "tools/class-mapping-current-monetary-questions-v1.mjs": {
      "sha256": "3cc9f0257ebbe39e6e078db4229ec81e9ace79dd85bf8530470da35fb8d9e667",
      "sizeBytes": 1568
    },
    "tools/class-mapping-current-source-gate-v1.mjs": {
      "sha256": "b1f0a580188bd8a1597ca1b0f5cf8ff72ec38b46555968a5d79f8a3b591a5bd7",
      "sizeBytes": 376
    },
    "tools/class-mapping-current-source-handoff-v1.mjs": {
      "sha256": "4bf69c7d6b5bbc67807ce21476d96c82c72179ecd4108f18af48e8bb6bec8289",
      "sizeBytes": 17482
    },
    "tools/class-mapping-current-successors-v1.mjs": {
      "sha256": "66c4ae039d4765679e1231ada231797c18a57aa52d55502e4f4e74944a4f17ec",
      "sizeBytes": 784
    },
    "tools/class-mapping-current-ua26-marker-v1.mjs": {
      "sha256": "865591282907a517ce93211c8c3ef9d35fd67ce4c0b6ec0d32b0e149b86d79f8",
      "sizeBytes": 7766
    },
    "tools/class-mapping-frozen-parent-artifacts-v1.mjs": {
      "sha256": "1307f8693d9c337ba83769bb79be0b31ff9424873b82a86994f6186f221aa53b",
      "sizeBytes": 4803
    },
    "tools/class-mapping-native-contract-v1.mjs": {
      "sha256": "14002939eac2f3ca2f0f246cf5c0230cf9c2f7daebe4a8b5ecba5723cd7c4c9b",
      "sizeBytes": 42832
    },
    "tools/class-mapping-raw-git-v1.mjs": {
      "sha256": "174d777a6ad719ca783bf8f0345c867469b6b8fb33927e34d744a22362bca909",
      "sizeBytes": 5374
    },
    "tools/class-mapping-report-input-contract-v2.mjs": {
      "sha256": "9e368b4bc745ccd0f79dd1a2f5822b488881287ffc5de42b631478270f0a6d3e",
      "sizeBytes": 108344
    },
    "tools/class-mapping-report-runtime-guards-v1.mjs": {
      "sha256": "022a81cbdf20c7372ce22b1bd41f0c34456291778ef61f0db5eb39aad41e532a",
      "sizeBytes": 14367
    },
    "tools/class-xp-continuation-target-review.mjs": {
      "sha256": "996358f1938b7181d96d1011837f21ee60f1a448bc0b37c23b22c8ed2329a6ea",
      "sizeBytes": 9061
    },
    "tools/continuation-contract.mjs": {
      "sha256": "97e0fe73bd0bdd21d1f207ca97a65395794aede69b3e7803eca965e7f801cfa3",
      "sizeBytes": 61022
    },
    "tools/continuation-order-audit.mjs": {
      "sha256": "3f79e849bd52df548a297037871e5f993af1dfdbf56d027ff3c6cbc48818b9e8",
      "sizeBytes": 6470
    },
    "tools/coverage-gaps-class-mapping-v1.mjs": {
      "sha256": "286e8b6465bd34ecfda67aa30f0619e706091de337dcbd4c8e8ed83221d8949a",
      "sizeBytes": 64185
    },
    "tools/dmg175-availability-projection.mjs": {
      "sha256": "43d711afd6f086caeef99a907901759ce79fb3123060674426da7a303a6c9689",
      "sizeBytes": 30805
    },
    "tools/jo-unextracted-price-registration.mjs": {
      "sha256": "dc939de98ff9f796f6a1ec910aa8f0fc287508d6fbe5729c824af1ed4046f7c2",
      "sizeBytes": 4811
    },
    "tools/mechanics-audit.mjs": {
      "sha256": "528a5113193c8d973e5cdea94011f4d719a0d430543ca4024c0ecb837c4b617c",
      "sizeBytes": 21710
    },
    "tools/mechanics-citation-page-transfer.mjs": {
      "sha256": "edfad6e2dd9bfabe7a4befc8737c7bb5cefb1b898b046260905b30e39a59d2f4",
      "sizeBytes": 5123
    },
    "tools/mm-current-safe-json-v1.mjs": {
      "sha256": "e024b07175cddb34f5daf35c8b04fcd0a7e06977bcbe3e1a30a2405dac84bb38",
      "sizeBytes": 2405
    },
    "tools/monetary-context-extent-contract.mjs": {
      "sha256": "64838c56e5303a6a63f4ff0e33c3ee2bb15cd445c4fca50c276dc2906af3074d",
      "sizeBytes": 10935
    },
    "tools/monetary-row-identity-audit.mjs": {
      "sha256": "75dd1b6b1177c848c85b148bb806e6653ab6517979d3c7a3a1946f1021b63276",
      "sizeBytes": 165175
    },
    "tools/monetary-source-render-frames.mjs": {
      "sha256": "44dc5c4d5233fdf2a8b1a36742712f1b36f69ebcc8d2b6d8208303cdb9b41a39",
      "sizeBytes": 2520
    },
    "tools/monetary-unit-provenance-audit-next-native-v2.mjs": {
      "sha256": "e6a7cf108d92b8e8b3290561d44d0ac2cacb8f6f014433c3051dd5a8cd88445f",
      "sizeBytes": 54332
    },
    "tools/price-source-inventory.mjs": {
      "sha256": "21d7d1e629f80b114bb6d89f4cdabecdd965c27f46966a2a1c543c26a1d7b140",
      "sizeBytes": 149814
    },
    "tools/quantity-source-absence-audit.mjs": {
      "sha256": "77bf676538e5b64beb8046f921feebef5451376be67c9ad9e635fa1531625b97",
      "sizeBytes": 31124
    },
    "tools/refresh-gaps-handoff-next-native-v2-callshape-v1.mjs": {
      "sha256": "7f960d52ba72f026d3546e647005e094fd668560bd07e12cf67fea7acc861491",
      "sizeBytes": 88421
    },
    "tools/replay-historical-mm-native-tests-v1.mjs": {
      "sha256": "06cd2c5b97e8db8cb6226fc5211fb9badcf595c5dc7609861780d400dc9e86c3",
      "sizeBytes": 7372
    },
    "tools/run-class-mapping-tests-v1.mjs": {
      "sha256": "5c30e58e577eececb3f0f6489e0b115d591b13679171c1b4f3b5a75637245a8b",
      "sizeBytes": 3406
    },
    "tools/scan-catalog.mjs": {
      "sha256": "903e88c09682ac76807203d518ee82b8c23afafc636f325cfdc4e21be87c2273",
      "sizeBytes": 3335
    },
    "tools/source-frame-coordinate-bridge-next-native-v2.mjs": {
      "sha256": "8638bf8e7d7dc237484d85b54a67d6ac02a4cff09401ccc6e350ae6bdee91b51",
      "sizeBytes": 13773
    },
    "tools/source-frame-coordinate-bridge.mjs": {
      "sha256": "3e5ddbeb3d62d787297fab50b267296d97db930a9b761f4542ddaa0e5bcd51f1",
      "sizeBytes": 11450
    },
    "tools/source-raster-coverage-next-native-v2.mjs": {
      "sha256": "ca4abd4462607ebd6f61c2197a0b05e60ec1f50413a4d50c141762d1862ad101",
      "sizeBytes": 46360
    },
    "tools/source-raster-coverage.mjs": {
      "sha256": "e7c0f2e988037a84a3cddb93b2d5b9e9d2a86037f9894476902290361c709db5",
      "sizeBytes": 45194
    },
    "tools/source-report-consistency-audit-next-native-v2.mjs": {
      "sha256": "a508c890b4edfff1c49d123dc3d99bee0782f54ba399cc607839266462561211",
      "sizeBytes": 18845
    },
    "tools/source-visual-coverage-next-native-v2.mjs": {
      "sha256": "39ac094b435a572f9f6e9fa724c3f5fae9a34e83bc43fbdd655e95226503013d",
      "sizeBytes": 66493
    },
    "tools/source-visual-coverage.mjs": {
      "sha256": "4938f333ac478c5c83a1497b16a5ae1223a809008326e667240210dfb24de1fa",
      "sizeBytes": 66463
    },
    "tools/source-visual-dispositions.mjs": {
      "sha256": "ab85c300cabcf687dfafbaec71d18401d6de1788793c59210410a0cacdf5a196",
      "sizeBytes": 14694
    },
    "tools/ua-source-handoff-transition.mjs": {
      "sha256": "3adfe83ac23945e103c00c0c860d4d741b2ee0af4015db3bb91925d34e544cc2",
      "sizeBytes": 5877
    },
    "tools/ua26-note-marker-audit.mjs": {
      "sha256": "4cd3e158451d842c4b097a0ddc726b5c248dfe2b0428cae719f1e4b27a85c49c",
      "sizeBytes": 17747
    },
    "tools/verify-class-mapping-current-reports-v1.mjs": {
      "sha256": "1ac85e15fd8b701fd08b3b7c852971d611180b3b4cc14f8c3a3984ddd6919edb",
      "sizeBytes": 5907
    }
  }
});
