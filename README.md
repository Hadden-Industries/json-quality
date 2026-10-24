# JSON Quality

JSON Quality checks strict JSON, JSONL and NDJSON through one shared native reader.
Small documents and oversized values use the same grammar, Unicode rules, presentation checks and lossless value access.
An adaptive store starts in memory and can spill once to owned temporary storage.

The owner-selected release candidate is **1.0.0-rc.1**, contract cohort **2**.
It replaces the previous aggregate APIs and document envelopes.
Publication, platform qualification, downstream adoption and release acceptance require their own evidence; source implementation alone establishes none of them.

```sh
json-quality check --root /path/to/repository --json
json-quality source --json
json-quality format --root /path/to/repository -- authored.json
json-quality normalize --root /path/to/repository -- authored.json
```

`check` reconciles the complete physical, native and logical source inventory and emits versioned NDJSON events.
`source` checks raw standard input under an explicit source contract.
`format` and `normalize` perform explicit, guarded file effects after complete peer and candidate preflight.
Only those write commands accept literal path selection.

Read-only checks install nothing and write no source files.
The checker may create owned scratch after a spill.
A source terminal remains provisional until the final `execution-terminal` closes repository census, source observations, diagnostics and logical linkage.
A missing final terminal or failed output delivery means incomplete work.
Domain validation belongs to the consumer.

```js
import { openJsonSourceSession } from "@hadden-industries/json-quality";

const session = await openJsonSourceSession();
try {
  for await (const event of session.check({
    async *open() {
      yield Buffer.from('{\n  "value": 1.00\n}\n');
    },
  })) {
    // Consume findings and the final source terminal with backpressure.
    console.log(event.type);
  }
} finally {
  await session.close();
}
```

Sessions expose bounded raw-source, decoded-string, number-lexeme, NFC and pointer reads.
References belong to their open session.
Converting JSON into an ordinary object is an explicit, charged materialization with a caller-supplied domain validator.
No checker path falls back to an in-memory JavaScript document parser.

The default managed-memory target is 32 MiB.
Admission controls such as `maxFileBytes` can be raised or bypassed with `capacityLimits`; finite working-memory, scratch, nesting, time and concurrency controls remain active.
This target is managed checker accounting, not a whole-process RSS promise.
See [resource controls](docs/resource-limits.md).

Formatting preserves decoded meaning, member order and exact numeric lexemes.
NFC normalization changes admitted string/key spans and refuses collisions. Materializing writers have a separate 2 MiB input/output capability.
Repository writes require the complete candidate contract to pass, so normalization can refuse a file that would still have unrelated presentation errors.
A later failure reports confirmed writes and any uncertain path; batches are not atomic.

Git discovery and an owned-tree walk include hidden, untracked and ignored generated JSON.
Tracked JSON inside an excluded ancestor remains checked and protected from generic writes, including Windows casing aliases.
Trusted native owners provide independent streamed inventories and actual members; logical owners select decoded values from frozen checked containers.
Ordinary checking never loads provider code from JSON data.
Protected, native, logical and JSONL sources retain their owning producer's effect boundary.

The exact native dependencies are Boost 1.92.0, ICU 79.1 with Unicode 18.0, SQLite 3.54.1 and double-conversion 3.4.0.
Node-API and the framed executable use the same core.
Installed operation loads only verified packaged artifacts; it performs no compiler or downloader fallback.
The [native protocol](docs/native-protocol.md) documents the non-Node boundary.

The `./eslint` export retains the separate JavaScript `no-json-stringify-identity` rule.
The consumer supplies ESLint and selects its JavaScript scope.
This rule does not parse JSON documents or define domain identity.

See the [consumer guide](docs/consumer-guide.md), [shared authorities](docs/centralized-contracts.md), [architecture](docs/architecture.md), [trusted consumer CI](docs/ci-trust.md), [runtime policy](docs/node-runtime-compatibility.md), [contributing guide](CONTRIBUTING.md) and [security guidance](SECURITY.md).

`assets/node-support.json` owns supported Node families, the independent producer reference and npm selections.
`npm run sync:node` projects the policy; `npm run check:node` rejects drift.
The native lockfile freezes the producer graph.

`npm test` includes JavaScript and native `.mjs` tests.
`npm run check:affected` combines before/after import graphs with declared non-import inputs; uncertain scope selects the complete suite.
Native binaries participate in source identity through bounded hashing.
`npm run check:full` retains architecture, release, tests, lint, style, clean package qualification and JSON dogfood checks.

The manually dispatched hosted workflow retains Windows/Linux and supported Node consumer lanes.
The separate [native component workflow](https://github.com/Hadden-Industries/json-quality/blob/main/.github/workflows/native.yml) builds the pinned dependencies and both bindings on Windows/Linux, stages each component through the verified owner, and runs the native suite including public installed resolution.
It retains payloads, original notices, exact source/control identities and build diagnostics for inspection; it neither publishes a package nor automatically adopts a newly built component.
An explicit manual run with `run_checks: false` produces an unqualified component for assembling a frozen candidate before its final reviews; ordinary push/PR runs and the manual default retain native checks.
Local Windows evidence does not qualify Linux.
The current oversized-value implementation explicitly defers local Linux measurements to remote CI, as authorized by its requester.
