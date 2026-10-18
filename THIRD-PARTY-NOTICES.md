# Third-party notices

`CODE_OF_CONDUCT.md` adapts Contributor Covenant 3.0 under CC BY-SA 4.0.
Its separate policy-text license does not change the JSON Quality code's AGPL-3.0-only license.

Repository Markdown development tooling uses `@hadden-industries/markdown-quality` (AGPL-3.0-only) from the exact source recorded in `tooling/markdown/source.json`.
Its retained core and platform archives include their upstream notices, native component inventories and source-offer material.
This isolated development graph is not included in the JSON Quality npm package.

Runtime dependencies are ESLint (MIT), the official ESLint JSON plugin (Apache-2.0), Ajv (MIT), and Prettier (MIT).
The independent test oracle Momoa is Apache-2.0 and is a direct development dependency.
Dependency-cruiser (MIT) is a development dependency used for affected-test selection and architecture enforcement; it is not a runtime dependency.
Native npm installation retains dependency licence files; dependency versions and integrity are frozen in `package-lock.json`.
The final transported dependency graph and applicable source/notice delivery must be reviewed before consumer activation or distribution.
