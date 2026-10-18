# Architecture admission

Run `npm run check:architecture` on the reference producer after frozen dependency installation.
`check:full` requires this gate before source tests and package qualification.
It is development tooling and is not shipped as a runtime API.

The producer's [`.dependency-cruiser.json`](https://github.com/Hadden-Industries/json-quality/blob/main/.dependency-cruiser.json) owns the native rules:

- imports must resolve and npm imports must be declared;
- runtime source cannot depend on development code or dev dependencies;
- authored JavaScript cycles fail;
- low-level byte, pointer, path, source-contract and identity-rule modules cannot reach document/command orchestration, including through indirect imports;
- shared runtime-policy, toolchain and impact declarations cannot reach their command drivers.

The analyzer covers every module under `src`, `scripts` and `tests`, plus root JavaScript configuration files.
Installed dependencies remain leaves.
Native package-export resolution handles modern packages and public package self-imports without exceptions for the installed-consumer probe.

The adapter also reads native npm's dry-run membership using the existing pack report parser.
Every shipped JavaScript module must have graph coverage, all its local imports (including JSON resources) must ship, and declared export/bin/main targets must ship.
A disconnected shipped module outside the analyzed roots fails explicitly; extending runtime roots needs an intentional policy decision.

Native `node --check` admits authored JavaScript syntax before graph extraction; the analyzer can otherwise omit an invalid module's imports.
This neutral check is shared with affected-test graph extraction, whose caller retains its own census and fallback behavior.

Analyzer, policy and npm errors fail the check with nonzero status.
Native rule and path evidence remains in diagnostics.
Tests use real native analysis and npm membership, with independent positive/negative fixtures for the enforced rules.
The producer-only fixtures join the ordinary source suite; consumer Node lanes retain their runtime/installed-package tests without running producer npm gates.

Architecture admission and affected-test selection have different failure contracts.
The selector conservatively runs more tests when analysis is uncertain; architecture admission rejects uncertainty.
Both reuse the installed native analyzer.
The [development analysis guide](https://github.com/Hadden-Industries/json-quality/blob/main/docs/dependency-graph-and-tests.md) describes external graph views and independent affected/full outcome comparison.
This check does not prove computed module names, copied acquisition bootstrap execution, native cache provenance or runtime semantics.
Existing source tests, native installation checks and transported consumers retain those responsibilities.
Keep these checks complementary when changing boundaries.
