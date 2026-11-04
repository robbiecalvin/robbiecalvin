import {frames, frameIndex, turn} from './comic-reader-state.mjs';

const root = document.querySelector('[data-comic-reader]');
const stage = root.querySelector('[data-comic-stage]');
const book = root.querySelector('[data-comic-book]');
const counter = root.querySelector('[data-comic-counter]');
const previous = root.querySelector('[data-comic-previous]');
const next = root.querySelector('[data-comic-next]');
const coverButton = root.querySelector('[data-comic-cover]');
const zoomButton = root.querySelector('[data-comic-zoom]');
const fullscreenButton = root.querySelector('[data-comic-fullscreen]');
const issueSelect = root.querySelector('[data-comic-issue]');
const status = root.querySelector('[data-comic-status]');
const mobile = matchMedia('(max-width: 700px)');
let issues = [], issue, page = -1, touch;

function validImage(value) {
  if (!value || typeof value !== 'object' || typeof value.src !== 'string' || !value.src.startsWith('/assets/')) return null;
  return {src: value.src, alt: typeof value.alt === 'string' ? value.alt : ''};
}

function imageNode(item, label) {
  const figure = document.createElement('figure');
  figure.className = 'comic-sheet';
  if (!item) {
    const missing = document.createElement('div');
    missing.className = 'comic-missing-page';
    const heading = document.createElement('h3'); heading.textContent = label;
    const note = document.createElement('p'); note.textContent = 'This page is temporarily unavailable. You can continue to the next spread.';
    missing.append(heading, note); figure.append(missing); return figure;
  }
  const image = document.createElement('img');
  image.src = item.src;
  image.alt = item.alt || `${issue.title} — ${label}`;
  image.decoding = 'async';
  image.loading = 'eager';
  image.addEventListener('error', () => {
    const note = document.createElement('p');
    note.className = 'comic-image-error';
    note.textContent = `${label} could not load. Try refreshing this page.`;
    figure.replaceChildren(note);
  }, {once: true});
  const caption = document.createElement('figcaption');
  caption.textContent = label;
  figure.append(image, caption);
  return figure;
}

function resetZoom() {
  stage.classList.remove('comic-zoomed');
  zoomButton.setAttribute('aria-pressed', 'false');
  zoomButton.textContent = 'Zoom in';
}

function render() {
  if (!issue) return;
  const count = issue.pages.length;
  const list = frames(count, !mobile.matches);
  const index = frameIndex(page, count, !mobile.matches);
  const visible = list[index];
  book.replaceChildren();
  book.classList.toggle('comic-cover', index === 0);
  book.classList.toggle('comic-spread', visible.length === 2);
  let hasImage = false;
  if (index === 0 && issue.cover) {
    book.append(imageNode(issue.cover, 'Cover'));
    hasImage = true;
  } else if (index > 0) {
    for (const number of visible) book.append(imageNode(issue.pages[number], `Page ${number + 1}`));
    hasImage = true;
  } else {
    const empty = document.createElement('div');
    empty.className = 'comic-empty';
    const tag = document.createElement('span');
    tag.className = 'comic-issue-tag';
    tag.textContent = issue.title;
    const heading = document.createElement('h2');
    heading.textContent = 'The story is on its way.';
    const note = document.createElement('p');
    note.textContent = 'The cover and comic pages will appear here when this issue is published.';
    empty.append(tag, heading, note);
    book.append(empty);
  }
  const first = visible[0] + 1;
  counter.textContent = index === 0 ? `${issue.title} · Cover${count ? ` · ${count} pages` : ' · Coming soon'}` : `${issue.title} · ${visible.length === 2 ? `Pages ${first}–${first + 1}` : `Page ${first}`} of ${count}`;
  previous.disabled = index === 0;
  next.disabled = index === list.length - 1;
  next.textContent = index === 0 ? 'Open issue →' : 'Next →';
  coverButton.disabled = index === 0;
  zoomButton.disabled = !hasImage;
  status.textContent = count ? (visible.some(number => number >= 0 && !issue.pages[number]) ? 'Page 4 is temporarily unavailable. Reading order is preserved.' : mobile.matches ? 'One page at a time. Use the arrows or swipe to turn.' : 'Two-page spreads. Use the arrows or your keyboard to turn.') : 'Issue 1 is not published yet.';
  for (const number of list[index + 1] || []) {
    if (number >= 0 && issue.pages[number]) { const preload = new Image(); preload.src = issue.pages[number].src; }
  }
}

function navigate(direction) {
  if (!issue) return;
  page = turn(page, issue.pages.length, !mobile.matches, direction);
  resetZoom();
  render();
}

previous.addEventListener('click', () => navigate(-1));
next.addEventListener('click', () => navigate(1));
coverButton.addEventListener('click', () => {page = -1; resetZoom(); render();});
issueSelect.addEventListener('change', () => {issue = issues.find(item => item.id === issueSelect.value); page = -1; resetZoom(); render();});
mobile.addEventListener('change', () => {resetZoom(); render();});
zoomButton.addEventListener('click', () => {
  const enabled = stage.classList.toggle('comic-zoomed');
  zoomButton.setAttribute('aria-pressed', String(enabled));
  zoomButton.textContent = enabled ? 'Fit pages' : 'Zoom in';
});
fullscreenButton.hidden = !document.fullscreenEnabled;
fullscreenButton.addEventListener('click', async () => {
  try {if (document.fullscreenElement) await document.exitFullscreen(); else await root.requestFullscreen();}
  catch {status.textContent = 'Fullscreen is unavailable in this browser.';}
});
document.addEventListener('fullscreenchange', () => {fullscreenButton.textContent = document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen';});
root.addEventListener('keydown', event => {
  if (event.target.closest('input, textarea, select') || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === 'ArrowRight') {event.preventDefault(); navigate(1);}
  if (event.key === 'ArrowLeft') {event.preventDefault(); navigate(-1);}
  if (event.key === 'Home') {event.preventDefault(); page = -1; resetZoom(); render();}
  if (event.key === 'Escape') resetZoom();
});
stage.addEventListener('touchstart', event => {if (event.touches.length === 1) touch = {x: event.touches[0].clientX, y: event.touches[0].clientY};}, {passive: true});
stage.addEventListener('touchend', event => {
  if (!touch || stage.classList.contains('comic-zoomed')) {touch = null; return;}
  const end = event.changedTouches[0];
  const dx = end.clientX - touch.x, dy = end.clientY - touch.y;
  if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.4) navigate(dx < 0 ? 1 : -1);
  touch = null;
}, {passive: true});

try {
  const response = await fetch('/assets/data/wild-chemistry.json');
  if (!response.ok) throw new Error('Unavailable issue list');
  const manifest = await response.json();
  if (!Array.isArray(manifest.issues)) throw new Error('Invalid issue list');
  issues = manifest.issues.map((item, index) => ({id: String(item.id || `issue-${index + 1}`), title: String(item.title || `Issue ${index + 1}`), cover: validImage(item.cover), pages: Array.isArray(item.pages) ? item.pages.map(validImage) : []}));
  if (!issues.length) throw new Error('No issues available');
  for (const item of issues) {
    const option = document.createElement('option'); option.value = item.id; option.textContent = item.title;
    issueSelect.append(option);
  }
  issue = issues[0]; render();
} catch {
  status.textContent = 'The comic reader is temporarily unavailable. Please try again shortly.';
  book.textContent = 'Issue information could not load.';
}
