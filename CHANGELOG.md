# Changelog

Package versions follow [Semantic Versioning](https://semver.org/).
Configuration, event and native protocol versions advance as a [contract cohort](schemas/contract-cohort.json).

## Unreleased

These changes describe the source candidate.
See [release operations](docs/release-operations.md) for publication and promotion.

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
- Apply caller output and elapsed-time controls to early CLI and qualification failure reporting; remove hidden diagnostic truncation and the fixed qualification reporting timeout, with matching unreleased event-schema admission.
- Make every admission/runtime quota caller-overridable, including unlimited depth, scratch and elapsed time, while preserving explicit budgets, cancellation, EOF and integrity.
- Expose independent transformation, producer and verification quota profiles; remove hidden cold-install clamps and the unused `maxConcurrency` field.

### Package and release qualification

- Select the manifest's stable SemVer coordinate for the next release through qualification, `pilot` publication and same-artifact promotion; version selection does not establish release availability.
- Derive candidate metadata from `package.json.version`; `sync:version` refreshes its projections and `check:version` detects drift.
- Retain ordinary and isolated npm consumer qualification, including public-binary no-configuration cases and generated-lock ownership.
- Qualify the Node 22.13.0 floor, maintained LTS lines and advance Node 26 support on Windows x64 and Linux x64/glibc.
- Add deliberate ready-for-review acceptance, verified PR-to-main reuse including JSON, explicit main recovery and hardened evidence transport.
- Keep diagnostics in native logs and preserve independently verifiable release proof with immutable releases.
