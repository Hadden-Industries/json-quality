# Retained release qualification fixture

`qualified-1.0.0.json` retains actual public qualification evidence from immutable release [437217191](https://github.com/Hadden-Industries/json-quality/releases/tag/v1.0.0).
Its manifest SHA256 is `e5e3bb460a4c697535a2f2646bbd97b96d7d9bdb1fdfc00454207b51f9570728`.
The original single staging origin is run `42321261095`, attempt `1`; public qualification is run `42322378128`, attempt `1`.
Original Ubuntu 24.04 evidence retains its historical meaning.

The release, manifest, asset index and evidence ZIP passed native GitHub release and asset verification during fixture acquisition.
All 362 indexed proof members were checked by the existing bounded archive reader.
This fixture selects the 199 metadata and journal members needed for public target qualification, preserving their exact bytes as base64.
It also retains the exact public annotated tag object, checked against Git object ID `dc3f8a57038f9dd30dfd15ac64c4977b70806709`.
The original public security artifact identity, omitted by the historical context writer, was recovered from GitHub's native artifact inventory: artifact `13553423376`, digest `sha256:dc58c554a63f777a60ba4856f5722eab6a25186964216b79a4aa630b29ba617d`.

It is test data, not a signed recovery checkpoint or live production acceptance.
Tests use isolated provider transports and separate real Git signing-key tests.
Do not regenerate its historical reports with the current controller.
