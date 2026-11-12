// Actual immutable code-stage pins, generated only after the qualified QCC exists.
const freezeTree = value => { if (value && typeof value === "object" && !Object.isFrozen(value)) { for (const child of Object.values(value)) freezeTree(child); Object.freeze(value); } return value; };
export const currentConsumerCodeStagePins = freezeTree({
  "schemaVersion": 1,
  "artifactType": "S2 next-native current-consumer code-stage pins",
  "materialized": true,
  "sourceEpoch": {
    "sourceCommit": "2d35138027f00c0740975e519dbb3a2b6df76d14",
    "sourceTree": "40ecb15130b339658522794db6d9e1bc58f43b50",
    "fixturePath": "research/class-mapping-source-epoch-v1/closed-native-body-cohort-v1.json",
    "fixtureSha256": "c534a9c7e925f8630cdcc53dfb41b248b3abb6209ae5e92b3e255db92e0aba10"
  },
  "qualifierCodeCommit": "965260e81b47a87d28dabb88809403cb4171eb20",
  "qualifierCodeTree": "d6bca93a49239d5c7bbe2d0569cc103943938185",
  "qualifierCodeParent": "2d35138027f00c0740975e519dbb3a2b6df76d14",
  "sourceBodyInputHashes": {
    "dist/data.json": "16ddcc0ef49ea5ee9ca32b26353edb632d10db160e83bbd464458f5b73c1b573",
    "research/price-source-inventory.json": "b32a8f8126e73b28fd0609fc7e0856990a454402b440735a77627f26fe986564",
    "research/field-evidence-bindings.json": "dc8a912cd1054572257e83b654cedb63c8d2d6ff29f327ce0151498b4ad59827",
    "research/mechanics-audit-progress.json": "03643330c73dc3fe88f9abeb8a086883a3955d918cba2573e198563631a75785"
  },
  "codePins": {
    "tools/class-mapping-raw-git-v1.mjs": "174d777a6ad719ca783bf8f0345c867469b6b8fb33927e34d744a22362bca909",
    "tools/class-mapping-current-head-commit-v1.mjs": "318de6e784b3ea6932878ed8fcc25592def4e27bff0b95355aa73f99ef227f22",
    "tools/class-mapping-current-consumer-seal-verifier-v1.mjs": "2024a67b10faf01292838f4c1f69f70b634ee6cdbab063cdaa04b72e36902678",
    "tools/class-mapping-current-consumer-runtime-v1.mjs": "eddac05f87eb17876f70fc93952a0be04f3139a2f8815c38c47668b9d5e38a5b",
    "tools/class-mapping-current-monetary-question-kernel-v1.mjs": "79a0c66c3e5085a4d442d6497497671631691a0042654cc95dd0bb8be575a085",
    "tools/class-mapping-current-monetary-questions-v1.mjs": "3cc9f0257ebbe39e6e078db4229ec81e9ace79dd85bf8530470da35fb8d9e667",
    "tools/class-mapping-current-jo-gap-v1.mjs": "1a36b58c8e6da6bc281d46b3028372feb6e5c26014cb79ff4ef01cf004d44199",
    "tools/class-mapping-current-source-handoff-v1.mjs": "4bf69c7d6b5bbc67807ce21476d96c82c72179ecd4108f18af48e8bb6bec8289",
    "tools/class-mapping-current-ua26-marker-v1.mjs": "865591282907a517ce93211c8c3ef9d35fd67ce4c0b6ec0d32b0e149b86d79f8",
    "tools/class-mapping-current-successors-v1.mjs": "66c4ae039d4765679e1231ada231797c18a57aa52d55502e4f4e74944a4f17ec",
    "tools/coverage-gaps-class-mapping-v1.mjs": "286e8b6465bd34ecfda67aa30f0619e706091de337dcbd4c8e8ed83221d8949a",
    "tools/monetary-row-identity-audit.mjs": "75dd1b6b1177c848c85b148bb806e6653ab6517979d3c7a3a1946f1021b63276",
    "tools/monetary-context-extent-contract.mjs": "64838c56e5303a6a63f4ff0e33c3ee2bb15cd445c4fca50c276dc2906af3074d",
    "tools/monetary-source-render-frames.mjs": "44dc5c4d5233fdf2a8b1a36742712f1b36f69ebcc8d2b6d8208303cdb9b41a39",
    "tools/jo-unextracted-price-registration.mjs": "dc939de98ff9f796f6a1ec910aa8f0fc287508d6fbe5729c824af1ed4046f7c2",
    "tools/ua-source-handoff-transition.mjs": "3adfe83ac23945e103c00c0c860d4d741b2ee0af4015db3bb91925d34e544cc2",
    "tools/ua26-note-marker-audit.mjs": "4cd3e158451d842c4b097a0ddc726b5c248dfe2b0428cae719f1e4b27a85c49c",
    "tools/dmg175-availability-projection.mjs": "43d711afd6f086caeef99a907901759ce79fb3123060674426da7a303a6c9689",
    "dist/books.js": "99928f8e954ef213a51c70dc97d8f63b16a7b5eea9f1cba10b76b527ec17f811"
  },
  "contractPins": {
    "research/class-mapping-current-adapters-v1/native-monetary-question-contract-v1.json": "6f63999336bb41703ca608c3661131fb496c96f6983a8e0e1706f41a1f9a6e17",
    "research/class-mapping-current-adapters-v1/jo-current-source-gap-contract-v1.json": "88f5fc0fe4e19bbcc171a29f60a465df6c8a7c3b2486a8e56b9277d0d14e96fc",
    "research/class-mapping-current-adapters-v1/jo-current-source-gap-contract-v2.json": "9fd26ebccaa5211bdcac50e33ed2f4debc160b93aa0c4bee41d0603058915fdf",
    "research/class-mapping-current-adapters-v1/source-handoff-current-contract-v1.json": "ec9b805b59f0b87a846e179a564c7db51114441fd985a6e6f2c3f9d412ca1374",
    "research/class-mapping-current-adapters-v1/ua26-marker-current-contract-v1.json": "628f24a5f2b003a6c12f0f4085500be9beb16d31731d5661e8df9bb64fa52164",
    "research/class-mapping-current-adapters-v1/source-body-handoff-transition-v1.template.json": "1bbb0d85c59212b4be9385b5c1cb6f4d414848afd4c298497cac4d3272dcb159"
  },
  "receiptPins": {
    "research/class-mapping-current-adapters-v1/source-body-handoff-transition-v1.json": null
  },
  "externalSeal": "The code-stage seal commits and authenticates these fixed bytes before handoff receipt generation; the final seal authenticates the separate final working pin module."
});
