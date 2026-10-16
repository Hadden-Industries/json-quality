# DRY follow-up from delivered portfolio changes

## Accepted outcome and route

The user requested that prior DRY plans and their actual implementations inform
further justified improvements here. Signed commits, messages, configuration
changes and direct delivery to `main` remain authorized. Baseline:
`a871239da6ef44b591b4416cd5808e42d59b9543`, clean worktree.

Risk class: R1. The bounded change consolidates development formatting selection
and producer npm-pack mechanics. Application behavior, public schemas, runtime
versions, dependency selections, acquisition safeguards and CI triggers retain
their existing contracts. No authentication, migration, concurrency, privacy,
financial, safety or material availability change is involved. A failure would
misroute a formatting mode or alter producer packaging; real native checks,
ordinary review and hosted qualification expose those failures. Recovery is a
signed forward repair or revert with affected qualification.

Markdown Quality adoption remains deferred. JSON quality CI remains manual;
automatic CodeQL and dependency submissions retain their current configuration.

## Prior plans checked against delivered implementations

- Markdown Quality's [DRY implementation plan](https://github.com/Hadden-Industries/markdown-quality/blob/cca2d8651d6aa5a8aceb32e8be0dcf9c5afc52a2/docs/plans/2026-10-13-dry-principle-remediation-implementation-plan.md)
  and delivered `scripts/core-package-stage.js` share producer mechanics between
  packaging and shipment inspection. Its entrypoint inventory and prose
  diagnostics share compatible facts while callers retain their admission and
  orchestration responsibilities.
- WebVOWL's [DRY plan](https://github.com/Hadden-Industries/webvowl/blob/c9c3f398/docs/plans/2026-10-12-dry-principle-remediation-implementation-plan.md)
  and delivered `dragHandleView.js` / `numericRangeControl.js` consolidate local
  mechanics while callers retain geometry, events and authoritative state.
- OwlAPI's [DRY plan](https://github.com/Hadden-Industries/owlapi/blob/b0102e230b8d6a8de5d633ae8d93e118d5834ace/docs/plans/dry-principle-remediation.md)
  and integrated file inventory distinguish shared vocabulary/defaults from
  parser-specific policy, and shared measurement mechanics from probe policy.

The reviewed chats report their actual delivery, repairs and evidence limits.
Their implementation details support a decision test: consolidate the same
knowledge and change responsibility; preserve independent expectations and
different trust, failure or deployment boundaries.

## Current audit and decisions

The current inventory contains 91 tracked files and 64 JavaScript modules.
Native Acorn comparison found no exact cross-file function-body clone of at
least 25 tokens and no exact cross-file token block of at least 65 tokens.
That is candidate discovery, not proof that semantic duplication is absent.
Review also covered current plans and rule ownership, CI composition, schemas,
formatting declarations, architecture/package tooling and fixture consumers.

| Finding | Shared knowledge and consumers                                                                                 | One authority and bounded treatment                                                                                                                                |
| ------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DRY-012 | `format` and `format:check` repeat the entire owned-file selection, including the new GitHub YAML glob         | One native Prettier npm command owns selection; existing check/write entrypoints delegate with their respective mode through native npm argument forwarding        |
| DRY-013 | `packCandidate` and `checkArchitecture` repeat native producer pack flags, execution bounds and report parsing | One operation in existing `scripts/pack.js` owns native npm pack invocation and keyed-report admission; callers provide npm/root and select dry-run or destination |

The formatting command is a direct maintained Prettier invocation, not a custom
runner or second formatter. The pack operation is producer-local; it does not
become a generic subprocess, archive or validation framework. Existing Prettier,
npm and dependency-cruiser selections and rights remain applicable; no new
software capability or dependency is introduced.

Retained distinctions:

- Archive writing retains clean-source, external destination, source identity,
  provenance and licence/membership guards in `packCandidate`.
- Architecture retains graph admission, shipped-import closure, metadata match,
  entrypoint checks and read-only behavior. Native pack dry-run writes no archive.
- Consumer archive/cache/installed-file checks reacquire their own evidence.
  They do not reuse producer approval or hashes as an admission shortcut.
- Independent parser-shape tests continue to invoke native npm directly. Test
  expectations and fixture policy do not derive from production helper results.
- Syntax admission is already shared; architecture failure and conservative
  affected-test fallback remain different caller contracts.
- Existing schema, runtime policy, CI setup and test lifecycle owners from the
  previous two DRY plans remain current. Historical plans, legal bytes and native
  locks remain unchanged. Similar short hashes, serializers and regexes alone
  do not justify another abstraction.

## Requirements, slices and falsifiable proof

| Slice     | Requirements and acceptance                                                                                                                                     | Proof                                                                                                                                                                                                                                                            | Release and cleanup                                                                                               |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| SLICE-012 | REQ/AC-012: one editable formatter selection reaches both existing modes, including nested `.yml` and `.yaml`; `check:full` still uses read-only formatting     | Execute actual `format` and `format:check`; inspect native npm forwarding and unchanged selectors/modes; reject any unrelated checkout changes                                                                                                                   | Commit this plan first; no new wrapper, dependency or formatter policy                                            |
| SLICE-013 | REQ/AC-013: one native producer pack operation serves archive production and architecture; ignore-scripts, native report format and bounds retain their meaning | Real temporary npm fixture proves dry-run creates no archive, destination mode creates its reported archive, and neither runs a prepack sentinel; retain independent keyed/legacy report tests and all architecture negatives                                    | Callers retain their different guards and effects; fixture cleanup stays with the existing owned-directory helper |
| SLICE-014 | REQ/AC-014: current ownership guide names the new owners and retained boundaries; final source is signed and verified                                           | Focused pack/architecture tests, actual architecture admission, formatting, policy drift and JSON checks; one final HISEW affected receipt; consolidated ordinary review; manually dispatched exact-head producer and full consumer matrix plus automatic CodeQL | Retain raw evidence externally, reconcile resources and complete HISEW using eligible proof                       |

QA-012: changing formatter selection requires one current edit, while check mode
continues to write nothing and explicit format mode retains native writes.
QA-013: a package prepack sentinel must remain absent in both native pack modes;
dry-run must leave no `.tgz`, and destination packing must produce the reported
archive. Expected outcomes are authored independently of the shared operation.
QA-014: missing/failed native analysis, malformed reports or a failed runtime lane
cannot produce a passing completion claim.

One integration owner consolidates implementation before ordinary review. No
parallel writers, separate security scan or second vendor verifier are justified
by this R1 tooling-only scope. Any repair receives affected checks and narrow
review. Settle formatting, staging and signed implementation commits before the
canonical HISEW receipt; real package qualification needs clean committed source.
Hosted qualification provides the archive-writing/transport boundary proof and
is distinct from local unit evidence. Do not rerun a passing suite for bookkeeping.

Replan if implementation changes runtime/public contracts, weakens fresh
admission, changes package selection or needs a new dependency. Maintainers
observe native formatter/pack output, architecture failures and the final hosted
gate. No service telemetry, data migration, feature flag or downstream adoption
is part of this change.
