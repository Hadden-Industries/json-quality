# Shared rule ownership

One current authority owns knowledge with the same meaning and reason to change.
Bindings and adapters reuse it; independent test expectations and distinct trust checks remain separate.

| Knowledge                                       | Current authority                                                                  | Consumers and boundary                                                                                               |
| ----------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Public versions and native ABI cohort           | `schemas/contract-cohort.json`                                                     | Configuration/event/source controls, component loader, Node-API and executable protocol reject incompatible cohorts. |
| Strict grammar and JSON byte admission          | Boost `basic_parser` through `native/core/document_check.hpp` and `json_lines.hpp` | One path for policy, physical/native/logical sources, scalars, records and writer postchecks.                        |
| Interoperability, keys, exact decimal admission | `document_check.hpp`, `decimal_admission.hpp`                                      | Values remain lexemes/fragments; binary64/domain conversion is explicit.                                             |
| Unicode normalization and comparison            | ICU 79.1/Unicode 18 through `unicode_normalization.hpp`                            | Decoded values, collisions, preservation and explicit NFC repair share native facts.                                 |
| Presentation options                            | `src/json-format-options.json`                                                     | Native observation, finite Prettier formatting/debug-check and producer oracle tests.                                |
| Six presentation contracts                      | `producer_presentation.hpp`                                                        | Same parser callbacks and bounded serializer primitives; no document-sized comparison DOM.                           |
| JSONL dialect/framing selection                 | `src/json-paths.js`, native `json_lines.hpp`                                       | Physical, native and logical sources use the same literal dialect contract.                                          |
| Policy and selected controls                    | `schemas/configuration.schema.json`, `schemas/source-contract.schema.json`         | Local Ajv admission and builder-projected native controls; no downloaded schemas.                                    |
| Event shape                                     | `schemas/event.schema.json`                                                        | CLI/API delivery and public serialized-event admission; serialization never mints capabilities.                      |
| Resource defaults                               | Configuration schema annotations                                                   | API resolver, CLI flags, native generated header, event resources and standalone acquisition projection.             |
| Retention, indexes and spill                    | `adaptive_store.hpp`, `indexed_streams.hpp`, SQLite allocation/VFS owners          | Payloads, indexes, census, findings, linkage, controls and materialization share the execution ledger.               |
| Source identity and observations                | `repository-source.js`, native immutable captures                                  | Re-read actual sources, physical authority observations and SHA/length expectations.                                 |
| Complete census                                 | `source_census.hpp`, repository/native/logical owners                              | Independent inventory and actual delivery close separately; adapters retain archive/domain discovery authority.      |
| Scoped value authority                          | `src/value-session.js`                                                             | Weak session capabilities, bounded reads, streamed pointers and explicit materialization leases.                     |
| Pure transformation capabilities                | `transform-capabilities.js`, `producer-json.js`                                    | Finite effects declare their own limits; they do not limit scalable checking.                                        |
| Candidate preflight                             | `source_rewrites.hpp`, `repository-rewrite.js`                                     | Actual captured transforms, complete peer/dependent checks and effect acknowledgements.                              |
| Guarded physical replacement                    | `guarded-replacement.js`                                                           | Exclusive staging, actual byte pins, permission/source rechecks and truthful partial outcomes.                       |
| Package installation integrity                  | `installation.js`, `package-payload.js`, maintained npm SDK                        | Exact selectors, native lock/cache/SRI/member identity; separate binary transport limits.                            |
| Cold installation source                        | `src/acquire.js`                                                                   | Verbatim generated consumer bootstraps; no installed reader/compiler fallback.                                       |
| Consumer/runtime toolchain                      | `assets/node-support.json`                                                         | Metadata, lock projection, documentation and frozen CI lanes.                                                        |
| JavaScript serialization identity guard         | `src/eslint/noJsonStringifyIdentity.js`                                            | ESLint supplies parsing/scopes; consumers own semantic identity and regression tests.                                |
| Qualification corpus                            | `scripts/consumer-probe.mjs`                                                       | Copied unchanged into the installed consumer before and after offline lock replay.                                   |
| Development impact knowledge                    | `scripts/test-impact.js`                                                           | Native before/after graph reach plus declared process/asset inputs; uncertainty selects full checks.                 |

The retired v1 runtime and document/result schemas are absent from the package. `tests/oracles/finite-v1` retains immutable baseline bytes solely for independent finite/performance comparison.
It is development input, never a runtime backend.

Consumer domain schemas, archive census meaning, RDF interpretation, canonical hashes and historical identity protocols remain with their existing native authorities.
A shared JSON pass, a domain pass, a complete repository verdict, a successful replacement, transported package qualification and publication are separate claims.
