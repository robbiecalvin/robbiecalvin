const toolbar = document.querySelector(".home-toolbar");
const menu = toolbar.querySelector(".home-menu");
const navigation = menu.querySelector("nav");
const compact = matchMedia("(max-width: 1100px)");

if (typeof HTMLDialogElement !== "undefined") {
  const trigger = document.createElement("button");
  trigger.className = "mobile-menu-trigger";
  trigger.type = "button";
  trigger.setAttribute("aria-haspopup", "dialog");
  trigger.setAttribute("aria-controls", "mobile-navigation");
  trigger.setAttribute("aria-expanded", "false");
  trigger.textContent = "Menu";
  menu.before(trigger);

  const drawer = document.createElement("dialog");
  drawer.className = "mobile-drawer";
  drawer.id = "mobile-navigation";
  drawer.setAttribute("aria-labelledby", "mobile-navigation-title");
  drawer.innerHTML = `
    <div class="mobile-drawer-heading">
      <h2 id="mobile-navigation-title">Menu</h2>
      <form method="dialog"><button type="submit" autofocus>Close</button></form>
    </div>`;
  toolbar.append(drawer);

  function syncMenu() {
    if (!compact.matches && drawer.open) drawer.close();
    if (compact.matches) drawer.append(navigation);
    else menu.append(navigation);
    menu.hidden = compact.matches;
    menu.open = !compact.matches;
    trigger.hidden = !compact.matches;
  }

  trigger.addEventListener("click", () => {
    drawer.showModal();
    trigger.setAttribute("aria-expanded", "true");
  });
  drawer.addEventListener("close", () => {
    trigger.setAttribute("aria-expanded", "false");
    if (compact.matches) trigger.focus();
  });
  drawer.addEventListener("click", (event) => {
    if (event.target !== drawer) return;
    const bounds = drawer.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) drawer.close();
  });
  compact.addEventListener("change", syncMenu);
  syncMenu();
} else {
  const syncMenu = () => { menu.open = !compact.matches; };
  compact.addEventListener("change", syncMenu);
  syncMenu();
}

const path = location.pathname.replace(/index\.html$/, "").replace(/\/$/, "") || "/";
for (const link of toolbar.querySelectorAll("a[href]")) {
  const destination = new URL(link.href).pathname.replace(/\/$/, "") || "/";
  if (destination === path) link.setAttribute("aria-current", "page");
}
