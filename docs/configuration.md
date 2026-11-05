# Configuration and schemas

An existing Git repository needs no `.json-quality.json`.
Only proven absence selects the package-owned defaults; malformed, inaccessible, linked or changed policy sources remain errors.
The package never searches above the chosen root or creates a configuration file.
An optional file can contain `{}`, a sparse override, or a complete current-cohort declaration.
See [the exception-only example](../examples/policy.json).

Defaults select fixed Prettier JSON presentation, NFC checking and ordinary physical rewrite eligibility.
Git metadata and installed dependencies have built-in boundaries; tracked JSON under an excluded ancestor remains checked and protected from generic writes.
Root and nested npm lockfiles remain structurally checked and producer-owned, with generic rewrites prohibited.
Their admitted empty `/packages/` key does not exempt other quality rules.
Names such as `vendor`, `dist`, `generated` and `coverage` alone do not establish external ownership.

## Sparse overrides

Preserve decoded Unicode globally:

```json
{
  "defaults": { "normalization": "preserve" }
}
```

Or preserve only selected authored paths:

```json
{
  "schemaVersion": 4,
  "exceptions": [
    {
      "paths": ["protocol/**"],
      "normalization": "preserve",
      "owner": "Protocol owner",
      "reason": "Decoded sequences are part of the protocol."
    }
  ]
}
```

A preserve override keeps presentation checking and eligible formatting.
It never grants byte identity: use protected-byte or producer ownership contracts for signed/canonicalized data.
Normalize requires NFC eligibility and refuses a mixed selection containing any preserved source before writing.
Potential NFC-equivalent keys under preserve produce `nfc-key-collision-risk`, a separate non-blocking event.
Exact decoded duplicates, invalid Unicode, unsafe numbers and enforced NFC collisions remain errors.

Use `allowSourceRewrites: false` for producer ownership.
Use `nfcExemptStringValues` only for exact decoded value identities with their existing owner, reason, pointer/record, SHA-256 and byte-length pins; keys cannot receive this exemption.
Use `excludeUntrackedSources` only for supported untracked exclusions; tracked sources cannot be hidden.
Conflicting explicit exceptions fail; list order never supplies last-wins precedence.
Built-in protected npm ownership cannot be overridden into generic write permission.

## Input and effective policy

`JsonQualityConfiguration` is the sparse input type.
`resolveJsonQualityPolicy(configuration?, {capacityLimits?, runtimeControls?}?)` returns an independent, deeply frozen `JsonQualityPolicy`.
`defaultJsonQualityPolicy` is a deeply frozen value, not a factory.
The resolver rejects executable getters/serializers, proxies, cycles, unsupported prototypes, holes and hidden/symbol properties without executing caller code.
Repeated acyclic values are snapshotted independently.
Caller mutation cannot change a resolved policy, another session or the package baseline.

Invocation controls govern bounded snapshot/bootstrap work before configuration controls can affect execution.
Source-byte, depth, workspace and elapsed-time limits remain distinct.
Policy resolution never gives configuration an undocumented producer-value ceiling.
Filesystem and immutable Git policy bytes still pass through the strict native reader before materialization and resolution.

A missing `schemaVersion` means the configuration contract shipped with the installed package.
Pin the package and lockfile for reproducibility; long-lived managed policies can explicitly specify `schemaVersion: 4`.
Old explicit schema markers and retired field names are rejected.
There is no interpolation, remote schema retrieval, executable configuration, `extends` or implicit migration.

## Public schema registration

All four public document schemas use JSON Schema 2020-12 and compile offline with strict Ajv 2020 validation.

| Package export            | Logical identifier                                                             |
| ------------------------- | ------------------------------------------------------------------------------ |
| `configuration-schema`    | `https://github.com/Hadden-Industries/json-quality/schema/configuration/v4`    |
| `effective-policy-schema` | `https://github.com/Hadden-Industries/json-quality/schema/effective-policy/v4` |
| `source-contract-schema`  | `https://github.com/Hadden-Industries/json-quality/schema/source-contract/v4`  |
| `event-schema`            | `https://github.com/Hadden-Industries/json-quality/schema/event/v5`            |

These are logical identities, not HTTP download endpoints.
Retrieve the actual files through package exports and register them locally:

```js
import { Ajv2020 } from "ajv/dist/2020.js";
import configuration from "@hadden-industries/json-quality/configuration-schema" with { type: "json" };
import effectivePolicy from "@hadden-industries/json-quality/effective-policy-schema" with { type: "json" };

const ajv = new Ajv2020({ strict: true });
ajv.addSchema(configuration);
const validateEffectivePolicy = ajv.compile(effectivePolicy);
```

`contract-cohort` inventories the coupled configuration, source-contract, event and native-protocol versions.
Upgrade the core and rebuilt platform companions together.
`npm run check:public-schemas` checks strict admission for the four exported schemas; `build:types` regenerates source/schema declarations.
Types do not replace runtime validation.

Producer, installation, acquisition and verification controls belong to their documented operations.
They cannot become source-admission overrides or repository-policy fields through an unknown property.
Repository `transformControls` governs finite rewrites; invocation fields override only named policy fields.
See [resource controls](resource-limits.md), [API](api.md) and [CLI](cli.md).

## Provenance and migration

Execution `configurationOrigin` is one of `repository-file`, `repository-absence`, `git-blob`, `git-absence`, always with the root-relative path `.json-quality.json`.
Git origins include exact `commitId`; only `git-blob` includes `blobId`.
Present file/blob origins require `configurationBytesSha256` and canonical decimal `configurationByteLength`; absence omits both, rather than hashing an invented empty file.
`defaultPolicySha256` hashes exact packaged `assets/default-json-quality-policy.json` bytes.
`policyResolverInputsSha256` hashes exact packaged `assets/json-quality-policy-inputs.json` manifest bytes, including its one LF.
That sorted path/digest manifest covers policy-affecting implementation, schemas and defaults without timestamps, absolute paths or its own entry.

`policyInputsSha256` hashes the UTF-8 compact JSON array below, with no trailing newline, in this exact order:

```text
["json-quality-policy-inputs-v1", cohortVersionAsDecimalString,
 defaultPolicySha256, policyResolverInputsSha256, originKind,
 ".json-quality.json", trustedCommitIdOrNull, gitBlobIdOrNull,
 configurationByteLengthOrNull, configurationBytesSha256OrNull]
```

Every item is a string or null; the displayed line breaks are explanatory and are absent from the compact preimage.
This identifies policy inputs, not effective-policy serialization.
Absent configuration and explicit `{}`, or two whitespace spellings of equal configuration, retain different provenance.
Invocation resource overrides are excluded from this tuple and remain separately recorded with command/core/component identity and resolved resources.
Freshness still verifies actual filesystem observations or immutable Git authority.

Migrate earlier policy `allowFormatWrites` to `allowSourceRewrites`, `preserveNfcValues` to `nfcExemptStringValues`, and `exclude` to `excludeUntrackedSources`.
Their restrictions, pin bytes and tracked-source protections remain.
Public policy admission is now `resolveJsonQualityPolicy`, selected path contracts use `resolveJsonSourceContract`, and input/effective schemas and types have distinct roles.
CLI output uses `--ndjson`; raw stdin uses `check-source`; repository sessions use `check()`.
See the resource migration examples for operation-specific quota renames and split overrides.

Diagnostic identities change without broadening their detection predicates:

| Earlier identity                                                               | Current identity                                            |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| `json/no-empty-keys` / `emptyKey`, or `json-quality/meaningful-keys` / `empty` | `json-quality/no-empty-keys` / `emptyKey`                   |
| `json-quality/meaningful-keys` / `whitespace`                                  | `json-quality/no-surrounding-key-whitespace` / `whitespace` |
| `json-quality/interoperability` / `noncharacter`                               | `json-quality/no-unicode-noncharacters` / `noncharacter`    |
| `json-quality/interoperability` / `integer`                                    | `json-quality/no-unsafe-integers` / `integer`               |
| `json-quality/normalized-strings`                                              | `json-quality/nfc-strings`, retaining message identities    |

Review exact expected-negative pins through these mappings; preserve source hashes, lengths, spans and scalar evidence.
Canonical diagnostic digests must follow the migrated identities through their existing digest owner.
Historical oracle bytes retain their original identities.
