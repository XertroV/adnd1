// Root-reviewed installation pins; no runtime caller overrides.
const freeze = value => { if(value && typeof value === 'object') { for(const child of Object.values(value)) freeze(child); Object.freeze(value); } return value; };
export const nativeQualificationPins = freeze({
  "materialized": true,
  "fixturePath": "research/class-mapping-source-epoch-v1/closed-native-body-cohort-v1.json",
  "fixtureSha256": "c534a9c7e925f8630cdcc53dfb41b248b3abb6209ae5e92b3e255db92e0aba10",
  "codePins": {
    "tests/helpers/class-mapping-current-cohort-factory-v1.mjs": {
      "sha256": "1ded2b77aa722b3650556030ebdbf9fede68ef7a5c547358655bb9993a3ef24e",
      "sizeBytes": 12122
    },
    "tests/helpers/class-mapping-current-cohort-v1.mjs": {
      "sha256": "dbdcd4bb84de1c74a7f458f94a8610f95ddac38d4a38a4cba5d8f78e815b96f8",
      "sizeBytes": 1054
    },
    "tools/class-mapping-current-source-gate-v1.mjs": {
      "sha256": "b1f0a580188bd8a1597ca1b0f5cf8ff72ec38b46555968a5d79f8a3b591a5bd7",
      "sizeBytes": 376
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
    }
  }
});
