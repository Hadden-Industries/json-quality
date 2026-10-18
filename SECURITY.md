# Security policy

## Reporting a vulnerability

Report suspected vulnerabilities through [GitHub private vulnerability reporting](https://github.com/Hadden-Industries/json-quality/security/advisories/new).
If that channel is unavailable or unsuitable, email `security@haddenindustries.com`.
Keep vulnerability details out of public issues and pull requests.
Community conduct reports use the separate [Code of Conduct](CODE_OF_CONDUCT.md) process.

Include the exact affected version or source commit, OS and architecture, Node/npm versions, invocation and relevant configuration.
Describe the impact, expected and actual behavior, a minimal non-sensitive reproduction and any known mitigation.
Remove credentials, personal data and unrelated document content; arrange any sensitive evidence through the private channel.

Maksym Shostak / Hadden Industries handles reports manually.
Response and resolution times are not guaranteed.
Coordinate disclosure privately while a fix or effective mitigation is investigated and qualified.

## Development and support status

This repository is a development candidate, not a declared stable support line.
Report issues against the exact source or package you used; historical commits and downloadable artifacts do not imply backport support.
The [runtime compatibility policy](docs/node-runtime-compatibility.md) separates consumer minima, current-family qualification and producer tooling.
A compatibility floor is not a recommendation to run an outdated security patch.
Use current security patches within the supported families.

Release support and promotion require explicit owner decisions under [release operations](https://github.com/Hadden-Industries/json-quality/blob/main/docs/release-operations.md).
Source checks alone do not establish a published release's support or downstream acceptance.

## Security-relevant behavior

The [consumer contract](docs/consumer-guide.md) describes the package's input, discovery, resource and write guarantees.
Suspected path escape, unintended writes, protected-input modification, source-triggered execution, corruption of JSON meaning or numeric lexemes, and bypass of a caller-selected finite resource limit are useful private reports when reachable.
Also report compromised package acquisition or evidence admission with the exact selector and observed identity.

Repository configuration and native document providers are selected by the trusted operator; JSON content does not grant executable configuration or shell authority.
Checking and inventory must not install tools or rewrite input documents.
Explicit normalization has different semantics from formatting and must retain collision checks.
Replacement is guarded per file; later failures must report completed and unprocessed paths truthfully.
Concurrent hostile filesystem mutation is outside the documented supported guarantee.
These expectations guide reports and do not assert that documentation or passing tests prove security.
