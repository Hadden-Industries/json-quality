# JSON Quality

[![npm](https://img.shields.io/npm/v/%40hadden-industries%2Fjson-quality)](https://www.npmjs.com/package/@hadden-industries/json-quality) [![CI](https://github.com/Hadden-Industries/json-quality/actions/workflows/ci.yml/badge.svg)](https://github.com/Hadden-Industries/json-quality/actions/workflows/ci.yml) [![Node](https://img.shields.io/badge/node-supported-green)](docs/node-runtime-compatibility.md) [![AGPL-3.0-only](https://img.shields.io/badge/license-AGPL--3.0--only-blue)](LICENSE)

Check strict JSON, JSONL and NDJSON; preserve exact numeric lexemes and member order; catch duplicate decoded keys, invalid Unicode, NFC drift and inconsistent presentation.
One native reader handles small documents and oversized values with bounded memory and owned spill storage.

Install a published version with npm:

```sh
npm install --save-dev --save-exact @hadden-industries/json-quality
```

These examples describe the cohort **4** source contract under development.
They do not establish that a matching version is published or installed.
Use a version qualified for these contracts when consuming a release.

Run from an existing Git repository; no configuration file or wrapper is required.
The package supplies fixed presentation, NFC checking and dependency/VCS boundaries, including protected npm lockfiles.
Check the repository, then select physical files for a guarded repair:

```sh
npm exec -- json-quality check --root .
npm exec -- json-quality format --root . -- authored.json
npm exec -- json-quality normalize --dry-run --root . -- authored.json
npm exec -- json-quality normalize --root . -- authored.json
```

Checking writes no source files; a spill may create owned temporary storage.
Formatting preserves decoded strings and exact numeric lexemes, so NFC findings may remain.
Normalization explicitly repairs NFC string/key spans and may leave presentation findings.
Either repair order works for a file with both conditions; run `check` afterwards to assess overall quality.
The normalization preview writes nothing and refuses NFC-colliding keys before the first selected write.
Write batches report confirmed writes and any uncertain path; they are not atomic.
Producer-owned, logical and JSONL sources retain their owning write boundary.

Optional `.json-quality.json` accepts `{}` or sparse exceptions.
To preserve decoded Unicode sequences globally, use:

```json
{
  "defaults": { "normalization": "preserve" }
}
```

Preservation keeps ordinary presentation checking; normalization refuses selected preserved sources.
Distinct keys that would collide under NFC produce a non-blocking collision-risk event under preservation.
Exact decoded duplicate keys still fail.

Use the typed ESM API:

```js
import { openJsonSourceSession } from "@hadden-industries/json-quality";

const session = await openJsonSourceSession();
try {
  for await (const event of session.check({
    async *open() {
      yield Buffer.from('{\n  "value": 1.00\n}\n');
    },
  })) {
    console.log(event.type);
  }
} finally {
  await session.close();
}
```

[Run the maintained example](examples/source-session.mjs).
A missing terminal means incomplete delivery.
References belong to their open session; materialization is an explicit charged lease with caller-owned domain validation.
See the [API](docs/api.md), [CLI](docs/cli.md), [configuration](docs/configuration.md) and [consumer guide](docs/consumer-guide.md).

Use the public ESLint flat configuration with your installed ESLint:

```js
import jsonQuality from "@hadden-industries/json-quality/eslint";

export default [jsonQuality.configs.recommended];
```

The [identity rule](docs/rules/no-json-stringify-identity.md) rejects JSON serialization used as semantic identity.

The [runtime policy](docs/node-runtime-compatibility.md) defines the Node.js compatibility floor.
Qualification covers its declared LTS families, advance qualification lanes and independent producer reference.
Other engine-compatible releases receive best-effort support.
Use current security patches; the historical floor is not a security recommendation.
The first platform set is Windows x64 and Linux x64/glibc; keep optional dependencies enabled so npm installs the matching verified native companion.
There is no compiler, downloader or alternate parser fallback at runtime.

Contributors iterate on feature branches and draft PRs.
Marking a PR **Ready for review** requests full qualification of that exact candidate; the owner merges after **CI / acceptance** succeeds.
A later commit invalidates acceptance and requires another deliberate ready checkpoint.
An ordinary merge runs lightweight reuse admission: **REUSED** includes eligible JSON results; **FULL_REQUIRED** waits for an explicit main-qualification dispatch.
Release qualification always binds a fresh source commit and candidate bytes.

Start with the [documentation index](docs/README.md), [contributor workflow](CONTRIBUTING.md), [release operations](docs/release-operations.md), [changelog](CHANGELOG.md) and [security policy](SECURITY.md).
