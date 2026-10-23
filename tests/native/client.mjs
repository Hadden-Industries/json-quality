// SPDX-License-Identifier: AGPL-3.0-only
// The artifact locator is test-only; transport and component validation use the
// production owners. Public installed resolution remains a separate contract.
import { randomUUID } from "node:crypto";
import { dirname, isAbsolute, join } from "node:path";
import { tmpdir } from "node:os";
import { loadNativeComponent } from "../../src/native-component.js";
import { installedNativeComponent } from "../../src/installed-component.js";
import { NativeSession as CoreSession } from "../../src/native-session.js";

const directory = process.env.JSON_QUALITY_NATIVE_TEST_ARTIFACTS;
if (directory !== undefined && !isAbsolute(directory))
  throw new Error(
    "Supply an absolute JSON_QUALITY_NATIVE_TEST_ARTIFACTS for native qualification.",
  );
const verified =
  directory === undefined
    ? await installedNativeComponent()
    : await loadNativeComponent(directory);
export { verified as verifiedComponent };
export const component = verified.manifest;
export const nativeTemporaryRoot =
  directory === undefined ? tmpdir() : dirname(directory);

export class NativeSession extends CoreSession {
  constructor({ temporaryDirectory = nativeTemporaryRoot } = {}) {
    const scratch = join(
      temporaryDirectory,
      "json-quality-native-test-" + randomUUID(),
    );
    super(verified, scratch);
    this.scratch = scratch;
  }
  capture(input, contract = {}, options = {}) {
    return super.capture(input, contract, {
      includeValueEvents: true,
      ...options,
    });
  }
}
