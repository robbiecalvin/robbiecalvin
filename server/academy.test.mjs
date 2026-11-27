import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createApp } from "./server.mjs";

const route = "/api/academy/C01";
const input = process.env.ACADEMY_TEST_BUNDLE;
const lessonIds = Array.from({ length: 10 }, (_, i) => `01.${String(i + 1).padStart(2, "0")}`);
const assessment = (id, count) => ({
  id, passPercentage: 80,
  questions: Array.from({ length: count }, (_, i) => ({
    id: `${id}-${i + 1}`, question: `Fixture question ${i + 1}`, options: ["Option one", "Option two"], correct_index: 0, explanation: "Private fixture.",
  })),
});
const fixture = {
  title: "Understanding Artificial Intelligence", version: "fixture-1", rubric: "# Rubric",
  workbookPdf: Buffer.from("%PDF-1.7 fixture").toString("base64"),
  lessons: lessonIds.map(id => ({ id, title: `Lesson ${id}`, markdown: `# Lesson ${id}` })),
  assessments: Object.fromEntries([...lessonIds, "final"].map((id, i) => [id, assessment(id, i === 0 ? 5 : i === 10 ? 50 : 10)])),
};

test("AI Unlocked account journey, persisted scores, reviewer gate, and private verification", async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), "rc-academy-test-"));
  const bundle = input ? JSON.parse(await readFile(input, "utf8")) : fixture;
  const bundlePath = path.join(dir, "private-bundle.json");
  await writeFile(bundlePath, JSON.stringify(bundle));
  const email = [];
  const origin = "http://localhost:8787";
  const env = { APP_ORIGIN: origin, DATA_DIR: dir, ACADEMY_BUNDLE_PATH: bundlePath, ADMIN_EMAILS: "reviewer@example.test" };
  let app, base;
  async function start() {
    app = await createApp({ env, sendMail: async message => email.push(message) });
    app.server.listen(0, "127.0.0.1");
    await once(app.server, "listening");
    base = `http://127.0.0.1:${app.server.address().port}`;
  }
  async function stop() {
    if (app?.server.listening) await new Promise(resolve => app.server.close(resolve));
  }
  t.after(async () => { await stop(); await rm(dir, { recursive: true, force: true }); });
  await start();
  async function call(url, { cookie, data, requestOrigin = origin } = {}) {
    const response = await fetch(base + url, { method: data === undefined ? "GET" : "POST",
      headers: { Origin: requestOrigin, ...(cookie ? { Cookie: cookie } : {}), ...(data === undefined ? {} : { "Content-Type": "application/json" }) },
      body: data === undefined ? undefined : JSON.stringify(data) });
    const raw = await response.text();
    return { status: response.status, headers: response.headers, raw, data: response.headers.get("content-type")?.includes("json") ? JSON.parse(raw) : undefined };
  }
  const password = "fictional-academy-password";
  async function login(address) {
    const response = await call("/api/auth/login", { data: { email: address, password } });
    assert.equal(response.status, 200);
    return response.headers.getSetCookie().at(-1).split(";")[0];
  }
  async function register(address) {
    const response = await call("/api/auth/register", { data: { email: address, password, name: "Fictional Student" } });
    assert.equal(response.status, 202);
    const token = new URLSearchParams(new URL(email.at(-1).url).hash.slice(1)).get("verify");
    assert.equal((await call("/api/auth/verify", { data: { token } })).status, 200);
    return login(address);
  }
  const right = id => bundle.assessments[id].questions.map(question => question.correct_index);
  const attempt = (id, cookie, answers = right(id)) =>
    call(`${route}/assessment/${id}`, { cookie, data: { version: bundle.version, answers } });
  const keyLeak = /"correct_index"|"explanation"/;

  await t.test("guest preview, closed premium course, and private workbook", async () => {
    const preview = await call("/api/academy/preview");
    assert.equal(preview.status, 200);
    assert.equal(preview.data.lesson.id, "01.01");
    assert.doesNotMatch(preview.raw, keyLeak);
    for (const url of ["/state", "/lesson/01.02", "/workbook", "/assessment/final"]) {
      assert.equal((await call(route + url)).status, 401);
    }
    assert.equal((await call("/.local-data/ai-unlocked/course-01.json")).status, 404);
    assert.equal((await call("/supabase/functions/_shared/academy.mjs")).status, 404);
  });

  let student = await register("student@example.test");
  const other = await register("other@example.test");
  const reviewer = await register("reviewer@example.test");
  const id = (await call("/api/me", { cookie: student })).data.user.id;
  for (const course of ["C02", "C07", "C10"]) {
    assert.equal((await call("/api/academy/" + course + "/enroll", { cookie: student, data: {} })).status, 404);
  }
  assert.equal((await call(route + "/enroll", { cookie: student, data: {}, requestOrigin: "https://foreign.example" })).status, 403);

  await t.test("idempotent enrollment and course browsing without answer keys", async () => {
    for (let i = 0; i < 2; i++) assert.equal((await call(route + "/enroll", { cookie: student, data: { userId: "ignored" } })).status, 200);
    const workbook = await call(route + "/workbook", { cookie: student });
    assert.equal(workbook.status, 200);
    assert.match(workbook.headers.get("content-disposition"), /attachment/);
    assert.match(workbook.raw, /^%PDF/);
    assert.equal((await call(route + "/workbook", { cookie: other })).status, 403);
    const intro = await call(route + "/lesson/01.01", { cookie: student });
    assert.equal(intro.data.assessment.questions.length, 5);
    assert.doesNotMatch(intro.raw, keyLeak);
    assert.equal((await call(route + "/assessment/final", { cookie: student })).status, 403);
    assert.equal((await call(route + "/certificate", { cookie: student, data: { displayName: "Fictional Student", nameApproved: true } })).status, 403);
  });

  await t.test("validate answers, retain failed attempts, and persist across sessions and restart", async () => {
    assert.equal((await attempt("01.01", student, [])).status, 400);
    assert.equal((await attempt("01.01", student, right("01.01").map((answer, i) => (answer + 1) % bundle.assessments["01.01"].questions[i].options.length))).data.attempt.passed, false);
    assert.equal((await call(route + "/lesson/01.01/complete", { cookie: student, data: {} })).status, 409);
    for (const lessonId of lessonIds) {
      const lesson = await call(route + "/lesson/" + lessonId, { cookie: student });
      assert.equal(lesson.status, 200);
      assert.doesNotMatch(lesson.raw, keyLeak);
      const result = await attempt(lessonId, student);
      assert.equal(result.data.attempt.passed, true);
      assert.doesNotMatch(result.raw, keyLeak);
      assert.equal((await call(route + "/lesson/" + lessonId + "/complete", { cookie: student, data: {} })).status, 200);
    }
    const exam = await call(route + "/assessment/final", { cookie: student });
    assert.equal(exam.data.assessment.questions.length, 50);
    assert.doesNotMatch(exam.raw, keyLeak);
    assert.equal((await attempt("final", student)).data.attempt.correct, 50);
    await stop();
    await start();
    student = await login("student@example.test");
    const state = await call(route + "/state", { cookie: student });
    assert.equal(state.data.progress.completed.length, 10);
    assert.equal(state.data.progress.attempts.length, 12);
    assert.equal((await call(route + "/state", { cookie: other })).data.progress, null);
  });

  await t.test("reviewer authorization, mandatory privacy gate, and idempotent certificate", async () => {
    const submission = {
      masterPrompt: "<img src=x onerror=alert(1)> fixture is stored as text", knowledgeProfile: "Fictional profile",
      workflows: "Three fictional workflows", privacyPolicy: "Require approval", behavioralTests: "Five fictional tests",
    };
    assert.equal((await call(route + "/capstone", { cookie: student, data: submission })).status, 400);
    assert.equal((await call(route + "/capstone", { cookie: student, data: { ...submission, privacyAcknowledged: true } })).status, 200);
    assert.equal((await call("/api/academy/review", { cookie: student })).status, 403);
    const score = { purpose: 15, instructions: 20, continuity: 15, workflows: 15, privacy: 20, testing: 15 };
    const review = async (privacyApproved) => {
      const pending = (await call("/api/academy/review", { cookie: reviewer })).data.submissions[0];
      const url = `/api/academy/review/${id}/${pending.id}`;
      const data = { scores: score, feedback: "Fictional review", privacyApproved };
      assert.equal((await call(url, { cookie: other, data })).status, 403);
      return call(url, { cookie: reviewer, data });
    };
    assert.equal((await review(false)).data.status, "needs_revision");
    const payload = { displayName: "Fictional Student", nameApproved: true };
    assert.equal((await call(route + "/certificate", { cookie: student, data: payload })).status, 403);
    assert.equal((await call(route + "/capstone", { cookie: student, data: { ...submission, privacyAcknowledged: true } })).status, 200);
    assert.equal((await review(true)).data.status, "approved");
    const results = await Promise.all([1, 2].map(() => call(route + "/certificate", { cookie: student, data: payload })));
    assert(results.every(item => item.status === 200));
    const [first, second] = results.map(item => item.data.certificate);
    assert.equal(first.id, second.id);
    const verification = await call("/api/academy/verify/" + first.id);
    assert.equal(verification.status, 200);
    assert.match(verification.headers.get("cache-control"), /no-store/);
    assert(!verification.raw.includes("Fictional Student"));
    assert.equal((await call(route + "/state", { cookie: other })).data.progress, null);
  });
});
