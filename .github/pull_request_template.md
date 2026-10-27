## Problem and change

Describe the consumer or contributor problem and resulting behavior.
Keep the PR in draft while batching changes; marking it Ready for review requests full acceptance of that exact candidate.

## Verification

Record commands, results and gaps for focused/affected checks, Markdown and JSON checks.
Include full, transported-package or hosted evidence when the changed contract requires it.
Link the deliberate CI run and its original producing attempts where a job was retained by a partial rerun.
After a source/policy/base update, return to draft and request a new ready checkpoint.

## Impact

State relevant CLI/API/schema/output, runtime, JSON-preservation, protected-input, dependency/license and performance effects.
Describe recovery for any material tooling or package change.
Keep unrelated edits separate; report vulnerabilities through the private security channel.
Call out changes to CI, tests, evidence or trust policy for the owner's review before merge.
The owner merges deliberately after `CI / acceptance` passes; no extra required reviewer or unattended merge is introduced.
