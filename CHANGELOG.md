# Changelog

Package versions follow [Semantic Versioning](https://semver.org/).
Configuration, event and native protocol versions advance as a [contract cohort](schemas/contract-cohort.json).

## 1.0.2

This compatible patch makes qualified CI archives reusable for publication, improves interrupted-release recovery and refreshes development tooling.

### Release qualification

- Promote the original package family after an authenticated ordinary merge, preserving its tested source, complete runtime/layout proof and native production identities.
- Require evidence reuse by default; missing, expired or contradictory evidence stops qualification.
  Only an explicit `force-fresh` request starts another complete qualification graph.
- Refresh dependency advisories against the original producer and recipient lockfiles with lifecycle scripts disabled, and verify the original scanner, query inventory and policy before reusing analyses.
- Keep public registry installation, signatures and provenance checks after owner approval; successful source CI does not replace public-delivery proof.

### Recovery and retention

- Bind staging, archival and promotion attempts to owner-signed reservations and a fresh private npm stage inventory, including authorized reruns.
- Preserve original producing attempts and native upload receipts; retain no-request evidence, completed staging outcomes and opt-in interrupted-stage custody without replaying uncertain writes.
- Accept the native upload acknowledgement's bare SHA-256 and the REST record's prefixed form only when they identify the same exact artifact.
  Handle GitHub's unevaluated display name for skipped native checks without relaxing the successful Windows and Linux proofs required by core staging.
- Wait within the existing deadline when an acknowledged upload is temporarily unavailable by its exact ID.
  Preserve completed native staging requests after an upload-only failure so a separately approved core continuation does not repeat them or relabel the failed run as successful.
- Account for retained and deleted writer attempts through complete signed provider observations, and verify a rerun's current reservation separately from the reservation attached to retained admission evidence.
- Retire owner-approved `pilot` aliases across all three packages while guarding stable availability, including interrupted and previously rejected requests.
  Read-only completion observes acknowledged removals without replay; an authenticated npm rejection requires a fresh decision before another request.
- Preserve authenticated target bytes and immutable asset identities across signed history renewal; mutable download counters do not replace the original subject.
- Retain release-capable candidates for up to 90 days and remove only proven-unused predecessors, including recovery uploads.
  Active or unresolved consumers retain their inputs.
- Keep fresh assurance downloads in disposable scratch and retain compact observations instead of duplicate recipient graphs and ZIPs.
- Keep private npm subprocess output out of logs and uncaught errors while retaining the exact structured refusal needed for admission.
- Apply one frozen runner policy to Windows and Ubuntu product, native, staging and CodeQL evidence, including historical runner identities.

### Tooling and documentation

- Update the reference Node.js patch to 26.13.1 and compatibility pins to 22.23.5 and 24.22.3 without raising the consumer floor.
- Refresh direct development dependencies, native Markdown Quality companions and transitive tooling as detailed below; require fast-xml-parser 5.12.1 or later.
- Validate nested workflow permission ceilings, required setup, explicit YAML `false`, complete dispatch input sizes and skip-resistant completion gates before hosted execution.
- Synchronize current package references and installation examples from `package.json.version`, with one explicit comparison baseline for release and migration guides.
- Clarify that an unqualified filesystem format command selects all eligible writable files; use explicit paths to limit a repair.

### Locked package changes

These versions compare `package-lock.json` with the `v1.0.1` tag.
Root and bundled copies with the same upgrade are grouped in one row.
The updates belong to the development tooling graph; JSON Quality's runtime AJV 8.20.0 and Prettier 3.10.1 are unchanged.

| Package                                         | Before  | After   | Resolution                                             |
| ----------------------------------------------- | ------- | ------- | ------------------------------------------------------ |
| `@hadden-industries/markdown-quality`           | 3.0.1   | 3.0.3   | Direct development dependency                          |
| `@hadden-industries/markdown-quality-linux-x64` | 3.0.1   | 3.0.3   | Optional companion of the development tool             |
| `@hadden-industries/markdown-quality-win32-x64` | 3.0.1   | 3.0.3   | Optional companion of the development tool             |
| `dependency-cruiser`                            | 18.7.2  | 18.8.0  | Direct development dependency                          |
| `eslint`                                        | 10.14.0 | 10.15.0 | Direct and Markdown Quality bundled copies             |
| `@eslint/config-array`                          | 0.23.5  | 0.23.6  | Root and Markdown Quality bundled copies               |
| `@eslint-community/regexpp`                     | 4.12.2  | 4.12.3  | Markdown Quality bundled copy                          |
| `@isaacs/nonrecursive-glob-match`               | 1.0.3   | 1.1.0   | Markdown Quality bundled copy                          |
| `brace-expansion`                               | 5.0.12  | 5.0.13  | Markdown Quality bundled copy                          |
| `markdown-table`                                | 3.0.4   | 3.1.0   | Markdown Quality bundled copy                          |
| `mdast-util-gfm-autolink-literal`               | 2.0.1   | 2.1.0   | Markdown Quality bundled copy                          |
| `mdast-util-gfm-table`                          | 2.0.0   | 2.0.1   | Markdown Quality bundled copy                          |
| `mdast-util-gfm-task-list-item`                 | 2.0.0   | 2.0.1   | Markdown Quality bundled copy                          |
| `mdast-util-to-markdown`                        | 2.2.1   | 2.2.3   | Markdown Quality bundled copy                          |
| `minimatch`                                     | 11.0.3  | 11.0.8  | Markdown Quality bundled copy; root override unchanged |
| `commander`                                     | 15.0.0  | 15.1.0  | Transitive development dependency                      |
| `enhanced-resolve`                              | 5.26.0  | 5.27.0  | Transitive development dependency                      |
| `fast-xml-builder`                              | 1.3.1   | 1.3.2   | Transitive development dependency                      |
| `fast-xml-parser`                               | 5.12.0  | 5.12.1  | Transitive development dependency and override floor   |
| `parse5`                                        | 8.1.0   | 8.1.1   | Transitive development dependency                      |
| `tapable`                                       | 2.3.3   | 2.3.4   | Transitive development dependency                      |

### Compatibility

No CLI, SDK, configuration or schema migration is required from 1.0.1.
Contract cohort 6, event schema 5, configuration/source-contract schema 4, native protocol 5 and Node-API 9 remain unchanged.
The consumer minimum remains Node.js 22.13.0 on Windows x64 or Linux x64 with glibc.
The core package and both native companions use version 1.0.2.

## 1.0.1

This patch improves release reliability and updates dependencies.

### Dependencies

- Update the runtime formatter from Prettier 3.9.10 to 3.10.1 and refresh compatible dependencies.
- Update Markdown Quality to 3.0.1 and require fast-xml-parser 5.12.0 or later in the development dependency graph.

### Release reliability

- Bind publication, promotion, restoration and recovery to the qualified Windows and Linux package family, with explicit owner approvals.
- Stage native companions before the core package, verify public registry recipients and retain release evidence for immutable archival.
- Wait for npm availability-tag readback and verify completion across all three packages and GitHub.
- Isolate release writers, validate signed recovery checkpoints and support historical release evidence without rewriting it.
- Pin producer and consumer toolchains and move Linux CI to Ubuntu 26.04.

### Compatibility

The public CLI, library API and contract cohort 6 remain unchanged from 1.0.0.
The minimum supported Node.js version remains 22.13.0.
The core package and both native companions use version 1.0.1.

## 1.0.0

Initial stable release.

### CLI and source repairs

- Reject explicitly empty filesystem format selections and report completed quality refusals with exit 1 for both previews and writes.
- Require complete inventory, linked expectations, source observations and diagnostics on repository terminal events.
- Reduce ESLint identity-rule work on parse-only files and repeated references to the same binding.

- Add both-bin version discovery, contextual help, literal `check-files` selection and raw UTF-8 stdin transforms with explicit virtual-file policy context.
- Require `--write` or `--dry-run` for filesystem repairs; add actual format preview and presentation-only human display controls.
- Check NFC by default, support global/path decoded-Unicode preservation, and expose normalization preview with complete collision preflight.
- Let format preserve ordinary NFC drift and normalize preserve presentation drift while retaining strict safety, ownership and peer checks.
- Expand consumer guidance and npm metadata with package fit, strict JSON boundaries, scoped checking, explicit repairs and completion semantics.

### Configuration, API and schemas

- Add package-owned zero-configuration defaults, optional sparse configuration and independent immutable effective policy snapshots for cohort 4.
- Replace the former aggregate/document-envelope API with cohort-4 streaming source and repository sessions, explicit value leases and guarded writes.
- Adopt precise public API/resource/event names, root-inclusive producer value counting and independent source/installation/acquisition profiles; old names require explicit migration.
- Add event version 5 for explicit CLI scope and previews; retain configuration/source-contract schema 4 and Node-API 9.
- Standardize public schemas on JSON Schema 2020-12 with stable offline identifiers.
- Discover policy inputs with dependency-cruiser, retain a readable path inventory, and fingerprint actual installed files plus relevant runtime dependency declarations without unrelated package-metadata churn.
- Add strict JavaScript checking, generated declarations, schema types, public API fixtures and a recommended ESLint flat configuration.
- Declare the SDK and ESLint integration as Node.js-only exports, including their TypeScript declarations; refuse browser and unmatched conditions while preserving the independent JSON schema/cohort exports.

### Native protocol and resource controls

- Advance the native contract to cohort 6/protocol 5 with accounted, pull-based reply fragments; remove fixed repository path, metadata cell and provider-ID size clamps while retaining frame bounds and caller quotas.
- Make human path/pointer excerpts and owned-tool termination grace caller controlled, and retain complete Git diagnostics within the selected output budget.
- Apply caller output and elapsed-time controls to early CLI and qualification failure reporting; remove hidden diagnostic truncation and the fixed qualification reporting timeout, with matching event-schema admission.
- Make every admission/runtime quota caller-overridable, including unlimited depth, scratch and elapsed time, while preserving explicit budgets, cancellation, EOF and integrity.
- Expose independent transformation, producer and verification quota profiles; remove hidden cold-install clamps and the unused `maxConcurrency` field.

### Package and release qualification

- Select 1.0.0 through qualification, `pilot` publication and same-artifact promotion; version selection does not establish release availability.
- Derive candidate metadata from `package.json.version`; `sync:version` refreshes its projections and `check:version` detects drift.
- Retain ordinary and isolated npm consumer qualification, including public-binary no-configuration cases and generated-lock ownership.
- Qualify the Node 22.13.0 floor, maintained LTS lines and advance Node 26 support on Windows x64 and Linux x64/glibc.
- Add deliberate ready-for-review acceptance, verified PR-to-main reuse including JSON, explicit main recovery and hardened evidence transport.
- Keep diagnostics in native logs and preserve independently verifiable release proof with immutable releases.
