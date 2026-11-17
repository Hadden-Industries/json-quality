# Documentation diagrams

Each HTML file is the authored source for one figure.
Open it in a browser to inspect the complete diagram and its text description.
The SVG beside it is a generated static export used by the guides.

After editing a source, format it with Prettier and run `npm run sync:documentation-diagrams`.
`npm run check:documentation-diagrams`, included in `check:source`, rejects stale exports.
The exporter uses only Node.js; no browser, installed diagram skill or network service is required in CI.

## Presentation and accessibility

Use system fonts, a white opaque canvas, dark ink and one blue focal accent.
The fixed canvas also preserves contrast on dark GitHub and npm backgrounds.
Keep meaning in labels, shapes and line treatments rather than color alone.
Use at most nine nodes, twelve connections and two focal elements per figure.

The HTML preview keeps a wide diagram inside a keyboard-accessible local scroll region.
Print styling fits the complete drawing on the page.
Markdown embeds link to the full-size SVG for zooming and include short alternative text.
The adjacent prose provides the complete essential explanation without requiring the image.
Keep that explanation consistent with the SVG's title and description.

Guides use relative Markdown image paths, so GitHub resolves images within the selected branch or tag and installed documentation resolves the packaged files.
The npm package page displays the root README and links to these guides; it does not host the package's documentation tree as a website.
The README's visual-guide links use explicit GitHub URLs pinned to the package version, projected from the existing release template variable.
They do not depend on npm rewriting relative URLs and resolve when the corresponding release tag is available.
Only the six SVG exports ship in the package; the authoring HTML and this maintenance guide remain in the repository.

## Figure ownership

| Source                   | Owning guide                                             |
| ------------------------ | -------------------------------------------------------- |
| `session-lifecycle.html` | Consumer guide: stream a source and read lossless values |
| `guarded-rewrite.html`   | Consumer guide: preview and apply a repository rewrite   |
| `trusted-ci.html`        | Trusted consumer CI: policy and source boundaries        |
| `checking-paths.html`    | Architecture overview                                    |
| `release-handoffs.html`  | Release operations overview                              |
| `release-recovery.html`  | Release operations: failure, recovery and evidence       |

Edit generated guides through their files in `docs/release-templates`, then run `npm run sync:version`.
Link to the owning section from other guides instead of duplicating figures.
