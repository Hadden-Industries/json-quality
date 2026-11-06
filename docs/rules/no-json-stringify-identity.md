# no-json-stringify-identity

The rule rejects JSON serialization used as equality, set/map membership, a computed property or hash identity.
Object member order, omitted values and serialization hooks make that representation unsuitable for general semantic identity.
ESLint owns parsing and lexical scope resolution; the rule follows bounded aliases and reports exhausted analysis as a diagnostic.

## Enable the rule

Use the exported recommended flat configuration:

```js
import jsonQuality from "@hadden-industries/json-quality/eslint";

export default [jsonQuality.configs.recommended];
```

## Compare values

The rule reports this equality check.

```js
const same = JSON.stringify(left) === JSON.stringify(right);
```

Select an explicit domain comparison, such as Node's `isDeepStrictEqual`, when its semantics match the contract:

```js
import { isDeepStrictEqual } from "node:util";

const same = isDeepStrictEqual(left, right);
```

## Declare a byte or tuple identity

Serialization used to produce an output document remains valid.
For an intentionally byte-, digest- or ordered-tuple-based identity, place a precise line contract directly before the serialization:

```js
const seen = new Set();
// json-identity-contract: ordered-tuple; owner: request coordinate; reason: The contract defines an ordered tuple of admitted strings.
const key = JSON.stringify([repository, commit]);
seen.add(key);
```

The escape hatch declares the actual identity contract and owner; it does not establish that arbitrary JSON objects have stable serialization.
Malformed, misplaced or unused contract comments are reported.

## Options and diagnostics

The default analysis allowance is 64 lexical frames and 100,000 steps.
Configure `maxFrames` and `maxSteps` as positive safe integers in the rule's options to accommodate a larger alias graph.
An explicit `false` removes these analysis ceilings; it does not disable the rule.

| Diagnostic      | What to check                                                              |
| --------------- | -------------------------------------------------------------------------- |
| `identity`      | Choose a comparison that matches the domain.                               |
| `contract`      | Check the contract text and its position immediately before serialization. |
| `unused`        | Remove the unused contract comment.                                        |
| `analysisLimit` | Inspect the alias chain and the configured analysis limits.                |
