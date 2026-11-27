export const courseId = "C01";
export const rubric = [
  ["purpose", 15], ["instructions", 20], ["continuity", 15],
  ["workflows", 15], ["privacy", 20], ["testing", 15],
];
const capstoneFields = ["masterPrompt", "knowledgeProfile", "workflows", "privacyPolicy", "behavioralTests"];
const opaqueId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(status, message) {
  throw Object.assign(new Error(message), { status });
}

function inputText(value, max, label) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) {
    fail(400, `${label} is required and must be at most ${max} characters.`);
  }
  return value.trim();
}

function result(assessment, answers) {
  if (!Array.isArray(answers) || answers.length !== assessment.questions.length ||
      !assessment.questions.every((question, i) => Number.isInteger(answers[i]) && answers[i] >= 0 && answers[i] < question.options.length)) {
    fail(400, "Choose one valid answer for every question.");
  }
  const correct = assessment.questions.filter((question, i) => question.correct_index === answers[i]).length;
  const total = assessment.questions.length;
  return { correct, total, passed: correct * 100 >= assessment.passPercentage * total };
}

function assessmentView(assessment, version) {
  return {
    id: assessment.id, version, passPercentage: assessment.passPercentage,
    questions: assessment.questions.map(({ id, question, options }) => ({ id, question, options })),
  };
}

function progress(bundle, state) {
  const attempts = state.attempts;
  const current = attempts.filter(({ version }) => version === bundle.version);
  const passed = new Set(current.filter(({ passed }) => passed).map(({ assessment }) => assessment));
  const completed = bundle.lessons.filter(({ id }) => state.completed[id] === bundle.version && passed.has(id)).map(({ id }) => id);
  const latest = state.capstones.at(-1);
  const last = latest?.version === bundle.version ? latest : null;
  return {
    enrolledAt: state.enrolledAt, completed, passed: [...passed], attempts,
    resume: bundle.lessons.find(({ id }) => !completed.includes(id))?.id || "final",
    capstone: last ? { submittedAt: last.submittedAt, status: last.review?.status || "pending", score: last.review?.score, feedback: last.review?.feedback } : null,
    certificate: state.certificate,
    eligible: completed.length === bundle.lessons.length && passed.has("final") &&
      last?.review?.status === "approved",
  };
}

async function mutate(store, userId, change) {
  for (let retry = 0; retry < 5; retry++) {
    const row = await store.get(userId);
    if (!row) fail(403, "Enroll in Course 01 first.");
    const state = structuredClone(row.state);
    const value = change(state);
    if (await store.update(userId, row.revision, state)) return value;
  }
  fail(409, "Learning progress changed while saving. Please retry.");
}

export async function academyRequest({ path, method, actor, body, store, loadBundle, headers = new Headers() }) {
  const json = (data, status = 200) => {
    headers.set("Cache-Control", "private, no-store");
    return Response.json(data, { status, headers });
  };
  const route = path.replace(/^\/academy\/?/, "");
  const certificateRoute = route.match(/^verify\/([0-9a-f-]+)$/i);
  if (method === "GET" && certificateRoute) {
    const id = certificateRoute[1];
    if (!opaqueId.test(id)) fail(404, "Certificate not found.");
    const certificate = await store.findCertificate(id);
    if (!certificate) fail(404, "Certificate not found.");
    return json({ id: certificate.id, title: certificate.title, completedAt: certificate.completedAt, issuer: "AI Unlocked · APPlevate" });
  }

  const preview = route === "preview" && method === "GET";
  if (!preview && !actor) fail(401, "Sign in with your Robbie Calvin account.");
  const admin = route === "review" || route.startsWith("review/");
  if (admin && !actor.admin) fail(403, "Academy reviewer access required.");
  if (!preview && !admin && !route.startsWith("C01/")) fail(404, "This course is coming soon.");
  const bundle = await loadBundle();
  if (!bundle) fail(503, "Course materials are not available on this server.");
  const action = route.slice(4);
  const userId = actor?.id;
  if (preview) return json({ lesson: bundle.lessons[0] });

  if (route === "review" && method === "GET") {
    const rows = await store.list();
    return json({ submissions: rows.flatMap(({ user_id, state }) => {
      const latest = state.capstones.at(-1);
      return latest && !latest.review ? [{ userId: user_id, ...latest }] : [];
    }) });
  }
  const reviewRoute = route.match(/^review\/([0-9a-f-]+)\/([0-9a-f-]+)$/i);
  if (reviewRoute && method === "POST") {
    const [, studentId, submissionId] = reviewRoute;
    if (!opaqueId.test(studentId) || !opaqueId.test(submissionId)) fail(404, "Submission not found.");
    const data = await body();
    if (!rubric.every(([key, max]) => Number.isInteger(data.scores?.[key]) && data.scores[key] >= 0 && data.scores[key] <= max) || typeof data.privacyApproved !== "boolean") {
      fail(400, "Enter valid scores and record the mandatory privacy decision.");
    }
    const feedback = inputText(data.feedback, 4000, "Review feedback");
    const score = rubric.reduce((sum, [key]) => sum + data.scores[key], 0);
    const review = { score, scores: Object.fromEntries(rubric.map(([key]) => [key, data.scores[key]])), privacyApproved: data.privacyApproved,
      status: score >= 80 && data.privacyApproved ? "approved" : "needs_revision", feedback, reviewerId: userId, reviewedAt: new Date().toISOString() };
    return json(await mutate(store, studentId, (state) => {
      const submission = state.capstones.at(-1);
      if (submission?.id !== submissionId || submission.review) fail(409, "This submission is no longer awaiting review.");
      submission.review = review;
      return { status: review.status, score };
    }));
  }

  if (action === "enroll" && method === "POST") {
    await store.insert(userId, { enrolledAt: new Date().toISOString(), completed: {}, attempts: [], capstones: [], certificate: null });
    const row = await store.get(userId);
    return json({ progress: progress(bundle, row.state) });
  }

  const row = await store.get(userId);
  if (action === "state" && method === "GET") {
    return json({
      title: bundle.title, version: bundle.version, admin: Boolean(actor.admin),
      lessons: bundle.lessons.map(({ id, title }) => ({ id, title })),
      enrolled: Boolean(row), progress: row ? progress(bundle, row.state) : null,
      purchases: [], entitlement: row ? "free" : null,
    });
  }
  if (!row) fail(403, "Enroll in Course 01 to continue.");
  if (action === "workbook" && method === "GET") {
    const pdf = Uint8Array.from(atob(bundle.workbookPdf), char => char.charCodeAt(0));
    const responseHeaders = new Headers(headers);
    responseHeaders.set("Content-Type", "application/pdf");
    responseHeaders.set("Content-Disposition", 'attachment; filename="AI-Unlocked-Course-01-Workbook.pdf"');
    responseHeaders.set("Cache-Control", "private, no-store");
    return new Response(pdf, { headers: responseHeaders });
  }
  if (action === "capstone" && method === "GET") return json({ rubric: bundle.rubric });

  const lessonRoute = action.match(/^lesson\/(01\.(?:0[1-9]|10))(\/complete)?$/);
  if (lessonRoute) {
    const lesson = bundle.lessons.find(({ id }) => id === lessonRoute[1]);
    if (method === "GET" && !lessonRoute[2]) {
      return json({ lesson, assessment: assessmentView(bundle.assessments[lesson.id], bundle.version) });
    }
    if (method === "POST" && lessonRoute[2]) {
      return json(await mutate(store, userId, (state) => {
        if (!progress(bundle, state).passed.includes(lesson.id)) fail(409, "Pass the lesson check before marking it complete.");
        state.completed[lesson.id] = bundle.version;
        return { progress: progress(bundle, state) };
      }));
    }
  }

  const assessmentRoute = action.match(/^assessment\/(final|01\.(?:0[1-9]|10))$/);
  if (assessmentRoute) {
    const assessment = bundle.assessments[assessmentRoute[1]];
    if (assessment.id === "final" && progress(bundle, row.state).completed.length !== bundle.lessons.length) {
      fail(403, "Complete all ten lessons before taking the final examination.");
    }
    if (method === "GET" && assessment.id === "final") return json({ assessment: assessmentView(assessment, bundle.version) });
    if (method === "POST") {
      const data = await body();
      if (data.version !== bundle.version) fail(409, "The course changed. Reload the assessment.");
      const score = result(assessment, data.answers);
      return json(await mutate(store, userId, (state) => {
        const attempt = { assessment: assessment.id, version: bundle.version, submittedAt: new Date().toISOString(), ...score };
        state.attempts.push(attempt);
        return { attempt, progress: progress(bundle, state) };
      }));
    }
  }

  if (action === "capstone" && method === "POST") {
    const data = await body();
    if (data.privacyAcknowledged !== true) fail(400, "Confirm the privacy and authorization requirements.");
    const fields = Object.fromEntries(capstoneFields.map(key => [key, inputText(data[key], 4000, key)]));
    return json(await mutate(store, userId, (state) => {
      const current = progress(bundle, state);
      if (current.completed.length !== bundle.lessons.length || !current.passed.includes("final")) fail(403, "Complete the lessons and final examination first.");
      const last = state.capstones.at(-1);
      if (last?.version === bundle.version && (!last.review || last.review.status === "approved")) fail(409, "A capstone is already awaiting review or approved.");
      state.capstones.push({ id: crypto.randomUUID(), version: bundle.version, submittedAt: new Date().toISOString(), fields });
      return { progress: progress(bundle, state) };
    }));
  }

  if (action === "certificate" && method === "POST") {
    const data = await body();
    const displayName = inputText(data.displayName, 100, "Certificate display name");
    if (data.nameApproved !== true || /[\r\n]/.test(displayName)) fail(400, "Approve the display name before issuing a certificate.");
    return json(await mutate(store, userId, (state) => {
      if (!state.certificate) {
        if (!progress(bundle, state).eligible) fail(403, "Complete all course requirements before issuing a certificate.");
        state.certificate = { id: crypto.randomUUID(), displayName, title: bundle.title,
          completedAt: new Date().toISOString(), version: bundle.version };
      }
      return { certificate: state.certificate };
    }));
  }

  fail(404, "Learning endpoint not found.");
}
