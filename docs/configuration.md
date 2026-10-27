# Configuration and schemas

The repository policy is `.json-quality.json`, admitted through the shared strict reader and the closed configuration schema.
Start with [the maintained policy example](../examples/policy.json).
Defaults require fixed Prettier JSON presentation, explicit write permission and NFC.
Sparse exceptions name their paths, owner and reason; contradictory overlaps fail rather than selecting a convenient rule.
Tracked JSON remains checked inside excluded installed/generated ancestors.

Use `allowFormatWrites: false` for producer-owned presentation, and explicit `preserveNfcValues` identities for narrowly protected values.
Exclusions and expected-negative cases are not a general mechanism for hiding owned JSON.
Public admission and runtime controls have separate meanings; [resource controls](resource-limits.md) owns their complete vocabulary and ranges.

## Public schema registration

All three public contract schemas declare JSON Schema **2020-12**, use `$defs`, and compile offline with strict Ajv 2020 validation.

| Package export           | Logical identifier                                                            |
| ------------------------ | ----------------------------------------------------------------------------- |
| `configuration-schema`   | `https://github.com/Hadden-Industries/json-quality/schema/configuration/v3`   |
| `source-contract-schema` | `https://github.com/Hadden-Industries/json-quality/schema/source-contract/v3` |
| `event-schema`           | `https://github.com/Hadden-Industries/json-quality/schema/event/v3`           |

These are stable logical identities, not HTTP download endpoints.
Retrieve the actual files through package exports and register them locally; no GitHub Pages service or network schema fetch is required.

```js
import { Ajv2020 } from "ajv/dist/2020.js";
import configuration from "@hadden-industries/json-quality/configuration-schema" with { type: "json" };
import event from "@hadden-industries/json-quality/event-schema" with { type: "json" };

const ajv = new Ajv2020({ strict: true });
ajv.addSchema(configuration);
const validateEvent = ajv.compile(event);
```

The runtime imports those same exported files.
`npm run check:schemas` strictly compiles them and checks positive/negative admission.
Generated schema declarations live in `types/schemas/`; `build:types` regenerates both schema and source-JSDoc views.
TypeScript describes accepted shapes; runtime admission remains mandatory.

`contract-cohort` is a version inventory, not another public document schema.
The retired v1 result/document-request/document-response schemas are not exports.
Cohort 3 adds nullable quotas and boolean runtime selection, and removes the unused `maxConcurrency` field.
Use policy `schemaVersion: 3` with the matching rebuilt platform packages; configuration, event and protocol cohorts move together.
Producer and verification quota definitions support their operation-specific API options; they are not repository-policy fields.
`transformControls` can configure repository rewrites, with explicit invocation fields taking precedence.
