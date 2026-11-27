const mount = document.querySelector("[data-academy]");
const status = document.querySelector("#learning-status");
const workspace = document.querySelector("#academy-workspace");
const query = new URLSearchParams(location.search);
const coursePath = "/ai-lessons/course/";
const endpoint = "/api/academy/C01";

const labels = {
  masterPrompt: "Master prompt", knowledgeProfile: "Knowledge profile and project brief",
  workflows: "Three workflows", privacyPolicy: "Privacy and authorization policy",
  behavioralTests: "Five documented behavioral tests",
};
const reviewerFields = [
  ["purpose", "Purpose and scope", 15], ["instructions", "Master instructions", 20],
  ["continuity", "Knowledge and continuity", 15], ["workflows", "Three workflows", 15],
  ["privacy", "Privacy and authorization", 20], ["testing", "Testing and refinement", 15],
];

function el(tag, text, attrs = {}) {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

function link(text, href, className = "button") {
  return el("a", text, { href, class: className });
}

function button(text, handler) {
  const element = el("button", text, { type: "button", class: "button" });
  element.addEventListener("click", () => busy(element, handler));
  return element;
}

async function busy(control, run) {
  control.disabled = true;
  status.textContent = "Working…";
  try { await run(); }
  catch (error) { status.textContent = error.message; }
  finally { control.disabled = false; }
}

const get = (path) => window.rcRequest(path);
const post = (path, data = {}) => window.rcRequest(path, "POST", data);

function markdown(source, withOutline = false) {
  const article = el("div", null, { class: "academy-markdown" });
  const headings = [];
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  let list = null;
  let paragraph = [];
  let code = null;
  const flush = () => {
    if (paragraph.length) article.append(el("p", paragraph.join(" ")));
    paragraph = [];
  };
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      flush();
      list = null;
      if (code) {
        const block = el("pre");
        block.append(el("code", code.join("\n")));
        article.append(block);
        code = null;
      } else code = [];
      continue;
    }
    if (code) {
      code.push(line);
      continue;
    }
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    const item = /^(?:([-*])|(\d+)\.)\s+(.+)$/.exec(line);
    if (heading) {
      flush();
      list = null;
      const level = Math.min(heading[1].length + 2, 6);
      const title = el("h" + level, heading[2]);
      if (withOutline && heading[1].length === 2 && headings.length < 18) {
        title.id = `academy-topic-${headings.length + 1}`;
        headings.push(title);
      }
      article.append(title);
    } else if (item) {
      flush();
      const tag = item[2] ? "OL" : "UL";
      if (list?.tagName !== tag) {
        list = el(tag.toLowerCase());
        if (item[2] && item[2] !== "1") list.start = Number(item[2]);
        article.append(list);
      }
      list.append(el("li", item[3]));
    } else if (!line.trim()) {
      flush();
      list = null;
    } else {
      list = null;
      paragraph.push(line.trim());
    }
  }
  flush();
  if (code) article.append(el("pre", code.join("\n")));
  if (headings.length) {
    const outline = el("details", null, { class: "academy-topics" });
    const list = el("ul");
    headings.forEach((heading) => {
      const item = el("li");
      item.append(link(heading.textContent, "#" + heading.id, ""));
      list.append(item);
    });
    outline.append(el("summary", "In this lesson"), list);
    article.prepend(outline);
  }
  return article;
}

function field(parent, id, label, options = {}) {
  const input = el(options.rows ? "textarea" : "input", null, {
    id, name: id, required: "", maxlength: options.max || 4000,
  });
  if (options.rows) input.rows = options.rows;
  if (options.type) input.type = options.type;
  if (options.type === "number") { input.min = "0"; input.max = options.max; input.step = "1"; }
  parent.append(el("label", label, { for: id }), input);
  return input;
}

function confirmation(parent, id, text) {
  const label = el("label", null, { class: "academy-confirm" });
  const input = el("input", null, { type: "checkbox", name: id });
  label.append(input, document.createTextNode(text));
  parent.append(label);
  return input;
}

function submit(form, label, handler) {
  const action = el("button", label, { class: "button primary", type: "submit" });
  form.append(action);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void busy(action, () => handler(new FormData(form)));
  });
}

function courseUrl(view, id) {
  const params = new URLSearchParams({ view });
  if (id) params.set("lesson", id);
  return coursePath + "?" + params + "#learning-title";
}

function summary(state) {
  const progress = state.progress;
  const block = el("div", null, { class: "academy-progress" });
  if (!progress) {
    block.append(el("p", "You haven’t enrolled in Course 01."));
    return block;
  }
  const bar = el("progress", null, { value: progress.completed.length, max: state.lessons.length, "aria-label": "Course progress" });
  block.append(el("p", `${progress.completed.length} of ${state.lessons.length} lessons complete`), bar);
  return block;
}

function navFor(state, current) {
  const panel = el("div", null, { class: "academy-navigation" });
  panel.append(summary(state));
  const disclosure = el("details", null, { class: "academy-lesson-list" });
  const desktop = matchMedia("(min-width: 761px)");
  disclosure.open = desktop.matches;
  desktop.addEventListener("change", () => { disclosure.open = desktop.matches; });
  disclosure.append(el("summary", "Browse lessons and course resources"));
  const nav = el("nav", null, { class: "academy-lesson-nav", "aria-label": "Course navigation" });
  nav.append(el("h3", "Lessons"));
  for (const lesson of state.lessons) {
    const item = link(`${lesson.id} · ${lesson.title}${state.progress.completed.includes(lesson.id) ? " · Complete" : ""}`, courseUrl("lesson", lesson.id), "");
    if (current === lesson.id) item.setAttribute("aria-current", "page");
    nav.append(item);
  }
  nav.append(link("Download the workbook (PDF)", endpoint + "/workbook", ""),
    link("Final examination", courseUrl("final"), ""), link("Capstone project", courseUrl("capstone"), ""),
    link("Completion certificate", courseUrl("certificate"), ""));
  if (state.admin) nav.append(link("Review capstone submissions", courseUrl("review"), ""));
  disclosure.append(nav);
  panel.append(disclosure);
  return panel;
}

function results(state) {
  const panel = el("div", null, { class: "academy-history" });
  const progress = state.progress;
  if (!progress) {
    panel.append(el("p", "No enrollments or purchases yet."), link("Enroll in Course 01", coursePath));
    return panel;
  }
  const course = el("section", null, { class: "academy-card" });
  course.append(el("h3", "Understanding Artificial Intelligence"), el("p", "Course 01 · Free enrollment"), summary(state));
  const id = progress.resume;
  const next = progress.certificate ? "certificate" : progress.passed.includes("final") ? "capstone" : "final";
  course.append(link("Resume Learning", id === "final" ? courseUrl(next) : courseUrl("lesson", id)));
  if (progress.completed.length) {
    const list = el("ul");
    for (const lesson of state.lessons.filter(({ id }) => progress.completed.includes(id))) list.append(el("li", lesson.id + " · " + lesson.title));
    const complete = el("details");
    complete.append(el("summary", "Completed lessons"), list);
    course.append(complete);
  }
  const attempts = el("details");
  attempts.append(el("summary", `Assessment results (${progress.attempts.length})`));
  const list = el("ul");
  for (const attempt of progress.attempts.slice().reverse()) {
    list.append(el("li", `${attempt.assessment === "final" ? "Final exam" : "Lesson " + attempt.assessment} · ${attempt.correct}/${attempt.total} · ${attempt.passed ? "Passed" : "Retake available"} · ${new Date(attempt.submittedAt).toLocaleDateString()} · version ${attempt.version}`));
  }
  attempts.append(list.children.length ? list : el("p", "No submitted assessments."));
  course.append(attempts);
  const capstone = progress.capstone;
  course.append(el("p", `Capstone status: ${capstone ? capstone.status.replace("_", " ") : "Not submitted"}`));
  if (capstone?.feedback) course.append(el("p", capstone.feedback));
  course.append(link(progress.certificate ? "View earned certificate" : "Completion requirements", courseUrl("certificate")));
  panel.append(course, el("h3", "Purchase history"), el("p", "No paid academy purchases."));
  return panel;
}

function assessmentForm(assessment, onScore) {
  const form = el("form", null, { class: "academy-assessment" });
  form.append(el("h3", assessment.id === "final" ? "Final examination" : "Lesson knowledge check"),
    el("p", `${assessment.questions.length} questions. Pass mark ${assessment.passPercentage}%. Retakes are available.`));
  for (const [index, question] of assessment.questions.entries()) {
    const set = el("fieldset");
    set.append(el("legend", `${index + 1}. ${question.question}`));
    question.options.forEach((option, optionIndex) => {
      const label = el("label", null, { class: "academy-option" });
      label.append(el("input", null, { type: "radio", name: question.id, value: optionIndex, required: "" }), document.createTextNode(option));
      set.append(label);
    });
    form.append(set);
  }
  const feedback = el("p", "", { class: "academy-score", role: "status" });
  form.append(feedback);
  submit(form, "Submit answers", async (data) => {
    const answers = assessment.questions.map(({ id }) => Number(data.get(id)));
    const response = await post(`${endpoint}/assessment/${assessment.id}`, { version: assessment.version, answers });
    feedback.textContent = `${response.attempt.correct} of ${response.attempt.total} correct. ${response.attempt.passed ? "Passed." : "Try again when you’re ready."}`;
    status.textContent = "Assessment saved.";
    onScore(response.progress);
  });
  return form;
}

async function renderLesson(state, body, id) {
  const { lesson, assessment } = await get(`${endpoint}/lesson/${encodeURIComponent(id)}`);
  const index = state.lessons.findIndex((item) => item.id === id);
  body.append(el("h2", lesson.id + " · " + lesson.title), markdown(lesson.markdown, true));
  const completion = el("div", null, { class: "academy-actions" });
  function showCompletion(progress) {
    completion.replaceChildren();
    if (progress.completed.includes(id)) completion.append(el("p", "Lesson complete."));
    else if (progress.passed.includes(id)) completion.append(button("Mark lesson complete", async () => {
      const saved = await post(`${endpoint}/lesson/${id}/complete`);
      showCompletion(saved.progress);
      document.querySelector(".academy-navigation .academy-progress")?.replaceWith(summary({ ...state, progress: saved.progress }));
      const current = document.querySelector('.academy-lesson-nav a[aria-current="page"]');
      if (current) current.textContent = `${id} · ${lesson.title} · Complete`;
      status.textContent = "Lesson marked complete.";
    }));
  }
  body.append(assessmentForm(assessment, showCompletion), completion);
  showCompletion(state.progress);
  const actions = el("div", null, { class: "academy-actions" });
  if (index > 0) actions.append(link("Previous lesson", courseUrl("lesson", state.lessons[index - 1].id)));
  actions.append(index < state.lessons.length - 1
    ? link("Next lesson", courseUrl("lesson", state.lessons[index + 1].id))
    : link("Final examination", courseUrl("final")));
  body.append(actions);
}

async function renderCapstone(state, body) {
  const { rubric } = await get(endpoint + "/capstone");
  body.append(el("h2", "Build your personal AI assistant"), markdown(rubric));
  const current = state.progress.capstone;
  if (current) {
    body.append(el("p", `Submission ${current.status.replace("_", " ")}.`));
    if (current.feedback) body.append(el("p", current.feedback));
    if (current.status !== "needs_revision") return;
  }
  if (!state.progress.passed.includes("final")) {
    body.append(el("p", "Pass the final examination before submitting the capstone."), link("Open the final examination", courseUrl("final")));
    return;
  }
  const form = el("form", null, { class: "academy-card" });
  Object.entries(labels).forEach(([key, label]) => field(form, key, label, { rows: 5 }));
  const consent = confirmation(form, "privacyAcknowledged", "I have removed secrets and sensitive information and documented approval for consequential actions.");
  consent.required = true;
  submit(form, "Submit for review", async (data) => {
    await post(endpoint + "/capstone", { ...Object.fromEntries(data), privacyAcknowledged: consent.checked });
    location.reload();
  });
  body.append(form);
}

function renderCertificate(state, body) {
  const cert = state.progress.certificate;
  if (cert) {
    const panel = el("article", null, { class: "academy-certificate" });
    const verify = "/ai-lessons/verify/?id=" + encodeURIComponent(cert.id);
    panel.append(el("p", "AI Unlocked · APPlevate"), el("h2", "Certificate of completion"), el("h3", cert.displayName),
      el("p", cert.title), el("p", new Date(cert.completedAt).toLocaleDateString()), el("p", "Non-accredited course completion"),
      el("p", "Certificate ID: " + cert.id), link("Verify at robbiecalvin.com" + verify, verify));
    body.append(panel, button("Print certificate", async () => { window.print(); status.textContent = ""; }));
  } else {
    body.append(el("h2", "Completion certificate"));
    if (!state.progress.eligible) {
      body.append(el("p", "Finish all ten lessons and checks, pass the final, and have your capstone approved to earn the certificate."));
      return;
    }
    const form = el("form", null, { class: "academy-card" });
    field(form, "displayName", "Name to print on the certificate", { max: 100 });
    const approved = confirmation(form, "nameApproved", "I approve this display name. Public verification shows course and completion details only.");
    approved.required = true;
    submit(form, "Issue my certificate", async (data) => {
      await post(endpoint + "/certificate", { displayName: data.get("displayName"), nameApproved: approved.checked });
      location.reload();
    });
    body.append(form);
  }
}

async function renderReview(body) {
  const { submissions } = await get("/api/academy/review");
  body.append(el("h2", "Capstone review queue"));
  if (!submissions.length) body.append(el("p", "No submissions await review."));
  for (const item of submissions) {
    const details = el("details", null, { class: "academy-card" });
    details.append(el("summary", `Submitted ${new Date(item.submittedAt).toLocaleString()} · ${item.id}`));
    for (const [key, label] of Object.entries(labels)) {
      details.append(el("h3", label), el("p", item.fields[key], { class: "academy-preserve" }));
    }
    const form = el("form");
    const prefix = "review-" + item.id + "-";
    reviewerFields.forEach(([key, label, max]) => field(form, prefix + key, `${label} (0–${max})`, { type: "number", max }));
    field(form, prefix + "feedback", "Explain your decision", { rows: 4 });
    const decisionId = prefix + "privacy-gate";
    const gate = el("select", null, { id: decisionId, name: decisionId, required: "" });
    gate.append(el("option", "Choose a decision", { value: "" }), el("option", "Privacy and authorization requirements met", { value: "yes" }), el("option", "Needs remediation", { value: "no" }));
    form.append(el("label", "Mandatory privacy and authorization gate", { for: decisionId }), gate);
    submit(form, "Save review", async (data) => {
      const scores = Object.fromEntries(reviewerFields.map(([key]) => [key, Number(data.get(prefix + key))]));
      await post(`/api/academy/review/${item.userId}/${item.id}`, {
        scores, feedback: data.get(prefix + "feedback"), privacyApproved: gate.value === "yes",
      });
      details.remove();
      status.textContent = "Review saved.";
    });
    details.append(form);
    body.append(details);
  }
}

async function renderCourse() {
  const view = query.get("view");
  if (query.has("course") && query.get("course") !== "C01") {
    workspace.append(el("p", "This course is coming soon."), link("Back to the catalogue", "/ai-lessons/"));
    return;
  }
  if (view === "preview") {
    const { lesson } = await get("/api/academy/preview");
    workspace.append(el("h2", "Preview · " + lesson.title), markdown(lesson.markdown, true), link("Sign in or enroll to save progress", coursePath));
    return;
  }
  let state;
  try { state = await get(endpoint + "/state"); }
  catch (error) {
    if (error.status !== 401) throw error;
    workspace.append(el("p", "Use your Robbie Calvin account to enroll for free and save progress across devices."),
      link("Sign in or create an account", "/account/?next=ai-unlocked"), link("Preview Lesson 01.01", courseUrl("preview")));
    return;
  }
  if (view === "review") {
    await renderReview(workspace);
    return;
  }
  if (!state.enrolled) {
    workspace.append(summary(state), button("Enroll for free", async () => {
      await post(endpoint + "/enroll");
      location.assign(courseUrl("lesson", "01.01"));
    }), link("Preview Lesson 01.01", courseUrl("preview")));
    if (state.admin) workspace.append(link("Review capstone submissions", courseUrl("review")));
    return;
  }
  const id = query.get("lesson") || state.progress.resume;
  const layout = el("div", null, { class: "academy-layout" });
  const body = el("article", null, { class: "academy-reader" });
  layout.append(navFor(state, id), body);
  workspace.append(layout);
  if (view === "capstone") await renderCapstone(state, body);
  else if (view === "certificate") renderCertificate(state, body);
  else if (view === "final") {
    body.append(el("h2", "Final review examination"));
    if (state.progress.completed.length < state.lessons.length) {
      body.append(el("p", "Complete all ten lessons to unlock the 50-question final."));
      return;
    }
    body.append(el("p", "Suggested time: 60 minutes. The exam draws from the lesson question banks."));
    const { assessment } = await get(endpoint + "/assessment/final");
    const next = el("div", null, { class: "academy-actions" });
    const updateNext = (progress) => {
      next.replaceChildren();
      if (progress.passed.includes("final")) next.append(link("Go to the capstone", courseUrl("capstone")));
    };
    body.append(assessmentForm(assessment, updateNext), next);
    updateNext(state.progress);
  } else if (id === "final") {
    body.append(results(state));
  } else if (state.lessons.some((lesson) => lesson.id === id)) await renderLesson(state, body, id);
  else body.append(el("p", "Choose a lesson from the course navigation."));
}

async function renderVerification() {
  const id = query.get("id");
  if (!id) throw Error("Open the verification link printed on your certificate.");
  const certificate = await get("/api/academy/verify/" + encodeURIComponent(id));
  workspace.append(el("p", "Verified course completion"), el("h3", certificate.title),
    el("p", `${certificate.issuer} · ${new Date(certificate.completedAt).toLocaleDateString()}`),
    el("p", "Certificate ID: " + certificate.id));
}

async function show(run) {
  try {
    await run();
    status.textContent = "";
  } catch (error) {
    status.textContent = error.message;
  }
}

if (mount.dataset.academy === "account") {
  const dashboard = mount.closest("#dashboard");
  const refresh = () => {
    if (dashboard.hidden) return;
    void show(async () => {
      const state = await get(endpoint + "/state");
      workspace.replaceChildren(results(state));
      if (state.admin) workspace.append(link("Review capstone submissions", courseUrl("review")));
    });
  };
  new MutationObserver(refresh).observe(dashboard, { attributes: true, attributeFilter: ["hidden"] });
  refresh();
} else {
  void show(mount.dataset.academy === "verify" ? renderVerification : renderCourse);
}
