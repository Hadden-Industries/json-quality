// SPDX-License-Identifier: AGPL-3.0-only
/** Recording native-process boundary for ordinary writer entry-point tests. */
import { registerHooks, isBuiltin } from "node:module";
import { pathToFileURL } from "node:url";
import { dirname } from "node:path";

const npmRoot = pathToFileURL(
  dirname(dirname(process.env.JSON_QUALITY_PRODUCER_NPM)),
).href;
const transport = `
  import * as real from "child_process";
  export * from "child_process";
  import {readFileSync,writeFileSync} from "node:fs";
  import {basename} from "node:path";
  export function spawnSync(executable,args,options) {
    const path=process.env.RELEASE_PROVIDER_FIXTURE;
    const state=JSON.parse(readFileSync(path));
    const persist=()=>writeFileSync(path,JSON.stringify(state));
    const ok=(value)=>{persist();return {status:0,signal:null,stdout:typeof value==="string"?value:JSON.stringify(value),stderr:""};};
    state.calls.push({executable:basename(executable),args});
    if (["python", "python3"].includes(basename(executable).replace(/\\.exe$/u,"")) && /(?:pack|extract)-artifact\\.py$/u.test(args[0])) { persist(); return real.spawnSync(executable,args,options); }
    if(basename(executable).replace(/\\.exe$/u,"")==="git") {
      if(!args.includes("cat-file")&&!args.includes("verify-tag")) throw new Error("Unexpected Git operation");
      persist(); return real.spawnSync(executable,args,{...options,env:{...process.env,...options.env,GIT_DIR:state.gitDirectory}});
    }
    if(args[0]?.endsWith("github-evidence.js")) {
      const route=args[1].startsWith("/")?args[1].slice(1):args[1];
      if (args.includes("--binary") && state.binary?.[route]) { persist(); return {status:0, signal:null, stdout:Buffer.from(state.binary[route],"base64"), stderr:Buffer.alloc(0)}; }
      if(route==="releases/latest") return ok(state.github.latest);
      if(route.startsWith("releases/")) {
        const value=Object.values(state.github.releases).find(r=>String(r.id)===route.slice(9)||"tags/"+r.tag_name===route.slice(9));
        if(value) return ok(value);
      }
      if(!Object.hasOwn(state.routes,route)) throw new Error("Unexpected native GET: "+route);
      const value=state.routes[route];
      return ok(args.includes("--paginate")?[value]:value);
    }
    if(args[0]===process.env.JSON_QUALITY_PRODUCER_NPM) {
      const command=args.slice(1);
      if(command[0]==="--version") return ok("12.2.2");
      if(command[0]==="view") {
        if(state.failAfterNpmWrites && state.mutations.filter(value=>value.service==="npm").length===state.failAfterNpmWrites) throw new Error("Readback unavailable after acknowledged request");
        const name=command[1];
        if(!Object.hasOwn(state.npm,name)) throw new Error("Unexpected npm package: "+name);
        const value=command[2]==="dist-tags"?state.npm[name]:{name,versions:[],"dist-tags":state.npm[name]};
        return ok(state.singleton?[value]:value);
      }
      if(command[0]==="stage"&&command[1]==="publish") {
        const receipt=JSON.parse(readFileSync(process.env.RELEASE_ADMITTED_DIRECTORY+"/writer-admission.json"));
        const release=receipt.release;
        const subject=[...release.platformArchives,{package:release.package,version:release.version,archive:release.archive}].find(v=>v.archive.filename===basename(command[2]));
        if(!subject) throw new Error("Unadmitted stage archive");
        state.mutations.push({service:"stage",package:subject.package,args:command});
        return ok({[subject.package]:{name:subject.package,version:subject.version,integrity:subject.archive.integrity,stageId:"stage-"+state.mutations.length}});
      }
      if(command[0]==="dist-tag") {
        if(!command.includes("--fetch-retries=0")) throw new Error("Mutation retries were not disabled");
        const remove=command[1]==="rm", spec=command[2], split=spec.lastIndexOf("@");
        const name=remove?spec:spec.slice(0,split), target=remove?null:spec.slice(split+1);
        state.mutations.push({service:"npm",package:name,target});
        if(remove) delete state.npm[name][command[3]]; else state.npm[name][command[3]]=target;
        return ok("updated");
      }
      throw new Error("Unexpected npm command: "+JSON.stringify(command));
    }
    if(basename(executable).replace(/\\.exe$/u,"")==="gh"&&args[0]==="release"&&args[1]==="edit") {
      const target=Object.values(state.github.releases).find(value=>value.tag_name===args[2]);
      if(!target) throw new Error("Unknown immutable target");
      state.mutations.push({service:"github",id:target.id,args});
      if(args.includes("--prerelease=false")) target.prerelease=false;
      if(args.includes("--latest=true")) state.github.latest=structuredClone(target);
      return ok("");
    }
    throw new Error("Unexpected native process: "+JSON.stringify([executable,args]));
  }
`;
const nativeModule = "data:text/javascript," + encodeURIComponent(transport);
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "node:child_process")
      return { url: nativeModule, shortCircuit: true };
    if (
      !isBuiltin(specifier) &&
      !/^(?:file:|data:|[./]|[A-Za-z]:)/u.test(specifier) &&
      !context.parentURL?.startsWith(npmRoot)
    )
      throw new Error("Project dependency graph is absent: " + specifier);
    const resolved = next(specifier, context);
    if (
      resolved.url?.includes("/node_modules/") &&
      !resolved.url.startsWith(npmRoot)
    )
      throw new Error("Project dependency graph is absent: " + resolved.url);
    return resolved;
  },
});
