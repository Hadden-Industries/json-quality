# Shared native core

This directory contains the private source integration of the [accepted oversized JSON design](https://github.com/Hadden-Industries/json-quality/blob/main/docs/plans/2026-10-23-oversized-json-design-checkpoint.md).
Public API, CLI, providers and schemas now use cohort 2 and this single core.
The retired product checker and document/result envelopes are absent from the runtime; the immutable finite-v1 oracle remains development-only.
Final platform, transported-package, rights, review and consumer acceptance are still separate qualification work.

`core/session.hpp` owns the bounded framed service used by both bindings.
`document_check.hpp` and `json_lines.hpp` apply one strict Boost grammar and the shared quality rules.
`adaptive_store.hpp`, `allocation_ledger.hpp`, `scratch_quota_vfs.hpp` and `indexed_streams.hpp` own retention, accounting, migration and stable range identity.
`unicode_normalization.hpp` owns the residual NFC orchestration over pinned public ICU primitives.
`producer_presentation.hpp` observes presentation using the same parser callbacks, public Boost escaping and bounded double-conversion number output.
`source_outcome.hpp` keeps intrinsic quality separate from exact expected-negative admission.
`value_index.hpp` owns exact lookup independently of parser lifetime; `value_pointer.hpp` renders escaped paths in bounded fragments, including giant member names.
`streamed_pointer.hpp` decodes identified UTF-8 pointer streams into adaptive segments and uses the same exact child selector, so a giant key needs neither a complete JavaScript pointer string nor a giant control frame.
Ordinary findings retain the necessary structural ancestors, while explicit value retention supports later selection without requiring every value event to cross the binding.

`resource_policy.hpp` uses annotations projected from the configuration schema by the verified builder.
One session accounts for source bytes and counts, records, diagnostics, transport output, retained state and materialization reservations across successive sources.
Admission ceilings may be removed explicitly; finite working memory, scratch, nesting, elapsed time and the single active checking lane remain enforced.
Repository and acquisition adapters apply the remaining tool, Git, cache and policy controls through their owning operations.

`linked_bytes.hpp` transfers an identified decoded string or canonical base64 member directly into the same store and checker.
Its container must have a completed strict parse, and any declared decoded length and digest are verified before checking.
`source_census.hpp` reconciles physical sightings, independent native inventories and actual checked members in the same adaptive index.
Provider inventory and delivery close separately; omitted/extra/duplicate members, case collisions, changed identities and wrong pointer linkage prevent complete census.
Binary authority captures preserve source bytes and declared identities without making a JSON quality claim.
Native member provenance is bound to a separately frozen authority and its independent declared identity; archive-domain extraction remains with the trusted archive owner.

The internal Node adapters in `src/repository-discovery.js`, `repository-source.js`, `native-provider.js` and `logical-provider.js` stream discovery and providers through that service.
The filesystem walk holds one directory lease at a time, and Git output uses bounded NUL framing with backpressure.
Filesystem observations, exact source rechecks, Git membership and directory freshness remain adapter-owned checks before overall success.
Census membership completion alone does not assert final filesystem freshness or downstream domain admission.
`src/repository-check.js` composes physical/native/logical/JSONL checks, exact expected-linkage reconciliation and source freshness before an execution verdict.
`src/value-session.js` wraps the verified service with session-scoped capabilities, bounded reads and explicitly charged materialization leases.
Source framing follows literal dialect identity, and blank JSONL records retain their framing findings.
The exported session API/CLI and strict policy bootstrap compose these owners; external consumer migration and final acceptance evidence remain separate.

`bindings/node_api.cpp` transfers bounded byte frames through Node-API 9 asynchronous work.
`bindings/framed_stdio.cpp` supplies the same service without a Node runtime.
Neither binding implements grammar or quality decisions.
Windows path boundaries convert UTF-8 explicitly to native filesystem paths and use UTF-8 for the SQLite C API.

Build only from pinned, verified dependency artifacts.
ICU's official ZIP supplies Windows sources; its separately pinned POSIX tar archive supplies Linux sources with their original shell-script line endings.
The producer preserves their executable mode bits on POSIX hosts while removing set-id and group/world write permissions.
Build progress is written to standard error; standard output contains only the final JSON result.
Consumer acquisition must load verified platform artifacts without lifecycle downloads, a compiler, global ICU or an alternate JavaScript reader.
The producer build and explicit staging verify a closed source/control/artifact manifest.
Clean installed and final qualification remain part of the implementation work.
See the [native protocol contract](../docs/native-protocol.md) for non-Node supervision, framing, authority and completion requirements.

Focused native conformance tests live under `tests/native/`.
They default to fixed installed resolution; explicit test-only artifact locations verify binary digest, byte length, platform, component versions and embedded source identity before opening a session.
Default test scratch uses the OS temporary parent; explicit artifact qualification can use its identified producer group.
Each session owns cleanup.
