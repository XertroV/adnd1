# MM source-history runtime corrections — portable evidence

This packet preserves the before/after code and the complete serial test logs for the reviewed H/runtime corrections. It is research evidence only; root owns repository commits and release.

The current-MM source identity is fixed at `0f2d70a135e3ad486152bf00f21387d60a1a97ef` / tree `08010faf457df22cdb0a5ec35d2dcf79e622ade9`. The cohort remains at 1,064 owners, 5,731 canonical bindings (5,655 retained plus 76 added), 1,293 manual bindings, and 2 added owners. Source grades remain unchanged and unpromoted. Exact H source and full-M1 preimage identities are recorded in `evidence-index-v1.json`.

`before/` contains the requested exact helper and adapter revisions: helper `323`, rejected helper `a448` (preflight typo; never executed), mutable-output adapter `e1ee`, and first frozen-output adapter `3b80` (nested predicate failure). `final/` contains corrected helper `25bf`, frozen adapter `9215`, the tested current-MM successor test, and strict current-MM reader code/tests.

The full TAP logs are in `logs/initial`, `logs/final`, and `logs/core`. `evidence-index-v1.json` contains machine-parsed test/pass/fail counts and exit codes, root receipt references, exact file hashes, and the symlink write-through provenance. The rejected `a448` candidate is explicitly classified as a pre-execution rejection, not a failed test.

The earlier temporary mirror accidentally wrote five test files through symlinks. The affected paths and preserved before copies are listed in the index. Root later controlled-adopted the reviewed targets and confirmed all 22 source/metadata pins remained unchanged. No source assets or handoff payloads are included here.
