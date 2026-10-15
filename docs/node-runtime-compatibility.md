# Node runtime compatibility

The consumer minimum is the oldest runtime justified by production dependencies and qualified package behavior.
Use current security patches for ordinary operation; a compatibility floor is not a security recommendation.

<!-- node-support:start -->

- Node 22: 22.13.0
- Node 24: 24.0.0
- Node 26: 26.0.0

Development/producer reference: 24.21.0.
Producer npm: 12.2.0; consumer qualification npm: 11.21.1.

<!-- node-support:end -->

`assets/node-support.json` is the sole editable version policy.
Run `npm run sync:node`, refresh root metadata with native `npm install --package-lock-only --ignore-scripts --no-audit --no-fund`, then run `npm run check:node`.
The check rejects drift without writing; dependency resolutions and historical evidence remain native-owned or immutable.
The supported families exclude odd, future and prerelease Node releases.

The producer remains on its reference Node and npm 12; its keyed native pack report is unchanged.
Consumer qualification uses the npm selection in the generated policy block above; its native argument parser, cache reader, tar parser and Git acquisition controls support the older runtimes.
Cold Git acquisition and installed-payload verification retain the public exact-selector, cache-integrity and archive-member contracts.
An unverified `file:` installation is not a substitute for those public admission checks.

CI freezes each exact minimum, current stable release per family and the independent reference from official Node metadata.
It qualifies the same immutable producer archive on Windows 2025 and Ubuntu 24.04, recording the selected Node/npm identities.
The reference lane owns producer packing, lint, format, policy-drift and JSON dogfood checks.
Consumer lanes exercise real installed CLI/API/plugin/schema behavior, preservation, failure paths and native installation verification.

The dependency boundary for Node 22 is ESLint 10 and its language-plugin graph at 22.13.0.
JSON import attributes exist at that floor; native glob and filesystem behavior require real platform qualification.
Runtime compatibility does not change configuration schema 1, result schema 3, JSON semantics, resource limits or write guarantees.

The [accepted implementation plan](plans/2026-10-16-node-runtime-compatibility-implementation-plan.md) defines qualification and recovery obligations.
These source requirements do not rewrite historical packages, publish to npm, or update downstream installations.
