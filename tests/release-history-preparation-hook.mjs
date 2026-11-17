// SPDX-License-Identifier: AGPL-3.0-only
/** Replace only external collection for the real checkpoint CLI and target serializer. */
import { registerHooks } from "node:module";

const provider = new URL("../scripts/release-provider.js", import.meta.url)
  .href;
const checkpoint = new URL(
  "../scripts/qualified-release-checkpoint.js",
  import.meta.url,
).href;
const collectedProvider = `
  import * as original from ${JSON.stringify(provider)};
  export * from ${JSON.stringify(provider)};
  import {readFileSync} from "node:fs";
  const fixture=JSON.parse(readFileSync(process.env.RELEASE_HISTORY_FIXTURE));
  export function provider(){return fixture.observed;}
  export function effectAttempt(observed,name){return original.effectAttempt(observed,name,()=>fixture.observed);}
  export function download(){return {directory:fixture.directory};}
  export function readEffectHistory(){return [];}
`;
const collectedTarget = `
  export * from ${JSON.stringify(checkpoint)};
  import {readFileSync} from "node:fs";
  export function collectQualifiedTarget(){
    const fixture=JSON.parse(readFileSync(process.env.RELEASE_HISTORY_FIXTURE));
    const record=JSON.parse(readFileSync(fixture.target));
    record.release.assets.forEach((asset,index)=>{asset.id=index+1;});
    return {record,signatureDueBy:"2027-01-01T00:00:00Z"};
  }
`;
registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL?.endsWith("/scripts/prepare-release-history.js")) {
      const source =
        specifier === "./release-provider.js"
          ? collectedProvider
          : specifier === "./qualified-release-checkpoint.js"
            ? collectedTarget
            : null;
      if (source)
        return {
          url: "data:text/javascript," + encodeURIComponent(source),
          shortCircuit: true,
        };
    }
    return next(specifier, context);
  },
});
