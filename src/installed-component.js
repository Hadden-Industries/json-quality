// SPDX-License-Identifier: AGPL-3.0-only
// Fixed package-relative resolution; no environment, PATH or compiler fallback.
import { fileURLToPath } from "node:url";
import { loadNativeComponent } from "./native-component.js";

let pending;
export function installedNativeComponent() {
  const platform = process.platform + "-" + process.arch;
  if (!["win32-x64", "linux-x64"].includes(platform))
    return Promise.reject(
      new Error(`Unsupported JSON Quality native platform: ${platform}`),
    );
  pending ??= loadNativeComponent(
    fileURLToPath(
      new URL("../native/prebuilt/" + platform + "/", import.meta.url),
    ),
  ).catch((cause) => {
    throw new Error(
      `The verified JSON Quality native component is unavailable for ${platform}.`,
      { cause },
    );
  });
  return pending;
}
