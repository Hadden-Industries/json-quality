# Changelog

Changes follow [Semantic Versioning](https://semver.org/).
Public configuration/event/native schema cohorts evolve separately from package SemVer.
Only an immutable published release establishes release availability.

## Unreleased — 1.0.0-rc.1

- Replace the former aggregate/document-envelope API with cohort-2 streaming source and repository sessions, explicit value leases and guarded writes.
- Add strict JavaScript checking, generated declarations, schema types, public API fixtures and a recommended ESLint flat configuration.
- Standardize public schemas on JSON Schema 2020-12 with stable offline identifiers.
- Qualify the Node 22.13.0 floor, maintained LTS lines and advance Node 26 support on Windows x64 and Linux x64/glibc.
- Add deliberate ready-for-review acceptance, verified PR-to-main reuse including JSON, explicit main recovery and hardened evidence transport.
- Keep diagnostics in native logs and preserve independently verifiable release proof with immutable releases.

This entry describes the source candidate; it does not announce publication.
