# Preservation addendum: continuation typed-source negatives restored

The earlier actual-install review flagged that `tests/dmg175-continuation-contract-current.test.mjs` had lost six explicit current-MM manifest mutation controls when its H wrapper was retargeted.

I independently verified the root restoration receipt at `/workspace/vault-audit-private/pass8/root/mm-current-continuation-typed-negatives-preservation-v1/installation-receipt-v1.json` (SHA-256 `b5885200be5c457ee9c74b3e3de030b964280cf8c2ec156f09933e07d4d26e2b`). The `ac609` file is 1,863 bytes; its exact tail after the original first import line is 1,709 bytes with SHA-256 `f397eb449f1f93a0aad04c1b4422f8a4442b412583aac398e226503ca4897d9f`. The active file ends with that tail byte-for-byte and has the receipt's exact 1,913-byte SHA-256 `41cfa0f7298667974cef094ad2be4714974f892d5efecb4ffc1bc1d1b6b5ef5a`.

The only prefix change is the new MM-namespace H wrapper import and its explanatory comment. The imported H module loads the strict current-MM/H proof before the restored current-MM test body runs. The six original typed-source mutations are therefore restored without weakening the H retrospective checks.

Static preservation blocker lifted. The full uninstrumented capped test-file run is still pending root execution.
