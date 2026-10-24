# JSON Quality registry consumption

Accepted owner instruction: 24 October 2026, this chat.
Continue the existing R2 execution `0285706b-d3bb-4137-a721-14550c0ea026` from published source `438b55330ca961f716cb13f39f991dda6bdacbff`.
The owner selects package version **1.0.0-rc.1** and limits this migration to JSON Quality.
Markdown Quality packages, archives, selectors and release state are excluded.

## Outcome and decisions

- REQ-001 / AC-001: JSON Quality's producer builds, qualifies and distributes one immutable registry artifact; clean Windows and Linux consumers install that same package version through native npm declarations and generated lockfiles.
- REQ-002 / AC-002: All four existing consumer integrations keep bounded session APIs, source preservation, complete diagnostics and native payload verification.
  Consumers do not retain producer distribution archives in Git or reconstruct a published package from a source checkout.
- REQ-003 / AC-003: Native npm owns registry resolution and archive integrity; the producer's additional installed-file checks retain independent locked-registry-payload proof and reject tampering.
  A Git commit is not admitted as a portable registry artifact identity.
- REQ-004 / AC-004: Markdown Quality stays unchanged.
  Preserve the already published Markdown repository commit; update only its JSON dependency.
  Universal Ontology PR #148 merges normally only after actual successful current-head CI.
  OwlAPI PR #86 and WebVOWL PR #85 branch updates stay local, linear and unpushed.
- DEC-001: Use owner-selected `1.0.0-rc.1`; contract/native cohort 2 remains independent of package SemVer.
  Do not reuse a published version or silently choose a different release.
- DEC-002: Registry versions and exact npm aliases are the production installation contract.
  Remove the defective Git-installation qualification promise without a fallback that trusts arbitrary cache contents.
  Existing transported package qualification remains producer-side evidence, not a recommended consumer dependency declaration.
- DEC-003: Reuse the existing packer, staged/OIDC release workflows, native npm, registry recipient probes and release journals. Preserve owner authentication/2FA and signed release identities; source publication, staging, owner approval, public availability and GitHub archival remain distinct claims.
- DEC-004: Consolidate changes before final reviews; use GPT-6 Astra Max and Claude Opus 5.5 Max (at most 30 minutes per run) for the final candidate, with narrow follow-ups.
  Reuse native engine proof for unchanged code.
  The explicit Codex Security scan waiver remains; no retry or substitute scan.
  Only justified affected checks while editing; full release qualification follows resolution of external review findings.

## Vertical slices and proof

| Slice     | Requirements                         | Change and proof                                                                                                                                                                                                                                                                                                                               | Delivery and recovery                                                                                                                                                                                                                                                                            |
| --------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SLICE-009 | REQ-001/003, AC-001/003, DEC-001/002 | Set the selected version; require exact registry coordinates in installer verification; remove Git qualification plumbing; update tests/docs. Reproduce Git rejection and registry payload/tamper controls at the public boundary. Format/lint exact scope, then consolidate and review.                                                       | Signed source commit; native cohorts unchanged. Prior source and qualified native binaries remain recoverable.                                                                                                                                                                                   |
| SLICE-010 | REQ-001/003, AC-001/003, DEC-003/004 | Run the existing final release qualification over the one Linux-produced archive and all supported Windows/Linux Node recipients. Admit actual CodeQL/dependency/provenance evidence under existing release controls. Stage exact approved bytes through the configured pipeline; require genuine owner actions where native npm demands them. | Verify actual registry `1.0.0-rc.1`, integrity, provenance and anonymous installation before any consumer claims release adoption. Authentication or missing publisher authority is a concrete blocker; do independent work while pending. No fabricated receipt or weakening of release policy. |
| SLICE-011 | REQ-002/004, AC-002/004              | Update only JSON manifest selectors, regenerate locks through native npm against the actual registry release, keep bootstrap source matched, update tests/docs. Cold-install and exercise affected integration contracts, including full corpus coverage where applicable.                                                                     | Publish Markdown's JSON follow-up directly; update and merge UO PR #148 after green CI; leave Owl/Web signed linear commits unpushed. Never modify unrelated work, Markdown selectors or historical evidence.                                                                                    |

QA-REG-001: One lockfile created from the published registry version installs on fresh Windows and Linux environments and verifies the same immutable package artifact; no prewarmed private cache is needed.
QA-REG-002: Modified installed bytes, missing/wrong archive integrity, mismatched version/source and unsupported selector types fail explicitly.
QA-REG-003: The release package's native artifacts retain verified source identity and Linux executable mode; consumer installation uses no compiler, network postinstall or PATH-discovered engine.
QA-REG-004: Exact consumer contract, corpus counts, negative fixtures and source identities remain established; registry migration cannot turn known quality failures into passes.

## Scope, ownership and reassessment

Likely seams: `package.json`, native npm-generated root lock, `src/installation.js`, existing acquisition/package qualification and installed-payload tests, consumer/release documentation, then each consumer's isolated JSON manifests/locks/tests.
Retain the bootstrap only for its actual acquisition/verification responsibilities; do not introduce another packer or resolver.

Use existing external evidence and task workspace allocations, retaining original CI failure logs.
Add compact successor evidence and release identities.
Preserve all current native inventories and the final unpushed consumer checkout roots.
Dispose only released task scratch through the established HISEW process after evidence promotion.

Abort publication on changed source/archive identity, occupied version, failed required hosted checks, missing package-owner/trusted-publisher access, unresolved model findings or inaccurate signed decisions.
A published immutable version is repaired by a separately chosen new version, not replacement.
Replan if native npm staging requires an additional public bootstrap identity or the release contract cannot honor the selected scope/version.
