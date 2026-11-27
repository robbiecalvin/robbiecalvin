const main = document.querySelector("main");
const wideLayout = matchMedia("(min-width: 1200px)");

function addPageOutline() {
  const heading = main.querySelector("h1");
  const hero = [...main.children].find((element) => element === heading || element.contains(heading));
  if (!hero) return;

  const sections = [...main.children].filter((section) =>
    section !== hero && section.matches("section") && !section.hidden &&
    !section.matches("#auth-forms") && (section.querySelector("h2") || section.getAttribute("aria-label")));

  const outline = document.createElement("details");
  outline.className = "page-outline";
  outline.open = wideLayout.matches;
  wideLayout.addEventListener("change", () => { outline.open = wideLayout.matches; });
  const summary = document.createElement("summary");
  summary.textContent = "On this page";
  const links = document.createElement("nav");
  links.setAttribute("aria-label", "On this page");

  const entries = [hero, ...sections].map((section, index) => {
    const sectionHeading = index === 0 ? heading : section.querySelector("h2");
    if (!section.id && !sectionHeading?.id) {
      let id = `page-section-${index + 1}`;
      while (document.getElementById(id)) id += "-section";
      section.id = id;
    }
    const target = section.id ? section : sectionHeading;
    target.dataset.pageWaypoint = "";
    const link = document.createElement("a");
    link.href = `#${target.id}`;
    const label = sectionHeading?.innerText || section.getAttribute("aria-label");
    link.textContent = index === 0 ? "Overview" : label.replace(/\s+/g, " ").trim().replace(/\.$/, "");
    links.append(link);
    return { target, link };
  });

  outline.append(summary, links);
  hero.after(outline);

  function markCurrentSection() {
    const readingLine = Math.min(innerHeight * .45, 300);
    const active = entries.findLastIndex(({ target }) => target.getBoundingClientRect().top <= readingLine);
    entries.forEach(({ link }, index) => {
      if (active === index) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }

  window.addEventListener("scroll", markCurrentSection, { passive: true });
  window.addEventListener("resize", markCurrentSection);
  markCurrentSection();
}

function addImagePreviews() {
  const images = [...main.querySelectorAll(".showcase-media img[alt]:not([alt='']), img[data-page-preview]")];
  if (!images.length || typeof HTMLDialogElement === "undefined") return;

  const dialog = document.createElement("dialog");
  dialog.className = "page-preview";
  dialog.innerHTML = '<form method="dialog"><button type="submit" autofocus>Close preview</button></form><img alt="">';
  const preview = dialog.querySelector("img");
  document.body.append(dialog);

  for (const image of images) {
    if (image.closest("a, button")) continue;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "page-image-button";
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-label", `Enlarge ${image.alt}`);
    image.before(button);
    button.append(image);
    button.addEventListener("click", () => {
      dialog.setAttribute("aria-label", image.alt);
      preview.src = image.currentSrc || image.src;
      preview.alt = image.alt;
      dialog.showModal();
    });
  }
}

if (main) {
  addPageOutline();
  addImagePreviews();
}
