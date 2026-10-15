# Shared rule ownership

DRY means one current authority for knowledge that has the same meaning and reason to change.
Prefer native capabilities and existing modules; extract a shared implementation only when its consumers have compatible contracts and failure behavior.
Independent test expectations and distinct trust checks retain their own responsibilities.

| Rule                                                      | Authority                                                                                | Current consumers and conformance                                                                                                                                             |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Consumer/runtime/toolchain support                        | `assets/node-support.json`                                                               | Metadata, reference selection and compatibility documentation are checked projections; the resolved CI matrix requires all minimum/current/reference lanes                    |
| Result shape, version and write buckets                   | `schemas/result.schema.json`, construction in `src/result.js`                            | Execution and CLI error results derive metadata and allocate fresh write arrays; public result admission still independently enforces accounting                              |
| Empty-key pointer option shape                            | `schemas/configuration.schema.json`                                                      | Policy admission and ESLint rule options use the same closed constraint; semantic lint and escaped-pointer cases remain native tests                                          |
| JSON byte decoding                                        | `src/json-bytes.js`                                                                      | Policy, document, JSONL, logical-provenance and presentation readers retain fatal UTF-8 and leading-BOM rejection                                                             |
| Presentation options                                      | `src/json-format-options.json`, interface in `src/presentation.js`                       | API format/check and explicit native Prettier debug-check configuration share options without consulting consumer formatter settings; returned option objects are independent |
| JSONL presentation admission                              | `src/presentation.js`                                                                    | Both resolved policy contracts and direct JSONL analysis enforce the framing-owned default and permitted formats                                                              |
| Invalid-byte diagnostics                                  | `src/documents.js`                                                                       | JSON and JSONL share finding identity/location construction; JSONL adds unknown record coverage instead of zero                                                               |
| Lexical path containment                                  | `src/paths.js`                                                                           | Regular-source admission retains realpath/regularity checks; pack destination admission rejects equality and containment in the producer checkout                             |
| Neutral temporary Git fixture setup                       | `tests/temporary-repository.js`                                                          | Execution, native, source-presentation and formatter-configuration tests share allocation/init/owned cleanup; policy and expected outcomes remain in each test                |
| Limits, operations, CLI interaction and native identities | Existing `src/limits.js`, `src/result.js`, `src/commands.js`, `src/native-identities.js` | Keep these existing owners; schemas and consumer-boundary tests check their current contracts                                                                                 |

The public root exports remain wired in `src/index.js`; internal consumers import each rule's current module.
The extracted presentation data and modules are ordinary package source and are included through the existing `src/` package membership.
Static imports expose those dependencies to the existing affected-test graph, while native pack and transported consumers verify actual installed inclusion.

Maintain the following distinctions:

- Configuration and result schemas describe different contracts; source, logical, native and expected-negative records carry different provenance. Shared facts do not replace admission at any reachable interface.
- CLI commands map to semantic operations. They are not interchangeable lists even when spellings coincide.
- The cold acquisition bootstrap is copied into consumers and must remain standalone. Its cleanup includes a workspace prefix and realpath guard; bootstrap-byte conformance tests control drift without a producer-private import.
- Git snapshot paths, policy globs and literal source paths have different admission contracts. Do not merge them merely because their checks look similar.
- Native hashes, schema patterns and serializer calls may belong to separate protocols. Reuse their native implementation without inventing a generic identity or validation framework.
- Qualification's expected producer identity, retained diagnostic vectors and expected result values remain independently owned. Do not derive them from the implementation they test.
- Historical plans, locks and evidence retain their original identities. They are not editable current policy or verification of a later candidate.

Repository maintainers own these choices.
Reassess when meanings or release/failure boundaries converge, a real new consumer requires different semantics, or conformance exposes drift.
Use the [implementation plan](plans/2026-10-16-dry-principle-remediation-implementation-plan.md) for the rationale, preservation scenarios and delivery obligations.
