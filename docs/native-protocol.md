# Native protocol, cohort 3

Each platform package supplies the standalone executable and Node addon from the same core.
`@hadden-industries/json-quality-linux-x64` contains `json-quality-native`; `@hadden-industries/json-quality-win32-x64` contains `json-quality-native.exe`.
Both packages expose the executable through `./executable` and retain their component/build manifests and notices.
The JavaScript core declares these packages as exact-version optional dependencies; keep optional dependencies enabled so native npm installs the matching payload.
An omitted matching dependency fails explicitly, including when an unrelated ancestor or global installation has a same-version native package.
Qualified hosts launch the verified package-relative executable, rather than resolving a command from `PATH`.
The Linux platform archive must retain its executable's POSIX execute bit; package qualification rejects an archive that loses it.
A non-Node host needs the matching verified platform payload and its own process supervision; it does not need Node, a compiler, global ICU or an additional JSON parser for source data.
Python hosts can use standard-library process and binary-I/O facilities.
Actual HISEW integration remains a separately governed consumer change.

Before launch, admit the closed component/build manifests and actual artifact hashes against the intended package/source cohort.
The hello must match protocol 3, the admitted core source identity, ICU 79.1, Unicode 18.0 and SQLite 3.54.1.
Do not accept a caller-selected executable or a different platform as fallback.
An absent packaged artifact is unavailable, not a qualified alternative.

## Framing

Launch the executable with exactly one argument: an absolute, fresh owned scratch leaf under an admitted temporary parent.
The core manages its own backing choice and ownership.
Small checks need not create spill files.
Never reuse another session's scratch directory.

Standard input/output are binary. Each frame consists of one ASCII kind byte, a four-byte **little-endian unsigned** body length, then that many body bytes. A frame body is at most 65,536 bytes. Reads must accumulate exact headers/bodies; a short OS read is not a complete frame.
Pipe output must be consumed with backpressure and cooperative cancellation.
Hosts may select per-I/O supervision budgets independently of total operation time; an unlimited ordinary read must not acquire an implicit aggregate deadline.

| Kind | Direction    | Meaning                                                             |
| ---- | ------------ | ------------------------------------------------------------------- |
| `J`  | Core to host | UTF-8 JSON control, acknowledgement, event batch or range metadata. |
| `D`  | Core to host | Bounded raw range bytes preceding their correlated `J` metadata.    |
| `E`  | Core to host | Fatal operational error; no successful completion.                  |
| `C`  | Host to core | Nonfinal fragment of one control JSON request.                      |
| `c`  | Host to core | Final fragment of one control JSON request.                         |
| `B`  | Host to core | Raw source bytes for an admitted active upload.                     |
| `F`  | Host to core | Empty-body exact source EOF; closes immutable capture.              |

The complete control envelope is independently bounded to 1 MiB.
Source payloads travel in `B` frames and do not become control JSON strings/Base64.
Do not interleave requests or sources.
A `C` fragment or source `B` frame has no acknowledgement of its own; wait for the relevant final response, not an invented per-fragment response.

## Session and source lifecycle

The executable first emits a `J` hello containing a fresh 32-hex-character `owner`.
Every request must include:

```json
{
  "protocolVersion": 3,
  "owner": "OWNER_FROM_THE_VERIFIED_HELLO",
  "requestId": "1",
  "command": "configure"
}
```

The displayed owner is a placeholder.
Requests must use the actual hello owner.
Native `requestId` is a strictly increasing canonical positive decimal sequence of at most 64 digits; it is distinct from public API/CLI correlation strings. Check response correlation and owner/cohort boundaries.
Native IDs belong to that live session and must not be persisted as transferable capabilities.

1. Send `configure` before opening sources.
   Admission/runtime names come from the configuration schema; native integer controls are decimal strings, and an unlimited quota is `null`.
   Omission selects schema-projected defaults.
   Every admission and runtime quota can be `null`, including total scratch, parser depth and elapsed time.
   Set all these fields to `null` for ordinary unlimited reads; an explicit numeric field remains binding.
2. Send `begin-source` with the closed selected `contract`, optional exact `identity`, `retainValues` and `includeValueEvents`.
   Admit its `source-ready` acknowledgement before pulling a producer.
3. Stream every input byte through `B` frames and send one empty `F`.
   Verify `source-captured`, its source/request identity and exact length/hash.
   This is capture evidence, not a JSON pass.
4. Repeatedly send `next`.
   Each `J` `events` reply contains a bounded ordered batch.
   Continue through the source `terminal`, preserving all findings and completion flags.
   Do not request events after that source closes.
   Missing EOF, omitted terminal, failed delivery or a refused request is incomplete.
5. Use retained source/value IDs only within this session.
   Complete source checks may precede further sources in the same aggregate budget.
6. Send `close`, consume its acknowledgement and require successful process exit.
   Close remains available for cleanup after refused configuration or failed work.
   Unexpected transport EOF emits an operational error and exits nonzero.

`qualityPassed` describes intrinsic quality; `contractSatisfied` additionally accounts for exact expected-negative pins.
A source may satisfy a deliberately negative contract while its findings remain visible.
No source terminal asserts consumer domain admission or complete repository census.

## Lossless access and explicit conversion

`select-value` accepts a retained source ID and decoded `pointer`; JSONL selection also supplies the canonical decimal `record`.
`select-value-pointer-source` consumes an identified captured pointer stream instead of a giant control string.
`describe-value` returns bounded metadata.
`next-child` takes a retained container `value` and decimal `ordinal` lower bound, returning one immediate non-key child descriptor in source order or `null` at completion.
Its `name` identifies the original object key as a scoped value; array elements have no name.
Duplicate object members remain distinct, and no decoded sibling collection is materialized.
`read-value` takes `value`, `representation`, decimal `offset` and `maximum` (1..65,536), returning one `D` data frame followed by its correlated `J` range metadata.
Retain at most that bounded data frame until its metadata and request identity are admitted; a data frame alone is not a completed range response.

Representations are `source-json`, `decoded-utf8`, `number-lexeme`, `nfc-utf8` and `json-pointer` where supported by the value kind.
`read-source` similarly reads identified original bytes, including rejected JSON.
A host can hash, validate or forward fragments without materializing complete values.

`reserve-materialization` and `reserve-control-materialization` explicitly admit a bounded conversion before allocation.
The latter requires a retained value from a completely parsed, positively checked source and charges conservative byte/node workspace. Roots use the indexed source node count; subtrees use their raw byte length as a conservative node-count bound, excluding unrelated siblings without a growing traversal. The host supplies its existing complete domain validator, owns converted objects and retains/releases the corresponding reservation through `release-materialization`.
The core does not implement arbitrary consumer JSON Schema dialects.

The same service also supplies census, linkage and candidate commands used by the trusted repository controller.
A host implementing those responsibilities must reconcile independent inventory and actual delivered members, exact parent/value/encoding linkage, source freshness, expected diagnostics and final delivery.
A parse-only protocol example cannot substitute for those complete obligations.
Use the maintained Node repository controller when that composition is appropriate; no hidden HISEW schema or archive semantics are supplied by this transport.

## Supervision and evidence

The host owns finite pipe/read/write deadlines, cancellation, child-process settlement, diagnostic-output bounds and its Windows Job/POSIX process containment policy. Internal runtime controls do not rescue a host that blocks indefinitely without supervising its pipes. A forced termination cannot establish successful cleanup; reconcile any owned residual scratch through its actual owner/evidence instead of deleting a guessed path.

Retain the exact package/component/source identity, request controls, input identity, complete event/output delivery, exit status and cleanup outcome. Qualify small no-spill, giant spill, malformed/late-byte, cancellation, foreign-identity, truncated-frame and missing-EOF paths against the same packaged executable.
Windows evidence does not establish Linux behavior.
Consumer domain validation, installed transport qualification and publication remain separate claims.
