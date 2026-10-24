// SPDX-License-Identifier: AGPL-3.0-only
// Fixed package-relative resolution; no environment, PATH or compiler fallback.
import { fileURLToPath } from "node:url";
import { loadNativeComponent } from "./native-component.js";
import { resolveNativePackage } from "./native-packages.js";

let pending;
export function installedNativeComponent() {
  pending ??= resolveNativePackage(
    fileURLToPath(new URL("../", import.meta.url)),
  )
    .then(({ directory }) => loadNativeComponent(directory))
    .catch((cause) => {
      throw new Error(
        "The verified optional JSON Quality native component is unavailable.",
        { cause },
      );
    });
  return pending;
}
