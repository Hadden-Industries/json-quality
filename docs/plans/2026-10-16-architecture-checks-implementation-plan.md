# Architecture checks

## Accepted brief

The user requested only the architecture-checking gap identified against Markdown Quality.
Baseline: clean `8b7276a2b9b76c61148721d77cc40674a3834e06`.
Existing authorization covers required configuration, signed commits and direct delivery to `main`.
Markdown tooling, Markdown rules, GitHub YAML formatting, runtime behavior, public APIs and dependency updates are outside this change.

Risk: R1, ordinary development-tooling change.
The repository owner is the decision owner.
Credible failures are a false passing architecture gate, false rejections, or running producer-only tooling on consumer runtime lanes.
Native analyzer fixtures, native npm membership, ordinary review and exact-head hosted CI expose these failures.
Reversal is a signed forward commit.
No data migration, authentication, privacy, runtime/public-contract, cross-system protocol, concurrency, financial, safety, availability or difficult-reversal trigger is present.
Re-route if implementation reaches those domains.

## Native reuse and design

Reuse installed/locked `dependency-cruiser@18.6.0`, already used by affected-test selection, and native npm's keyed dry-run pack report via `readPackReport`.
The upstream release list identifies 18.6.0 as current stable, checked 2026-10-16: <https://github.com/sverweij/dependency-cruiser/releases>.
Its native API and rule reference cover the selected policies: <https://github.com/sverweij/dependency-cruiser/blob/main/doc/api.md> and <https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md>.
The installed exact component's MIT licence permits this development use; native installation retains its licence.
No new component or vendored analyzer.

Markdown Quality's `.dependency-cruiser.json`, `scripts/architecture.js` and real architecture fixtures provide portfolio guidance.
This package packs its source directly, so no Markdown-specific core/native staging machinery is needed.
Native package-export resolution resolves `eslint/config` and transported consumer self-imports; no unresolved-import exception or suppression is needed.

One `.dependency-cruiser.json` owns the architecture rules.
A small producer-only adapter runs the native graph and native npm membership checks.
Enforce:

- unresolved imports and undeclared npm imports fail;
- runtime code cannot import development folders/configuration or dev packages;
- authored JavaScript cycles fail;
- byte/pointer/path/source-presentation/identity-rule foundations cannot reach orchestration, and reusable tooling cannot reach its command orchestration;
- every shipped JavaScript module has graph coverage; its local imports and declared public/bin entrypoints must be included in native npm membership.

Import every authored source, script, test and root ESLint configuration as graph roots, including disconnected files.
Resolve installed packages as leaves with the native package-export resolver.
Propagate analyzer/configuration/pack errors as failures.
Preserve native rule/path diagnostics instead of implementing a second graph traversal or npm resolver.
Static imports do not prove computed loads, copied bootstrap execution or storage provenance; existing runtime, installation and transported-consumer checks keep those responsibilities.

Keep affected-test selection's conservative fallback separate from architecture's fail-closed admission.
Both consume the existing native analyzer for different contracts.
Reuse the existing pack-report owner; do not duplicate its shape parser.
Test fixture allocation composes existing neutral helpers, while expected rule identities, failures and missing-member cases stay independently authored.

## Acceptance and delivery

REQ-012 / AC-012: `npm run check:architecture` checks the actual source/package graph, fails for each prohibited architecture condition and unavailable analysis, and runs in reference `check:full`.
The producer-only test is excluded from consumer runtime qualification alongside existing producer-tooling tests.
QA-012: a positive fixture passes; real imports then violate each rule without mocking the analyzer.
QA-013: a real native pack omitting an imported file or declared export fails, including a disconnected shipped module.
QA-014: a failed CLI invocation retains nonzero status and actionable diagnostics.

SLICE-012 links REQ/AC/QA-012..014: native policy, bounded adapter and realistic negative/positive fixtures, then full-check/producer-lane integration and concise ownership documentation.
Use test-first for executable admission, preserving all existing expected runtime behavior.
No new runtime export or compatibility shim is needed.
Commit this brief at its first checkpoint, consolidate source writers before broad review, and review repairs narrowly.

Run focused native architecture fixtures during implementation, then formatting, lint and exact-path diff checks.
After final staging/commit, use the registered HISEW affected profile; its conservative full-suite fallback is valid. Hosted reference `check:full` supplies real package qualification and the new gate; every existing Windows/Linux consumer lane must remain green.
Resolve ordinary review, push signed source to main, inspect exact-head CI and CodeQL, reconcile external evidence/resources and complete HISEW without duplicating admitted proof.

Maintain the policy, adapter and documented boundaries together.
Stop publication for unresolved meaningful findings or failed checks.
Re-plan for a real baseline violation requiring product restructuring, package transformations, unsupported native resolution, new dependency/engine requirements or broader user scope.
Keep native receipts externally and dispose only task-owned scratch recoverably.
