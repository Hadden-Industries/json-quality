// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { once } from "node:events";
import { artifactLimits } from "../scripts/artifact-policy.js";
import { budgets } from "../scripts/qualification-budgets.js";
import {
  createRepositoryReader,
  retryDelay,
} from "../scripts/github-evidence.js";
import { recoverableUpload } from "../scripts/upload-evidence.js";
import { sameJobExecution } from "../scripts/github-job-execution.js";
import { requireResults, verifyProducingAttempt } from "../scripts/ci-proof.js";
import { requireCleanAudit } from "../scripts/check-security.js";

function reader(fetchImpl, limit = 120000) {
  let time = 0;
  return createRepositoryReader({
    repository: "Hadden-Industries/json-quality",
    token: "fixture",
    fetchImpl,
    now: () => time,
    random: () => 0,
    deadline: limit,
    sleep: async (milliseconds) => {
      time += milliseconds;
    },
  });
}

test("real fetch admits only the validated artifact redirect without forwarding credentials", async (t) => {
  const requests = [];
  const server = createServer((request, response) => {
    requests.push({
      path: request.url,
      authorization: request.headers.authorization,
    });
    if (request.url === "/redirect") {
      response.writeHead(302, {
        location:
          "https://fixture.blob.core.windows.net/proof?signature=fixture",
      });
      response.end();
    } else response.end("proof");
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const read = reader((url, options) => {
    const target = new URL(url);
    return fetch(
      new URL(
        target.hostname === "api.github.com" ? "/redirect" : "/payload",
        origin,
      ),
      options,
    );
  });
  assert.equal(
    (await read("/actions/artifacts/1/zip", { raw: true })).toString(),
    "proof",
  );
  assert.deepEqual(requests, [
    { path: "/redirect", authorization: "Bearer fixture" },
    { path: "/payload", authorization: undefined },
  ]);
});
test("evidence GET retries classified transient responses within one finite budget", async () => {
  let calls = 0;
  const read = reader(async () => {
    calls++;
    if (calls === 1)
      throw Object.assign(new Error("reset"), { code: "ECONNRESET" });
    if (calls === 2) return new Response("unavailable", { status: 503 });
    return Response.json({ immutable: "source" });
  });
  assert.deepEqual(await read("/actions/runs/1"), { immutable: "source" });
  assert.equal(calls, 3);
});

test("large admitted downloads retain independent metadata readback and cumulative byte limits", async () => {
  let calls = 0;
  const payload = Buffer.alloc(artifactLimits.metadataBytes + 1);
  const read = reader(async () =>
    ++calls === 1 ? new Response(payload) : Response.json({ retained: true }),
  );
  assert.equal(
    (
      await read("/actions/artifacts/1/zip", {
        raw: true,
        maximumBytes: payload.length,
      })
    ).length,
    payload.length,
  );
  assert.deepEqual(await read("/actions/artifacts/1"), { retained: true });
  const bounded = createRepositoryReader({
    repository: "Hadden-Industries/json-quality",
    token: "fixture",
    maximumDownloadBytes: 8,
    fetchImpl: async () => new Response("12345"),
  });
  await bounded("/actions/artifacts/1/zip", { raw: true });
  await assert.rejects(
    bounded("/actions/artifacts/2/zip", { raw: true }),
    /budget exhausted/u,
  );
});

test("slow artifact bodies use the remaining shared read budget across redirects", async (t) => {
  let time = 0,
    requests = 0;
  const timers = [];
  t.mock.method(AbortSignal, "timeout", (milliseconds) => {
    const controller = new AbortController();
    timers.push({ at: time + milliseconds, controller });
    return controller.signal;
  });
  const advance = (milliseconds) => {
    time += milliseconds;
    for (const timer of timers)
      if (time >= timer.at)
        timer.controller.abort(
          new DOMException("fixture timeout", "TimeoutError"),
        );
  };
  const read = createRepositoryReader({
    repository: "Hadden-Industries/json-quality",
    token: "fixture",
    now: () => time,
    fetchImpl: async (url, options) => {
      requests++;
      const target = new URL(url);
      if (target.hostname === "api.github.com") {
        advance(
          target.pathname.endsWith("/zip")
            ? budgets.read / 8
            : budgets.read / 2,
        );
        options.signal.throwIfAborted();
        return new Response(null, {
          status: 302,
          headers: { location: "https://fixture.blob.core.windows.net/proof" },
        });
      }
      assert.equal(options.headers, undefined);
      return new Response(
        new ReadableStream({
          pull(controller) {
            advance(budgets.read / 2);
            try {
              options.signal.throwIfAborted();
              controller.enqueue(Buffer.from("proof"));
              controller.close();
            } catch (error) {
              controller.error(error);
            }
          },
        }),
      );
    },
    sleep: async (milliseconds) => advance(milliseconds),
    random: () => 0,
  });
  assert.equal(
    (await read("/actions/artifacts/1/zip", { raw: true })).toString(),
    "proof",
  );
  assert.equal(requests, 2, "A valid slow body must not require another GET");
  assert.equal(time, (budgets.read * 5) / 8);
  await assert.rejects(read("/actions/artifacts/1"), /budget exhausted/);
});
test("binary collections use their longer finite budget while metadata keeps its short budget", async (t) => {
  const admitted = [];
  t.mock.method(AbortSignal, "timeout", (milliseconds) => {
    admitted.push(milliseconds);
    return new AbortController().signal;
  });
  for (const budgetMs of [budgets.read, budgets.collection]) {
    let time = 0;
    const read = createRepositoryReader({
      repository: "Hadden-Industries/json-quality",
      token: "fixture",
      budgetMs,
      now: () => time,
      fetchImpl: async () => {
        time += budgets.read + 1;
        return new Response("{}");
      },
    });
    const acquired = read("/actions/artifacts/1/zip", { raw: true });
    if (budgetMs === budgets.read) {
      await assert.rejects(acquired, /budget exhausted/);
      await assert.rejects(read("/actions/artifacts/1"), /budget exhausted/);
    } else {
      await acquired;
      await read("/actions/artifacts/1");
    }
  }
  assert.equal(admitted[0], budgets.read);
  assert.equal(admitted[1], budgets.collection);
  assert.equal(admitted[2], budgets.collection - budgets.read - 1);
});
test("malformed, permanent and exhausted evidence never becomes retry-until-valid", async () => {
  for (const response of [
    new Response("{bad"),
    new Response("forbidden", { status: 403 }),
    new Response("missing", { status: 404 }),
  ]) {
    let calls = 0;
    const read = reader(async () => {
      calls++;
      return response;
    });
    await assert.rejects(read("/actions/runs/1"));
    assert.equal(calls, 1);
  }
  let calls = 0;
  const read = reader(async () => {
    calls++;
    return new Response("rate limited", {
      status: 429,
      headers: { "retry-after": "121" },
    });
  });
  await assert.rejects(read("/actions/runs/1"), /budget exhausted/u);
  assert.equal(calls, 1);
  assert.equal(
    retryDelay(
      new Response("", {
        status: 403,
        headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "90" },
      }),
      0,
      0,
      () => 0,
    ),
    90000,
  );
});
test("read transport bounds include body overflow and restricted signed redirects", async () => {
  await assert.rejects(
    reader(async () => new Response("x".repeat(2 * 1024 * 1024 + 1)))(
      "/actions/runs/1",
    ),
    /budget exhausted/u,
  );
  await assert.rejects(
    reader(
      async () =>
        new Response(null, {
          status: 302,
          headers: { location: "https://example.com/stolen" },
        }),
    )("/actions/artifacts/1/zip", { raw: true }),
    /storage origin/u,
  );
  let calls = 0;
  const read = reader(async (url, options) => {
    calls++;
    if (calls === 1)
      return new Response(null, {
        status: 302,
        headers: {
          location:
            "https://fixture.blob.core.windows.net/proof?signature=fixture",
        },
      });
    assert.equal(
      options.headers,
      undefined,
      "GitHub credentials must not reach storage",
    );
    return new Response("proof");
  });
  assert.equal(
    (await read("/actions/artifacts/1/zip", { raw: true })).toString(),
    "proof",
  );
});
const digest = "sha256:" + "a".repeat(64);
test("lost finalization acknowledgement reconciles byte-identical proof without a second write", async () => {
  let uploads = 0,
    lookups = 0,
    time = 0;
  const result = await recoverableUpload({
    name: "proof.json",
    sha256: digest,
    size: 4,
    now: () => time,
    sleep: async (ms) => {
      time += ms;
    },
    upload: async () => {
      uploads++;
      throw Object.assign(new Error("lost ack"), { code: "ECONNRESET" });
    },
    lookup: async () => (++lookups < 3 ? [] : [{ id: 7, size: 4, digest }]),
  });
  assert.equal(result.id, 7);
  assert.equal(result.reconciled, true);
  assert.equal(uploads, 1);
  assert.equal(lookups, 3);
});
test("unknown lookup, conflicting proof and invalid successful upload stop recovery", async () => {
  for (const lookup of [
    async () => {
      throw new Error("lookup unknown");
    },
    async () => [{ id: 7, size: 4, digest: "sha256:" + "b".repeat(64) }],
    async () => [
      { id: 7, size: 4, digest },
      { id: 8, size: 4, digest },
    ],
  ]) {
    let uploads = 0;
    await assert.rejects(
      recoverableUpload({
        name: "proof.json",
        sha256: digest,
        size: 4,
        upload: async () => {
          uploads++;
          throw Object.assign(new Error("reset"), { code: "ECONNRESET" });
        },
        lookup,
      }),
    );
    assert.equal(uploads, 1);
  }
  let lookups = 0;
  await assert.rejects(
    recoverableUpload({
      name: "proof.json",
      sha256: digest,
      size: 4,
      upload: async () => ({ id: 7, size: 4, digest: "bad" }),
      lookup: async () => {
        lookups++;
        return [];
      },
    }),
  );
  assert.equal(lookups, 0, "Invalid success is an admission failure");
});
test("only confirmed absence permits a fresh upload name", async () => {
  let time = 0;
  const names = [];
  const result = await recoverableUpload({
    name: "proof.json",
    sha256: digest,
    size: 4,
    now: () => time,
    sleep: async (ms) => {
      time += ms;
    },
    lookup: async () => [],
    upload: async (name) => {
      names.push(name);
      if (names.length === 1)
        throw Object.assign(new Error("reset"), { code: "ECONNRESET" });
      return { id: 8, digest, size: 4 };
    },
  });
  assert.equal(result.name, "proof-recovery-2.json");
  assert.deepEqual(names, ["proof.json", "proof-recovery-2.json"]);
});
const job = {
  id: 1,
  name: "lane",
  run_id: 7,
  run_attempt: 1,
  head_sha: "a".repeat(40),
  runner_id: 3,
  status: "completed",
  conclusion: "success",
  started_at: "2026-10-27T00:00:00Z",
  completed_at: "2026-10-27T00:01:00Z",
};
test("partial reruns authenticate original executions despite mutable attempt and job labels", async () => {
  const latest = { ...job, id: 99, run_attempt: 2 };
  assert.equal(sameJobExecution(job, latest), true);
  const run = { id: 7, run_attempt: 2, head_sha: job.head_sha };
  await verifyProducingAttempt(latest, 1, run, async () => ({
    total_count: 1,
    jobs: [job],
  }));
  await assert.rejects(
    verifyProducingAttempt(latest, 2, run, async (path) => ({
      total_count: 1,
      jobs: [path.includes("/attempts/2/") ? latest : job],
    })),
    /retained earlier execution|relabelled/u,
  );
  assert.throws(
    () => sameJobExecution({ ...job, runner_id: 0 }, latest),
    /unavailable/u,
  );
});
test("skipped mandatory work and incomplete audit data remain blocking", () => {
  const needs = Object.fromEntries(
    ["dependencies", "native", "policy", "product", "codeql"].map((name) => [
      name,
      { result: "success" },
    ]),
  );
  requireResults(needs);
  needs.native.result = "skipped";
  assert.throws(() => requireResults(needs));
  assert.throws(() =>
    requireCleanAudit({
      auditReportVersion: 2,
      vulnerabilities: {},
      metadata: {},
    }),
  );
  assert.throws(() =>
    requireCleanAudit({
      auditReportVersion: 2,
      vulnerabilities: { package: { severity: "low" } },
      metadata: { vulnerabilities: { total: 1 } },
    }),
  );
});
