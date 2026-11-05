// SPDX-License-Identifier: AGPL-3.0-only
import test from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { failureCliResources } from "../src/cli-discovery.js";
import { resolveExecutionResources } from "../src/execution-resources.js";
import { validateJsonQualityEvent } from "../src/events.js";
import { renderHumanEvent } from "../src/cli-messages.js";
import cohort from "../schemas/contract-cohort.json" with { type: "json" };

const root = fileURLToPath(new URL("../", import.meta.url));
const environment = () =>
  Object.fromEntries(
    Object.entries(process.env).filter(
      ([name]) => !name.startsWith("JSON_QUALITY_"),
    ),
  );
function run(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    env: environment(),
    encoding: "utf8",
    windowsHide: true,
    timeout: 10000,
    maxBuffer: 8 * 1024 * 1024,
  });
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  assert.equal(result.status, 2, result.stdout + result.stderr);
  return result;
}

test("independent failure controls reject malformed authority and ignore literal file tokens", () => {
  const selected = resolveExecutionResources(
    {},
    failureCliResources([
      "check-source",
      "--no-capacity-limits",
      "--max-check-time-ms",
      "37",
      "--unknown",
    ]),
  );
  assert.equal(selected.admission.maxToolOutputBytes, null);
  assert.equal(selected.runtime.maxCheckTimeMs, 37);
  assert.notEqual(
    resolveExecutionResources(
      {},
      failureCliResources(["check-files", "--", "--no-capacity-limits"]),
    ).admission.maxToolOutputBytes,
    null,
  );
  for (const args of [
    ["--max-tool-output-bytes", "0"],
    ["--max-check-time-ms", "null", "--max-check-time-ms", "2"],
  ])
    assert.throws(() => failureCliResources(args), TypeError);
  assert.notEqual(
    resolveExecutionResources(
      {},
      failureCliResources(["--root", "--no-capacity-limits"]),
    ).admission.maxToolOutputBytes,
    null,
  );
});

test("early CLI failures honor finite output refusal and full null or unlimited diagnostics", () => {
  const finite = run([
    "src/cli.js",
    "check-source",
    "--ndjson",
    "--max-tool-output-bytes",
    "1",
    "--contract",
    "{",
  ]);
  assert.equal(finite.stdout, "");
  assert.equal(finite.stderr, "");
  const marker = "x".repeat(7000);
  for (const controls of [
    ["--max-tool-output-bytes", "null"],
    ["--no-capacity-limits", "--no-runtime-controls"],
    ["--max-tool-output-bytes", "20000"],
  ]) {
    const result = run([
      "src/cli.js",
      "check-source",
      "--ndjson",
      ...controls,
      "--unknown-" + marker,
    ]);
    const event = JSON.parse(result.stdout);
    assert.equal(event.truncated, false);
    assert.ok(event.message.includes(marker));
    assert.ok(validateJsonQualityEvent(event));
    assert.equal(result.stderr, "");
  }
  const literal = run([
    "src/cli.js",
    "check-files",
    "--max-tool-output-bytes",
    "1",
    "--contract",
    "{}",
    "--",
    "--no-capacity-limits",
  ]);
  assert.equal(literal.stdout + literal.stderr, "");
});

test("qualification discovery and operational failures use caller output quotas", () => {
  const marker = "x".repeat(7000);
  const finite = run([
    "src/qualification-cli.js",
    "--max-tool-output-bytes",
    "1",
    "--unknown-" + marker,
  ]);
  assert.equal(finite.stdout + finite.stderr, "");
  const unlimited = run([
    "src/qualification-cli.js",
    "--max-tool-output-bytes",
    "null",
    "--unknown-" + marker,
  ]);
  assert.ok(unlimited.stderr.includes(marker));
  const operation = run([
    "src/qualification-cli.js",
    "--max-tool-output-bytes",
    "1",
  ]);
  assert.equal(operation.stdout + operation.stderr, "");
  const admitted = run([
    "src/qualification-cli.js",
    "--max-tool-output-bytes",
    "null",
  ]);
  assert.equal(JSON.parse(admitted.stdout).code, "qualification-failed");
});

test("event readers retain historical truncated diagnostics and accept complete extended messages", () => {
  const event = {
    schemaVersion: cohort.eventSchemaVersion,
    requestId: "failure-test",
    type: "failure",
    code: "operation-failed",
    message: "x".repeat(9000) + "\u001b[31m",
    truncated: false,
  };
  assert.ok(validateJsonQualityEvent(event));
  assert.ok(
    validateJsonQualityEvent({
      ...event,
      message: "x".repeat(2048),
      truncated: true,
    }),
  );
  assert.equal(validateJsonQualityEvent({ ...event, message: "" }), false);
  assert.equal(validateJsonQualityEvent({ ...event, message: 4 }), false);
  const human = renderHumanEvent(event);
  assert.ok(human.includes("x".repeat(9000)));
  assert.ok(human.includes("\\u001b[31m"));
  assert.ok(!human.includes("\u001b"));
});

test("a closed failure sink remains exit 2 without an unhandled error or a replay", async () => {
  const program = `import {writeCliFailure} from './src/cli-failure.js';
    import {resolveExecutionResources} from './src/execution-resources.js';
    const options={requestId:'closed-sink',machine:true,resources:resolveExecutionResources({}, {capacityLimits:false,runtimeControls:{maxCheckTimeMs:1000}})};
    const first=await writeCliFailure(new Error('x'.repeat(1048576)),options);
    const second=await writeCliFailure(new Error('must-not-replay'),options);
    process.stderr.write(JSON.stringify({first:String(first),second:String(second)}));process.exitCode=2;`;
  const child = spawn(
    process.execPath,
    ["--input-type=module", "-e", program],
    {
      cwd: root,
      env: environment(),
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let diagnostic = "";
  child.stderr.on("data", (bytes) => {
    diagnostic += bytes;
  });
  child.stdout.destroy();
  const watchdog = setTimeout(() => child.kill(), 5000);
  try {
    const code = await new Promise((done, reject) => {
      child.once("error", reject);
      child.once("close", done);
    });
    assert.equal(code, 2, diagnostic);
    assert.deepEqual(JSON.parse(diagnostic), { first: "0", second: "0" });
  } finally {
    clearTimeout(watchdog);
  }
});

function blockedProgram(kind, duration) {
  const controls = [
    "--max-tool-output-bytes",
    "null",
    "--max-check-time-ms",
    duration,
  ];
  if (kind === "main")
    return `import {runJsonQualityCli} from './src/cli.js'; process.exitCode=await runJsonQualityCli(${JSON.stringify(["check-source", ...controls])},()=>{throw new Error('blocked-'+ 'x'.repeat(2*1024*1024));});`;
  return `import {runJsonQualificationCli} from './src/qualification-cli.js'; process.exitCode=await runJsonQualificationCli([...${JSON.stringify(controls)},'--trusted-root',process.cwd()+'/'+'x'.repeat(2*1024*1024),'--candidate-root',process.cwd(),'--trusted-commit-id','a'.repeat(40),'--candidate-commit-id','b'.repeat(40)]);`;
}

test("real blocked failure pipes honor finite deadlines and null beyond the old one-second ceiling", async () => {
  for (const kind of ["main", "qualification"])
    for (const duration of ["80", "null"]) {
      const began = performance.now();
      const child = spawn(
        process.execPath,
        ["--input-type=module", "-e", blockedProgram(kind, duration)],
        {
          cwd: root,
          env: environment(),
          windowsHide: true,
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      const target = kind === "main" ? child.stderr : child.stdout;
      const other = kind === "main" ? child.stdout : child.stderr;
      let otherOutput = "",
        output = "",
        closed = false;
      other.on("data", (bytes) => {
        otherOutput += bytes;
      });
      const finished = new Promise((done, reject) => {
        child.once("error", reject);
        child.once("close", (code, signal) => {
          closed = true;
          done({ code, signal });
        });
      });
      const exited = new Promise((done) => child.once("exit", done));
      const watchdog = setTimeout(() => child.kill(), 8000);
      try {
        if (duration === "null") {
          await new Promise((done) => setTimeout(done, 1700));
          assert.equal(
            closed,
            false,
            `${kind} unlimited delivery terminated before draining`,
          );
          target.on("data", (bytes) => {
            output += bytes;
          });
        } else {
          target.pause();
          await exited;
          assert.ok(
            performance.now() - began < 4000,
            `${kind} finite failure delivery did not stop`,
          );
          target.resume();
        }
        const result = await finished;
        assert.equal(result.signal, null, otherOutput);
        assert.equal(result.code, 2, otherOutput);
        if (duration === "null") {
          assert.ok(
            output.includes("x".repeat(2 * 1024 * 1024)),
            `${kind} incomplete error output`,
          );
          if (kind === "qualification")
            assert.ok(validateJsonQualityEvent(JSON.parse(output)));
        } else
          assert.ok(
            performance.now() - began < 4000,
            `${kind} finite failure delivery did not stop`,
          );
      } finally {
        clearTimeout(watchdog);
        if (!closed) child.kill();
      }
    }
});
