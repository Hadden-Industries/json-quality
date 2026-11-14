# Retire accepted pilot channels

Accepted baseline: the user's 2026-11-14 instruction, “Implement the durable solution using hisew,” accepts the preceding channel policy and guarded release-workflow operation.
Starting source is main 8083e1203662fa35dad4ee5f3adaf3c90c15eb71.
This continues the existing R2 release-controller undertaking; completed 1.0.1 publication and all historical evidence remain original facts.

## Outcome and boundary

REQ-001: latest identifies the accepted stable family. pilot identifies an active evaluation candidate and is absent between candidates.
Retire the three 1.0.0 pilot aliases after confirming the immutable stable 1.0.1 family.

REQ-002: supply an explicit retire-pilot family availability operation through the existing manually dispatched promote-release.yml and its npm-promotion environment.
Reuse the existing concurrency group, admission transport, native CLI, journal, service continuation, completion observer and original-history reader.
No new publisher configuration, background release trigger or npm authority in GitHub archival is needed.

REQ-003: bind every package's pilot preimage, an explicitly approved absent target/no-op, the unchanged latest stable version and immutable GitHub marker.
All selected nonempty preimages identify one retired version whose accepted immutable qualification is authenticated.
Retiring a newer active candidate, changing latest or classifying a GitHub release is outside this operation.

REQ-004: preserve original intent/outcome/acknowledgement bytes.
A request is issued once with npm fetch retries disabled.
Readback may wait under the existing deadline.
Partial and unknown outcomes are observed and reconciled before a new reviewed remaining-scope operation; rerunning must not replay an uncertain write.

REQ-005: preserve current promotion, alignment and restoration contracts and historical schema readers.
New pilot operations must never be interpreted as latest restoration.

The initial live operation uses expected pilot 1.0.0 and latest 1.0.1 for all three packages.
Already-absent aliases are explicit no-ops.
Unexpected tags or release markers stop before dependent writes.
Existing version-pinned packages, immutable assets and their signed source tags remain available.

## Native selection and ownership

Official npm dist-tag supplies the registry mutation and OIDC authentication. npm 12.2.2 is already selected by this repository's producer toolchain; native dist-tag permission is independent of direct publishing.
Reuse the current compatible pinned toolchain and existing one-shot label adapter.
No new package, registry protocol client, parser, retry engine or release framework is introduced.

The official CLI removes a named tag; it does not expose a version-conditional removal command.
The repository therefore owns explicit preimages, serialization, just-in-time guards, durable outcomes and family readback.
These controls reduce the check/write race but cannot serialize an unrelated owner command outside the workflow; unexpected changes must stop continuation.

Existing family promotion already supplies this mechanism for latest.
Extend its selected-label semantics for the narrowly named retire-pilot operation rather than create a second publication engine.
A replacement such as semantic-release supplies channel publication but would not replace this repository's frozen-family qualification, signed checkpoints and service-specific recovery contracts; adopting it is outside this bounded extension.

The current stable target retains ordinary qualification and fresh security admission.
An older retired pilot target needs its previously accepted immutable qualification, not fresh execution of code whose availability is being removed.
Reuse the authenticated signed-history target reader and immutable asset identity guards for that historical proof.

Sources refreshed on 2026-11-14:

- [Native npm dist-tag commands](https://docs.npmjs.com/cli/v12/commands/npm-dist-tag/)
- [Trusted-publisher dist-tag management](https://docs.npmjs.com/trusted-publishers/#managing-dist-tags-with-trusted-publishing)
- [GitHub continuous deployment controls](https://docs.github.com/en/actions/get-started/continuous-deployment)
- [Distribution channel lifecycle](https://semantic-release.org/recipes/release-workflow/distribution-channels/)

The npm CLI remains an external tool under its existing licence/adoption decision.
Repository-owned AGPL release code supplies only the residual family policy.
No third-party source is copied or newly shipped.

## Vertical delivery and proof

SLICE-001 → REQ-001/002/003: extend the existing family scope, label adapter and guard/effect seam.
A representative test removes only pilot in native-first order while all three latest values and GitHub remain fixed.
Adverse tests reject missing removal authority, candidate drift and stable-default drift.
An absent pilot produces a readback receipt with zero mutation requests.

SLICE-002 → REQ-003/004/005: authenticate the current stable family and retired immutable target at read-only admission, then carry the exact selected label through continuation, completion, recovery and writer history.
Tests cover a changed second package after the first write, acknowledged writes whose readback fails, unknown writes, a fresh explicit remaining-scope operation and refusal to reinterpret pilot evidence as latest restoration.

SLICE-003 → REQ-001/002/005: document channel lifecycle and owner operation shape in the runbook and expose the operation in the existing workflow description.
Preserve the four service jobs, manually dispatched authority, main restriction, isolated writers and permission boundaries.
Update meaningful workflow/contract regressions.

SLICE-004 → REQ-001/004: complete focused/affected verification, required independent review and scoped security assessment on a frozen candidate.
Create signed detailed commits under the continuing release-control authorization.
Run the registered full HISEW profile once on the final prepared candidate using the persistent 1200-second limit; use actual hosted CI for the normal PR path.
After passing CI and integration, dispatch one guarded operation for the observed retired aliases, verify all three pilot tags are absent and latest remains 1.0.1, and retain its original native outcomes.

Focused verification follows promotion-service, release contract/history/recovery, workflow validation and source checks selected through their actual callers.
Full verification is the canonical HISEW run; no duplicate manual full suite is required just to decorate receipts.

## Acceptance scenarios and reconsideration

QA-001: with all pilots 1.0.0 and latest 1.0.1, exactly three pilot-removal requests complete and all protected labels/immutable markers remain fixed.
QA-002: all or some pilot aliases already absent produce approved no-ops; unrelated tags are retained.
QA-003: a newer pilot or changed latest before the first request yields zero writes; drift between writes stops subsequent requests and retains earlier outcomes.
QA-004: an acknowledged request followed by unavailable readback is independently observed without reissuing it.
A request whose outcome is unknown blocks mutation until reconciliation.
QA-005: malformed or substituted admission, retired-target identity, operation digest, journals or service continuations are refused at the existing boundary.
QA-006: existing latest promotion/alignment/restoration and historical qualified-target readers retain their original behavior.

Do not change package version, repack 1.0.1, move its signed tag, modify immutable releases, add a broad automatic trigger or relax required evidence to make cleanup pass.
Reconsider only the affected decision if native npm, publisher permissions or a current consumer contradicts the inspected contract.

The user remains the accountable owner.
Ordinary local choices and repairs inside this accepted envelope need no repeated approval.
A genuinely broader permission, unresolved effect or changed public policy is a concrete stop condition for that dependent action.
Keep planning, implementation, review, source delivery and observed tag removal as separate claims.
