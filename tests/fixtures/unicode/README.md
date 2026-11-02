# Unicode normalization conformance fixture

`NormalizationTest-18.0.0.txt` is the unchanged official Unicode test data from `source/data/unidata/NormalizationTest.txt` in the pinned ICU 79.1 source archive.
Its header identifies Unicode 18.0.0 and the data date `2026-06-24, 13:39:26 GMT`.

- Source archive: [ICU 79.1 sources](https://github.com/unicode-org/icu/releases/download/release-79.1/icu4c-79.1-sources.zip).
- Archive SHA-256: `86fed675c2270afd2faa4ec0c3f37342bd38740feb101432e131758292ae72e7`, as maintained by `native/dependencies.json`.
- Fixture SHA-256: `e529ad96f386caf80aad8f67b7d246ce3b583866ebd8b719a095bcf0e573a0d0`.
- Fixture byte length: `1089359`.
- License: Unicode License V3 (`Unicode-3.0`); the complete copyright and permission notice from the source archive is retained in `LICENSE.txt`.

The native conformance test checks all five NFC equations for all 20,171 listed rows: c1/c2/c3 normalize to c2, and c4/c5 normalize to c4.
Expected strings come directly from these columns; JavaScript normalization is not an oracle.
This proves the listed NFC vectors against the packaged native normalizer and records its actual ICU/Unicode identity.
It does not assert the separate UCD rule for every assigned character absent from Part 1, other normalization forms, or untested platforms.
