import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

const project = fileURLToPath(new URL("../", import.meta.url));
const fixturePrefix = join(tmpdir(), "motiontrace-static-test-");
const fixtures = [
  ["app.js", "text/javascript", "console.log('motiontrace');"],
  ["app.css", "text/css", "body { color: black; }"],
  ["model.wasm", "application/wasm", Buffer.from([0, 97, 115, 109])],
];
let directory;
let server;
let baseUrl;

before(async () => {
  directory = await mkdtemp(fixturePrefix);
  await mkdir(join(directory, "assets"));
  await writeFile(join(directory, "index.html"), "<!doctype html><title>MotionTrace</title>");
  for (const [name, , content] of fixtures) await writeFile(join(directory, "assets", name), content);
  await writeFile(join(directory, "assets", "sample.mp4"), "abcde");

  const reservation = createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const port = reservation.address().port;
  await new Promise((accept) => reservation.close(accept));
  baseUrl = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, ["server/index.mjs"], {
    cwd: project,
    env: { ...process.env, PORT: String(port), FORM_DIST_DIR: directory, FORM_PUBLIC_ACCESS: "true" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise((accept, reject) => {
    const timeout = setTimeout(() => reject(new Error("Static server did not start")), 5000);
    server.stdout.on("data", (data) => {
      if (data.toString().includes("[FORM_SERVER] listening")) { clearTimeout(timeout); accept(); }
    });
    server.once("error", (error) => { clearTimeout(timeout); reject(error); });
    server.once("exit", (code) => { clearTimeout(timeout); reject(new Error(`Static server exited: ${code}`)); });
  });
});

after(async () => {
  if (server && server.exitCode === null) {
    const exited = once(server, "exit");
    server.kill();
    await exited;
  }
  if (directory) {
    assert.ok(resolve(directory).startsWith(resolve(fixturePrefix)));
    await rm(directory, { recursive: true, force: true });
  }
});

test("serves the application home page", async () => {
  const response = await fetch(baseUrl);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /<title>MotionTrace<\/title>/);
});

for (const [name, type, content] of fixtures) {
  test(`serves ${name} with its own content and MIME type`, async () => {
    const response = await fetch(`${baseUrl}/assets/${name}`);
    assert.equal(response.status, 200);
    assert.ok(response.headers.get("content-type").startsWith(type));
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), Buffer.from(content));
  });
}

test("supports video byte ranges", async () => {
  const response = await fetch(`${baseUrl}/assets/sample.mp4`, { headers: { Range: "bytes=1-3" } });
  assert.equal(response.status, 206);
  assert.equal(response.headers.get("content-range"), "bytes 1-3/5");
  assert.equal(await response.text(), "bcd");
});

test("keeps the application fallback for client-side routes", async () => {
  const response = await fetch(`${baseUrl}/training/history`);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /<title>MotionTrace<\/title>/);
});
