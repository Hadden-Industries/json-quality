# Node runtime compatibility

Use the CLI, SDK and ESLint integration on Windows x64 or Linux x64 with glibc.
Install the matching native companion through npm’s optional dependencies.
Use current security patches within a supported family.

## Node and npm versions

<!-- node-support:start -->

Installability and compatibility floor: Node >=22.13.0.
Qualified LTS majors: 22, 24, 26.
Advance-qualification policy allowance: 26.
Other engine-compatible releases receive best-effort compatibility.

Development/producer reference: 26.13.0.
Producer npm: 12.2.2; consumer qualification npm: 11.21.2.

<!-- node-support:end -->

## Choose the right toolchain

Routine CI, release construction and qualification select the exact producer Node and npm references above.
Compatibility lanes retain the separate consumer npm and exact Node endpoints from [the version policy](../assets/node-support.json).
The advance-qualification allowance is a policy exception, not a statement of a family's current release phase.

Local development can use another stable Node/npm pair supported by the locked development graph.
There is no repository-enforced local npm floor.
The generated `packageManager` records the producer selection; the package's `engines.node` describes consumer admission.
Published consumers do not install the contributor graph or inherit the producer npm requirement.

## Frontend projects and TypeScript

The CLI, SDK and ESLint integration target Node.js tooling rather than browser application execution.
Frontend repositories may use them as development dependencies in Node.js build and CI workflows on the supported platforms.

The root SDK and `./eslint` exports explicitly refuse browser conditions, including when Node is also selected, and have no fallback for unmatched environments.
Their declarations require Node-aware TypeScript resolution such as `NodeNext`.
The schema and cohort JSON subpaths remain independently accessible as data; they do not provide a browser SDK.

## Update the development toolchain

`assets/node-support.json` is the sole editable Node/npm version policy.
The projector and its regression check share one declaration inventory, including `.node-version`, package metadata, workflow pins and local action pins.
The consumer matrix reads its exact Node pins from this policy.
GitHub supplies the action runtime separately.

Native npm owns lockfile updates; consumer ESLint qualification reads its exact selected version from `package-lock.json`.
Tool-enabled consumer fixtures also apply the producer's `eslint` and `@eslint/config-array` dependency overrides at their own installation root.
Runtime package dependencies continue to use the consumer's native resolution and audit.
Python remains owned separately by `.python-version`, and host-proof mismatch tests derive a different version from that target rather than copying a future patch.

Run `npm run sync:node-support`, refresh root metadata with native `npm install --package-lock-only --ignore-scripts --no-audit --no-fund`, then run `npm run check:node-support`.
The check rejects drift without writing; dependency resolutions and historical evidence remain native-owned or immutable.
The supported families exclude odd, future and prerelease Node releases.

The producer remains on its exact reference Node and npm selections; its keyed native pack report is unchanged.
Consumer qualification uses the npm selection in the generated policy block above; its native argument parser, cache reader, tar parser and Git acquisition controls support the older runtimes.

Cold Git acquisition and installed-payload verification retain the public exact-selector, cache-integrity and archive-member contracts.
An unverified `file:` installation is not a substitute for those public admission checks.

## How compatibility is qualified

CI uses the exact compatibility floor, pinned patches and producer reference from the version policy.
It qualifies the same immutable producer archive on Windows 2025 and Ubuntu 24.04, recording the selected Node/npm identities.
The reference lane owns producer packing, lint, format, policy-drift and JSON dogfood checks.
Consumer lanes exercise real installed CLI/API/plugin/schema behavior, preservation, failure paths and native installation verification.

The compatibility floor remains owned by the policy above; producer/development tools retain their own engine requirements independently of the JSON runtime reader.
JSON import attributes exist at that floor; native glob and filesystem behavior require real platform qualification.

The current source selects contract cohort 6, events 5, configuration/source-contract 4, native protocol 5, component schema 4 and Node-API 9; historical packages retain their own cohorts.
The same artifact must be qualified on each selected runtime; an ABI declaration alone is not runtime proof.
Missing platform components fail without a compiler/downloader fallback.

The [accepted implementation plan](https://github.com/Hadden-Industries/json-quality/blob/main/docs/plans/2026-10-16-node-runtime-compatibility-implementation-plan.md) defines qualification and recovery obligations.
These source requirements do not rewrite historical packages, publish to npm, or update downstream installations.
