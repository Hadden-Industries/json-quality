# JSON quality

One Node package provides strict JSON checking, complete owned-file discovery, guarded source formatting and NFC repair, and a bounded ESLint guard against serialization used as semantic identity.
The CLI and library execute the same package-owned rules and presentation options.
`check` validates JSON bytes, syntax, keys, values and presentation across the complete owned inventory. `inventory` lists scope and resolved contracts without analyzing document JSON; it does not establish a quality pass.
Repository producers and domain validators retain authority over schemas, RDF meaning, canonical representations, hashes and historical evidence.

```sh
json-quality check --root /path/to/repository
json-quality inventory --root /path/to/repository --json
json-quality format --check --root /path/to/repository
json-quality format --root /path/to/repository
json-quality normalize --root /path/to/repository -- source.json
```

The development contract uses configuration schema 1 and result schema 3. [The package manifest](package.json) owns direct dependency selections; [the native lockfile](package-lock.json) freezes the resolved graph and integrity.
The [runtime compatibility policy](docs/node-runtime-compatibility.md) defines consumer minima, current-family CI coverage and the independent development/producer reference.
Edit Node and npm selections only in `assets/node-support.json`, then run `npm run sync:node`; `npm run check:node` rejects projection drift, including native lock metadata.
Producer qualification retains npm 12's native pack contract; consumer acquisition uses its separately qualified native npm toolchain.
Resource defaults can be raised through configuration, API options or CLI flags such as `--max-files 100000 --max-file-bytes 67108864`; `--no-limits` explicitly bypasses package capacity limits while retaining quality rules.
It is an internal development candidate; registry publication is separately authorized and qualified.
See the [consumer contract](docs/consumer-guide.md) and [third-party notices](THIRD-PARTY-NOTICES.md).
The [shared rule ownership guide](docs/centralized-contracts.md) records current authorities and intentional separation for maintenance.
Consumers select one exact npm version or full Git commit in their isolated tooling manifest and retain native npm lockfiles, with shared installed-payload verification against the native cache.
The package also owns the generated acquisition bootstrap and isolation guard, so consumer adapters do not maintain parallel implementations.

```sh
npm ci --ignore-scripts
npm run check:focused
npm test
npm run check:affected -- --base FULL_COMMIT_SHA
npm run check:full
```

`check:full` requires clean committed source so transported-package proof binds an actual source commit.
`npm test` always runs every test.
`check:affected` combines dependency-cruiser before/after import graphs and the package's declared process relations.
Its base must be a full immutable commit; `--dry-run` explains the plan without running tests.
Configuration, resources, tooling, computed loads, missing graph coverage or analysis failure select the complete suite.
An empty or unknown affected scope also runs the complete suite; failed selected tests retain their failure.
This development selector does not replace full qualification and introduces no shared tooling repository.
It runs source contracts, lint, read-only style checks, clean installed CLI/library/plugin/schema probes, and source JSON dogfood checks.
Source tests do not establish hosted platform or consumer adoption acceptance.

Read-only operations install nothing and write no checkout files.
Explicit formatting validates all relevant peers before the first write, preserves numeric lexemes and decoded string meaning, and never normalizes data.
Explicit normalization collision-checks keys and changes only admitted string tokens in the selected writable source paths.
Protected, ignored-generated, logical and JSONL inputs must be repaired through their owning source or producer.
Replacement rechecks source identity and bytes; a later failure reports completed and unprocessed paths without claiming whole-batch atomicity.
Concurrent hostile filesystem mutation is outside the supported guarantee.

Physical discovery reconciles Git with an owned-tree walk, including untracked and ignored-generated JSON.
External boundaries require owner/reason exceptions; tracked files inside them remain checked.
JSONL framing and cumulative logical-document inventory use the same strict JSON analysis.
Configured native sources admit content-addressed documents and archive members through trusted, caller-supplied native owners. Their independent census, admitted bytes and source/authority snapshots participate in the same limits, phases and result accounting. Missing providers or changed native inputs fail; generic writers never modify native documents.
Configuration can retain original presentation for independently admitted native or pointer-linked logical members. Their hashes, sizes and every semantic rule remain checked; each selected scope must exist. This never changes ordinary physical-file presentation or write policy.
Pure `formatJsonSource` and `formatJsonValue` functions give producers the package-owned printer without changing normalization or historical digest protocols. Presentation alone establishes no JSON quality pass.
JSONC/JSON5 remain detected and refused.
Exact expected findings retain intentionally invalid corpus evidence visibly; unexpected or missing diagnostics, changed pinned bytes and missing logical members fail.
