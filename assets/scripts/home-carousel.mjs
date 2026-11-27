const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const portraitStage = document.querySelector(".home-portrait-stage");
const portraitMotion = matchMedia("(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)");
const portraitLayers = [["portrait", 7], ["orbit", 17]];

portraitStage.addEventListener("pointermove", (event) => {
  if (!portraitMotion.matches || event.pointerType === "touch") return;
  const bounds = portraitStage.getBoundingClientRect();
  const x = (event.clientX - bounds.left) / bounds.width - .5;
  const y = (event.clientY - bounds.top) / bounds.height - .5;
  for (const [layer, depth] of portraitLayers) {
    portraitStage.style.setProperty(`--${layer}-x`, `${x * depth}px`);
    portraitStage.style.setProperty(`--${layer}-y`, `${y * depth}px`);
  }
});

function resetPortraitLayers() {
  for (const [layer] of portraitLayers) {
    portraitStage.style.removeProperty(`--${layer}-x`);
    portraitStage.style.removeProperty(`--${layer}-y`);
  }
}

portraitStage.addEventListener("pointerleave", resetPortraitLayers);
portraitMotion.addEventListener("change", resetPortraitLayers);

const sectionLinks = [...document.querySelectorAll(".home-section-nav a")];
const sectionTargets = sectionLinks.map((link) => document.querySelector(link.hash));

function updateSectionNavigation() {
  const readingLine = Math.min(innerHeight * .45, 300);
  const active = sectionTargets.findLastIndex((section) => section.getBoundingClientRect().top <= readingLine);
  sectionLinks.forEach((link, index) => {
    if (index === active) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
}

window.addEventListener("scroll", updateSectionNavigation, { passive: true });
window.addEventListener("resize", updateSectionNavigation);
updateSectionNavigation();

const previewDialog = document.querySelector(".showcase-preview");
const previewTitle = previewDialog.querySelector("h2");
const previewImage = previewDialog.querySelector("img");

function animateSlide(section, slide, direction) {
  function enter(element, transform, duration, delay = 0) {
    element?.animate(
      [{ opacity: 0, transform }, { opacity: 1, transform: "none" }],
      { duration, delay, easing: "cubic-bezier(.2,.7,.2,1)", fill: "backwards" },
    );
  }

  switch (section.id) {
    case "applications":
      enter(slide.querySelector(".showcase-icon"), `perspective(700px) rotateY(${direction * 85}deg)`, 450);
      enter(slide.querySelector(".showcase-desktop"), `translate3d(${direction * 24}px, 0, 0) scale(.95)`, 460, 75);
      enter(slide.querySelector(".showcase-phone"), `perspective(700px) translate3d(${direction * 36}px, 14px, -35px) rotateY(${direction * 24}deg)`, 530, 135);
      break;
    case "websites":
      enter(slide.firstElementChild, `perspective(900px) translateX(${direction * 24}px) rotateY(${direction * 27}deg)`, 520);
      break;
    case "creative":
      enter(slide.querySelector("figure"), "translateY(14px) scale(.96)", 580);
      enter(slide.querySelector(".showcase-copy"), "translateY(8px)", 420, 90);
      break;
    default:
      for (const panel of slide.children) {
        enter(panel, `perspective(900px) rotateY(${direction * 65}deg) scale(.96)`, 540);
      }
  }
}

function mountCarousel(section) {
  const viewport = section.querySelector("[data-slides]");
  const slides = [...viewport.children];
  const controls = section.querySelector(".showcase-controls");
  const counter = controls.querySelector("[data-count]");
  const toggle = controls.querySelector("[data-play]");
  const title = section.querySelector("h2").textContent;
  let index = 0;
  let timer;
  let visible = false;
  let playing = !reducedMotion.matches;
  const picker = document.createElement("div");
  picker.className = "showcase-picker";
  picker.setAttribute("role", "group");
  picker.setAttribute("aria-label", `Choose a ${title.toLowerCase()} item`);
  const picks = slides.map((slide, slideIndex) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-pressed", String(slideIndex === 0));
    const thumbnail = slide.querySelector(".showcase-icon") || slide.querySelector(".showcase-desktop img");
    if (thumbnail) {
      const image = document.createElement("img");
      image.src = thumbnail.src;
      image.alt = "";
      image.loading = "lazy";
      button.append(image);
    }
    button.append(slide.querySelector("h3").textContent);
    button.addEventListener("click", () => move(slideIndex - index));
    picker.append(button);
    return button;
  });
  viewport.after(picker);

  function turn(direction) {
    if (!direction) return;
    slides[index].hidden = true;
    picks[index].setAttribute("aria-pressed", "false");
    index = (index + direction + slides.length) % slides.length;
    const slide = slides[index];
    slide.hidden = false;
    picks[index].setAttribute("aria-pressed", "true");
    counter.textContent = `${index + 1} / ${slides.length}`;
    if (!reducedMotion.matches) {
      animateSlide(section, slide, Math.sign(direction));
    }
  }

  function syncPlayback() {
    clearInterval(timer);
    toggle.hidden = reducedMotion.matches;
    toggle.textContent = playing ? "Pause" : "Play";
    toggle.setAttribute("aria-label", `${playing ? "Pause" : "Play"} ${title} rotation`);
    viewport.setAttribute("aria-live", playing ? "off" : "polite");
    if (playing && visible && !document.hidden) {
      timer = setInterval(() => turn(1), 6500);
    }
  }

  function pause() {
    if (playing) {
      playing = false;
      syncPlayback();
    }
  }

  function move(direction) {
    pause();
    turn(direction);
  }

  for (const shortcut of section.querySelectorAll("[data-showcase-jump]")) {
    const destination = slides.findIndex((slide) =>
      [...slide.querySelectorAll("a[href]")].some((link) => link.href === shortcut.href));
    if (destination < 0) continue;
    shortcut.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      move(destination - index);
    });
  }

  for (const figure of section.querySelectorAll("#applications .showcase-screens figure")) {
    const screenshot = figure.querySelector("img");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "showcase-expand";
    button.setAttribute("aria-label", `Enlarge ${screenshot.alt}`);
    button.setAttribute("aria-haspopup", "dialog");
    screenshot.before(button);
    button.append(screenshot);
    button.addEventListener("click", () => {
      pause();
      previewTitle.textContent = screenshot.alt;
      previewImage.src = screenshot.currentSrc || screenshot.src;
      previewImage.alt = screenshot.alt;
      previewDialog.showModal();
    });
  }

  controls.querySelector("[data-previous]").addEventListener("click", () => move(-1));
  controls.querySelector("[data-next]").addEventListener("click", () => move(1));
  toggle.addEventListener("click", () => {
    playing = !playing;
    syncPlayback();
  });
  section.addEventListener("focusin", (event) => {
    if (event.target !== toggle) pause();
  });
  viewport.addEventListener("pointerenter", pause);
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) playing = false;
    syncPlayback();
  });
  document.addEventListener("visibilitychange", syncPlayback);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    syncPlayback();
  }, { threshold: 0.35 }).observe(viewport);
  controls.hidden = false;
  syncPlayback();
}

document.querySelectorAll("[data-home-carousel]").forEach(mountCarousel);

async function refreshPluginPrices() {
  try {
    const response = await fetch("/assets/data/quickwoo-catalog.json");
    if (!response.ok) return;
    const catalog = await response.json();
    const prices = new Map(catalog.products.map((item) => [item.id, item.prices.monthly[0]]));
    const format = new Intl.NumberFormat("en-CA", { style: "currency", currency: catalog.currency });
    document.querySelectorAll("[data-plugin-price]").forEach((element) => {
      const cents = prices.get(element.dataset.pluginPrice);
      if (Number.isFinite(cents)) {
        element.textContent = `${format.format(cents / 100)} ${catalog.currency} / month`;
      }
    });
  } catch {
    // The static catalog prices still render when the live catalog cannot be loaded.
  }
}

refreshPluginPrices();
