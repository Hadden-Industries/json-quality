# Remaining DRY remediation

## Accepted brief and route

The user requested a repository-wide follow-up DRY audit, including CI scripts,
tests and documentation, and authorized justified repairs through HISEW. Existing
authorization covers signed commits and direct delivery to `main`.
Baseline: `105b928f640347d189fe20b7ce9a9cc532fbc5e7`, clean worktree.

Risk class: R1. Decision owner: repository owner, through the current request.
This is a preservation refactor of local CI composition, neutral test setup and
test-only parsing, plus removal of duplicate documentation settings. Credible
failures are a broken CI bootstrap, incorrect fixture cleanup or a weakened test
oracle. Affected tests, ordinary review and hosted Windows/Linux qualification
make those failures observable. Reversal is a normal signed forward commit.
There is no runtime/API/schema, acquisition, authorization, data-migration,
concurrency, privacy, financial, safety or resource-limit policy change, and no
new cross-system protocol. CI executes the same setup in the same jobs.
No specialist security scan or separate vendor verifier is justified by this
bounded scope. Re-route if implementation reaches those boundaries.

## Audit and decisions

The baseline has 81 tracked files: 25 source files, 12 scripts, 22 test files,
5 documentation files, two schemas, one workflow, one runtime-policy asset and
13 root files. Inspection covered the inventory, JavaScript syntax/block and
fragment repetitions, CI/tooling composition, schema ownership, test fixtures and
oracles, and current versus historical documentation. Automated clone inspection
is a candidate finder, not proof that all semantic duplication is absent.

| ID      | Duplicated knowledge and current consumers                                                                                                      | Accepted owner and strategy                                                                                                                                                             | Preservation proof                                                                                                                                       |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DRY-008 | Producer Node selection, pinned setup action, policy npm selection and frozen dependency install repeated in both workflow jobs                 | One repository-local composite action; both jobs invoke it after checkout. Preserve pinned action identity, npm flags, job order, consumer runtime switch and archived producer handoff | Review flattened before/after steps; hosted reference plus every frozen Windows/Linux lane                                                               |
| DRY-009 | Temporary allocation and guarded recursive cleanup repeated in Git fixtures, replacement, installation, affected-selection and NFC-policy tests | One neutral `tests/temporary-directory.js`; Git setup composes it in the existing repository helper. Each caller owns policy, payload, Git commits and expectations                     | Existing fixture consumers exercise real filesystem/Git/native installation paths; directory cleanup must remain contained and reject changed identities |
| DRY-010 | Momoa token meaning repeated in `contracts.test.js` and `retained-quality.test.js`                                                              | One test-only oracle helper, independent of production parsing and formatting. It retains token kind, decoded strings and exact non-string lexemes/order                                | Existing decoded-token equality assertions and literal output expectations; raw-token preservation in `formatting.test.js` remains separate              |
| DRY-011 | README dependency versions and consumer-guide capacity defaults duplicate the manifest, schema and identity rule                                | Link to the maintained declarations instead of creating another generated-doc pipeline. Keep explanatory behavior and usage examples                                                    | Read affected declarations and relative link targets; style checks and ordinary review                                                                   |

All four groups share current maintenance responsibility within the producer
repository. None creates a runtime service, private cross-package dependency,
generic validation framework, shim or new dependency. Markdown Quality's local
`setup-python` composite action is an existing portfolio precedent for sharing
one CI setup sequence.

Retained distinctions, owned by repository maintainers:

- Production, configuration and result records have different admission and
  provenance contracts. Existing schema definitions and native validators remain
  their owners; similar hash/pointer shapes alone do not justify merging them.
- The standalone acquisition bootstrap cannot depend on producer-private helpers;
  byte conformance and exact installed-payload tests control its drift.
- Producer and consumer npm/runtime selections, physical/logical/native budgets,
  snapshot and source path validation, and archive/cache/installed identities
  retain separate responsibilities and their existing conformance checks.
- Expected values and diagnostic vectors stay independent of production data.
  Native RuleTester, retained Linter vectors and installed consumer probes check
  different integration boundaries. No shared expected-decision generator.
- The formatting test's raw token spelling is stricter than decoded string
  meaning. It remains a separate oracle, with its literal fixtures unchanged.
- Historical plans, native locks, legal notices and evidence retain their bytes.
  Generated Node documentation already has a projection/drift check.
- Repeated action pins for different workflow responsibilities, npm subprocess
  calls, serializers and hashes do not by themselves establish shared policy.

## Delivery and evidence

REQ-008 / AC-008: apply only the four justified consolidations while preserving
public behavior, package contents, existing test decisions, effective CI matrix
and all acquisition safeguards. QA-008: both hosted jobs must execute identical
reference setup before their existing producer/consumer responsibilities.
QA-009: fixture cleanup must target only its own unchanged temporary directory.
QA-010: the independent token oracle must retain decoded strings, exact numeric
lexemes, kinds and order without importing production code.

SLICE-008 links DRY-008/011 and AC-008/QA-008: shared CI setup and authoritative
documentation links, proven by structural review, style checks and hosted runs.
SLICE-009 links DRY-009/010 and AC-008/QA-009/010: neutral test infrastructure,
proven by unchanged expected results in affected source/native/tooling suites.
The implementation coordinator integrates both before ordinary review.

Commit this brief first. Use representative passing preservation checks before
the extraction, then focused/affected checks on the prepared change. Resolve
configured HISEW profiles; a conservative full-suite fallback is appropriate
when workflow/tooling inputs make affected selection uncertain. `check:full`
needs committed clean source for archive provenance. Run final governed proof
after formatting, staging and commit; do not duplicate it merely for receipts.
Use one ordinary review on the frozen change and narrow repair review if needed.
Deliver signed source to `main`, inspect exact-head hosted qualification and
CodeQL, and complete HISEW assessments/resource reconciliation. Hosted CI is
effective composite-action proof; local parsing alone is not that proof.

No migration, registry release or downstream activation is involved. Abort
publication for unresolved review or failed checks; after delivery use an
authorized signed forward repair. Retain raw evidence externally, remove only
proven task-owned disposable resources recoverably, and preserve existing work.
Reassess scope for changed runtime decisions, fixture assumptions, CI behavior,
unavailable required checks or any proposed new abstraction responsibility.
