# JSON quality

One Node package provides strict JSON checking, complete owned-file discovery, guarded source formatting and NFC repair, and a bounded ESLint guard against serialization used as semantic identity.
The CLI and library execute the same package-owned rules and presentation options.
Repository producers and domain validators retain authority over schemas, RDF meaning, canonical representations, hashes and historical evidence.

```sh
json-quality check --root /path/to/repository
json-quality inventory --root /path/to/repository --json
json-quality format --root /path/to/repository
json-quality normalize --root /path/to/repository -- source.json
```

The initial development contract uses configuration and result schema 1, Node 24.21.0 or newer within Node 24 or Node 26.11.1 or newer within Node 26, ESLint 10.12.0, `@eslint/json` 2.1.1, Prettier 3.9.10 and Ajv 8.20.0.
It is an internal development candidate; registry publication is separately authorized and qualified.
See the [consumer contract](docs/consumer-guide.md) and [third-party notices](THIRD-PARTY-NOTICES.md).

```sh
npm ci --ignore-scripts
npm run check:focused
npm run check:affected
npm run check:full
```

`check:full` requires clean committed source so transported-package proof binds an actual source commit.
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
JSONC/JSON5 remain detected and refused.
Exact expected findings retain intentionally invalid corpus evidence visibly; unexpected or missing diagnostics, changed pinned bytes and missing logical members fail.
