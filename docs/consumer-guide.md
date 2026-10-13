# Consumer contract

Install an explicitly qualified archive or release; checks never acquire tools.
For source adoption, retain the clean full source commit, archive SHA-256, npm integrity, source lock identity and frozen consumer lock.
An archive basename includes its source commit and must never be overwritten with different bytes.
The package version alone does not identify a development candidate.

The root library exports `runJsonQuality`, `inspectJsonInventory`, `checkJsonInventory`, `checkJsonDocument`, `checkJsonLines`, `normalizeJsonSource`, `decodeJsonBytes`, `readJsonPolicy`, `jsonContract`, `jsonFormatOptions`, `checkJsonPresentation`, and `validateJsonQualityResult`.
The `./eslint` export supplies `no-json-stringify-identity`; consumers select their JavaScript scope and enable error severity and unused-disable reporting.
`./configuration-schema` and `./result-schema` export the closed JSON schemas.
Deep source imports are unsupported.

```js
import { runJsonQuality, validateJsonQualityResult } from "@hadden-industries/json-quality";

const result = validateJsonQualityResult(await runJsonQuality("check", { root: process.cwd() }));
process.exitCode = result.status === "passed" ? 0 : 1;
```

Configuration is `.json-quality.json`, with schema 1, mandatory defaults and sparse owner/reason exceptions.
UO's former local schema 4 requires explicit migration; it is rejected rather than silently translated.
Defaults require `prettier-json`, writable eligible authored files and all-string NFC.
The npm lock root key needs the precise `allowEmptyKeys: ["/packages/"]` exception.
Preservation of normalization requires generic writes disabled.
Contradictory matching exceptions fail.
External boundaries never conceal tracked files.

Producer presentation contracts retain the qualified native indented/compact serializers, final-LF and retained-envelope variants.
`preserved-bytes` requires one exact protected path, owner/reason and an independently owned SHA-256/byte-length/diagnostic expectation.
Expected diagnostics are an exact sequence of phase, native rule/message identity and source locations; any extra or missing finding fails.
Matched findings appear under `expectedFindings`, and unperformable parse/presentation phases remain unperformed.
Never create accepted expectations by learning a candidate's current failures.

`runJsonQuality` accepts explicit repository root, required output patterns, explicit normalization source paths, and optional cumulative logical inventory/documents.
Required outputs add obligations without replacing physical discovery.
Each logical inventory entry contains exactly `path`, `sha256`, `byteLength`, `containerPath`, `pointer` and `encoding` (`utf8` or `base64`).
Each supplied logical document contains exactly its canonical `path` and an owned `Buffer` of `bytes`.
Every member must match its independently owned inventory and the actual pointed-to string in a physically discovered container.
Repository adapters must also invoke their existing storage and domain validators.
Logical and JSONL documents are always protected from generic writes.
JSONL uses UTF-8 records, LF or CRLF framing, an optional final terminator, strict per-record analysis and native compact producer presentation; blank records fail.

Operations are `check`, `inventory`, `lint`, `check-format`, `producers`, `format` and `normalize`.
The ordinary `check` covers every phase.
`inventory` reports discovered physical/logical identities, external boundaries and resolved owner/write/presentation/NFC contracts.
It validates policy and scope/provenance accounting without performing JSON analysis or JSONL framing; `syntaxValid` and record counts are null and `checked` is zero.
It establishes scope, never a quality pass; there is no redundant `inspect` alias.
Lint omits presentation findings; presentation checking retains byte/expectation failures; producer checking reaches protected inputs.
The CLI exits 0 for a complete pass, 1 for known findings or partial-write failure and 2 for invalid input or operational failure.
Machine output is opt-in `--json` and validated against result schema 1 plus semantic count, identity, phase and write accounting.
Unknown coverage is represented by null counts, never zero.

Optional configuration `limits` and per-invocation API `limits` override resource defaults; invocation values take precedence.
Values are positive safe integers without arbitrary package ceilings; `limits: false` explicitly bypasses package resource limits.
The CLI exposes each setting, for example `--max-files 100000 --max-file-bytes 67108864`, plus `--no-limits` for the explicit bypass.
Individual overrides and `--no-limits` cannot be combined in one invocation.
Defaults are 50,000 physical files, 32 MiB per document, 256 MiB total physical/logical input, 100,000 logical members, 100,000 records per JSONL file and 10,000 diagnostics.
Limits fail before writes and never disable semantic rules.
Policy bootstrap bytes, Git/tool output and formatter time are capacity controls too, with corresponding override flags; enlarge policy bootstrap capacity using CLI/API overrides before loading a policy larger than the default.
Operating-system/native-tool constraints still apply when package limits are bypassed; failures never become a pass.
These are cooperative admission controls, not an OS sandbox or a promise that native parsers have constant memory cost.
Platform/runtime support requires the named source and transported tests on Windows and Linux; unobserved hosted results remain gaps.
