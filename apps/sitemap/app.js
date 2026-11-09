// Sitemap viewer. No dependencies. Data comes from sitemap.json, which
// `bun sitemap build` writes; images load from Vercel Blob.

const CARD_W = 220;
const CARD_H = 520;
const GAP_X = 40;
const GAP_Y = 90;
const SHOT_W = 200;
const POINTS_W = 402;
const POINTS_H = 874;

const $ = (id) => document.querySelector(`#${id}`);

const el = (tag, attrs = {}, kids = []) => {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "text") {
      node.textContent = value;
    } else if (key === "style") {
      Object.assign(node.style, value);
    } else {
      node.setAttribute(key, value);
    }
  }
  node.append(...kids);
  return node;
};

const matches = (screen, query) =>
  [
    screen.id,
    screen.title,
    screen.route,
    ...screen.states.map((state) => state.title),
  ]
    .join(" ")
    .toLowerCase()
    .includes(query);

const regionsLayer = (regions, scale) =>
  regions.map((region, index) => {
    const [x, y, w, h] = region.rect;
    const box = el("div", {
      class: "region",
      title: `${region.flags.join(" + ")}: ${region.label || region.id}`,
      style: {
        left: `${x * scale}px`,
        top: `${y * scale}px`,
        width: `${w * scale}px`,
        height: `${h * scale}px`,
      },
    });
    box.append(
      el("span", {
        class: "region-label",
        text: `${index + 1} ${region.flags.join("+")}`,
      })
    );
    return box;
  });

const response = await fetch("sitemap.json");
const DATA = await response.json();
const image = (png) => `${DATA.imageBase}/small/${png}.png`;
document.title = `pixy-mood-tracker sitemap ${DATA.sha.slice(0, 7)}`;
$("commit").textContent =
  `${DATA.sha.slice(0, 7)}  ${DATA.date.slice(0, 10)}  ${DATA.subject}`;
const { screens } = DATA;
const byId = new Map(screens.map((screen) => [screen.id, screen]));
const children = new Map(screens.map((screen) => [screen.id, []]));
for (const screen of screens) {
  if (screen.parent && children.has(screen.parent)) {
    children.get(screen.parent).push(screen.id);
  }
}
const roots = screens.filter(
  (screen) => !screen.parent || !byId.has(screen.parent)
);

const view = { x: 40, y: 40, scale: 0.6 };
const ui = { flags: "off", screen: null, state: 0, query: "" };
const drag = { start: null, isMoved: false };

const canvas = $("canvas");
const lines = $("lines");
const viewport = $("viewport");
const detail = $("detail");
const search = $("search");
const cards = new Map();

// Tidy top-down tree: each leaf takes one column, parents center on kids.
const layout = new Map();
let column = 0;
const place = (id, depth) => {
  const kids = children.get(id);
  let x = column * (CARD_W + GAP_X);
  if (kids.length === 0) {
    column += 1;
  } else {
    const xs = kids.map((kid) => place(kid, depth + 1));
    x = (xs[0] + xs.at(-1)) / 2;
  }
  layout.set(id, { x, y: depth * (CARD_H + GAP_Y) });
  return x;
};
for (const root of roots) {
  place(root.id, 0);
}

/** Image and flagged regions of one state for the current flags mode. */
const variant = (state) =>
  ui.flags === "on"
    ? { png: state.on && state.on.pngHash, regions: state.flagged }
    : { png: state.off && state.off.pngHash, regions: [] };

const emptyReason = (screen, state) => {
  if (screen.isFlagOnly && ui.flags === "off") {
    return `Flag-only: ${screen.requires.join(", ")}. Turn flags on.`;
  }
  if (screen.hiddenBy.length > 0 && ui.flags === "on") {
    return `Replaced when ${screen.hiddenBy.join(", ")} is on. Turn flags off.`;
  }
  return Object.values(state.errors)[0] || "Not captured";
};

const shot = (screen, state, scale, container) => {
  const { png, regions } = variant(state);
  if (png) {
    container.replaceChildren(
      el("img", {
        src: image(png),
        alt: `${screen.title}, ${state.title}`,
      }),
      ...regionsLayer(regions, scale)
    );
  } else {
    container.replaceChildren(
      el("div", { class: "card-empty", text: emptyReason(screen, state) })
    );
  }
};

// Deep link: #screen=<id>&state=<id>&flags=on
const writeHash = () => {
  const params = new URLSearchParams();
  if (ui.screen) {
    params.set("screen", ui.screen);
    params.set("state", byId.get(ui.screen).states[ui.state].id);
  }
  if (ui.flags === "on") {
    params.set("flags", "on");
  }
  const hash = params.toString();
  history.replaceState(
    null,
    "",
    hash ? `#${hash}` : location.pathname + location.search
  );
};

const readHash = () => {
  const params = new URLSearchParams(location.hash.slice(1));
  ui.flags = params.get("flags") === "on" ? "on" : "off";
  const screen = byId.get(params.get("screen") || "");
  ui.screen = screen ? screen.id : null;
  ui.state = screen
    ? Math.max(
        0,
        screen.states.findIndex((state) => state.id === params.get("state"))
      )
    : 0;
};

const renderDetail = () => {
  const screen = byId.get(ui.screen);
  detail.hidden = !screen;
  if (!screen) {
    return;
  }
  const state = screen.states[ui.state];
  $("detail-title").textContent = screen.title;
  $("detail-route").textContent = `${state.route}  ·  ${screen.id}/${state.id}`;
  $("detail-state").textContent =
    `${state.title}  ·  ${ui.state + 1} / ${screen.states.length}${screen.isFlagOnly ? `  ·  flag-only: ${screen.requires.join(", ")}` : ""}`;
  const figure = $("detail-shot");
  shot(
    screen,
    state,
    (figure.getBoundingClientRect().height || POINTS_H) / POINTS_H,
    figure
  );
  $("prev").disabled = ui.state === 0;
  $("next").disabled = ui.state === screen.states.length - 1;
  const { regions } = variant(state);
  let items = [el("li", { text: "Turn flags on to see flagged UI." })];
  if (ui.flags === "on") {
    items = regions.length
      ? regions.map((region) =>
          el("li", {
            text: `${region.flags.join(" + ")}: ${region.label || region.id || "element"}`,
          })
        )
      : [el("li", { text: "None on this state." })];
  }
  $("detail-flagged").replaceChildren(...items);
  const errors = Object.entries(state.errors);
  $("detail-errors").textContent = errors.length
    ? `Capture errors\n${errors.map(([pass, text]) => `${pass}: ${text}`).join("\n")}`
    : "";
  $("strip").replaceChildren(
    ...screen.states.map((candidate, index) => {
      const { png } = variant(candidate);
      const thumb = el("button", {
        type: "button",
        class: "thumb",
        "data-index": String(index),
        "aria-current": String(index === ui.state),
        title: candidate.title,
      });
      if (png) {
        thumb.append(el("img", { src: image(png), alt: "", loading: "lazy" }));
      }
      thumb.append(el("span", { class: "thumb-label", text: candidate.title }));
      return thumb;
    })
  );
};

const openDetail = (id, index) => {
  ui.screen = id;
  ui.state = index;
  writeHash();
  renderDetail();
};

const closeDetail = () => {
  ui.screen = null;
  writeHash();
  renderDetail();
};

const step = (delta) => {
  const screen = byId.get(ui.screen);
  if (screen) {
    const next = Math.min(
      screen.states.length - 1,
      Math.max(0, ui.state + delta)
    );
    if (next !== ui.state) {
      openDetail(screen.id, next);
    }
  }
};

const renderCards = () => {
  for (const screen of screens) {
    let card = cards.get(screen.id);
    if (!card) {
      const pos = layout.get(screen.id);
      const count = screen.states.length;
      card = el(
        "button",
        {
          type: "button",
          class: `card${screen.isFlagOnly ? " flag-only" : ""}`,
          "data-screen": screen.id,
          style: { left: `${pos.x}px`, top: `${pos.y}px` },
        },
        [
          el("div", { class: "card-head" }, [
            el("div", { class: "card-title", text: screen.title }),
            el("div", { class: "card-route", text: screen.route }),
          ]),
          el("div", { class: "card-shot" }),
          el("div", { class: "card-meta" }, [
            el("span", { text: `${count} state${count === 1 ? "" : "s"}` }),
            el("span", { text: screen.isFlagOnly ? "flag-only" : "" }),
          ]),
        ]
      );
      canvas.append(card);
      cards.set(screen.id, card);
    }
    shot(
      screen,
      screen.states[0],
      SHOT_W / POINTS_W,
      card.querySelector(".card-shot")
    );
  }
};

// Orthogonal hairline connectors: down, across, down.
const renderLines = () => {
  let maxX = 0;
  let maxY = 0;
  const paths = [];
  for (const screen of screens) {
    const pos = layout.get(screen.id);
    maxX = Math.max(maxX, pos.x + CARD_W);
    maxY = Math.max(maxY, pos.y + CARD_H);
    const parent = screen.parent && layout.get(screen.parent);
    if (parent) {
      const x1 = Math.round(parent.x + CARD_W / 2) + 0.5;
      const y1 = parent.y + CARD_H;
      const x2 = Math.round(pos.x + CARD_W / 2) + 0.5;
      const mid = Math.round(y1 + GAP_Y / 2) + 0.5;
      paths.push(`M${x1} ${y1}V${mid}H${x2}V${pos.y}`);
    }
  }
  lines.setAttribute("width", String(maxX));
  lines.setAttribute("height", String(maxY));
  lines.innerHTML = paths.map((d) => `<path d="${d}"/>`).join("");
  canvas.dataset.width = String(maxX);
  canvas.dataset.height = String(maxY);
  canvas.style.width = `${maxX}px`;
  canvas.style.height = `${maxY}px`;
};

const applyView = () => {
  canvas.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
};

const fit = () => {
  const rect = viewport.getBoundingClientRect();
  const width = Number(canvas.dataset.width) || 1;
  const height = Number(canvas.dataset.height) || 1;
  view.scale = Math.min(
    1,
    (rect.width - 80) / width,
    (rect.height - 80) / height
  );
  view.x = (rect.width - width * view.scale) / 2;
  view.y = 40;
  applyView();
};

const centerOn = (id) => {
  const pos = layout.get(id);
  const rect = viewport.getBoundingClientRect();
  view.scale = Math.max(view.scale, 0.6);
  view.x = rect.width / 2 - (pos.x + CARD_W / 2) * view.scale;
  view.y = rect.height / 2 - (pos.y + CARD_H / 2) * view.scale;
  applyView();
};

const setFlags = (mode) => {
  ui.flags = mode;
  $("flags-off").setAttribute("aria-pressed", String(mode === "off"));
  $("flags-on").setAttribute("aria-pressed", String(mode === "on"));
  renderCards();
  renderDetail();
  writeHash();
};

const runSearch = () => {
  ui.query = search.value.trim().toLowerCase();
  for (const screen of screens) {
    const card = cards.get(screen.id);
    const isMatch = ui.query === "" || matches(screen, ui.query);
    card.classList.toggle("dim", !isMatch);
    card.classList.toggle("match", ui.query !== "" && isMatch);
  }
};

// Events.
canvas.addEventListener("click", (event) => {
  const card = event.target.closest(".card");
  if (card && !drag.isMoved) {
    openDetail(card.dataset.screen, 0);
  }
});
$("strip").addEventListener("click", (event) => {
  const thumb = event.target.closest(".thumb");
  if (thumb) {
    openDetail(ui.screen, Number(thumb.dataset.index));
  }
});
viewport.addEventListener("pointerdown", (event) => {
  if (event.button === 0) {
    drag.start = {
      x: event.clientX,
      y: event.clientY,
      viewX: view.x,
      viewY: view.y,
    };
    drag.isMoved = false;
  }
});
window.addEventListener("pointermove", (event) => {
  if (!drag.start) {
    return;
  }
  const dx = event.clientX - drag.start.x;
  const dy = event.clientY - drag.start.y;
  if (!drag.isMoved && Math.hypot(dx, dy) > 4) {
    drag.isMoved = true;
    viewport.classList.add("dragging");
  }
  if (drag.isMoved) {
    view.x = drag.start.viewX + dx;
    view.y = drag.start.viewY + dy;
    applyView();
  }
});
window.addEventListener("pointerup", () => {
  drag.start = null;
  viewport.classList.remove("dragging");
  // The click after a drag must not open a card.
  setTimeout(() => {
    drag.isMoved = false;
  }, 0);
});
viewport.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      const rect = viewport.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      const next = Math.min(
        2,
        Math.max(0.1, view.scale * Math.exp(-event.deltaY * 0.01))
      );
      view.x = px - ((px - view.x) * next) / view.scale;
      view.y = py - ((py - view.y) * next) / view.scale;
      view.scale = next;
    } else {
      view.x -= event.deltaX;
      view.y -= event.deltaY;
    }
    applyView();
  },
  { passive: false }
);
$("prev").addEventListener("click", () => step(-1));
$("next").addEventListener("click", () => step(1));
$("detail-close").addEventListener("click", closeDetail);
$("flags-off").addEventListener("click", () => setFlags("off"));
$("flags-on").addEventListener("click", () => setFlags("on"));
search.addEventListener("input", runSearch);
search.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    const first = screens.find((screen) => matches(screen, ui.query));
    if (first) {
      centerOn(first.id);
    }
  }
});
$("fit").addEventListener("click", fit);
$("fullscreen").addEventListener("click", () => {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen();
  }
});
document.addEventListener("keydown", (event) => {
  if (
    event.target instanceof HTMLInputElement ||
    event.target instanceof HTMLSelectElement
  ) {
    return;
  }
  const actions = {
    ArrowLeft: () => step(-1),
    ArrowRight: () => step(1),
    Escape: closeDetail,
    0: fit,
    f: () => $("fullscreen").click(),
    "/": () => search.focus(),
  };
  const action = actions[event.key];
  if (action) {
    event.preventDefault();
    action();
  }
});
window.addEventListener("resize", renderDetail);

const { summary, profile } = DATA;
$("foot").replaceChildren(
  el("span", { text: `${DATA.sha.slice(0, 12)}  ${DATA.subject}` }),
  el("span", {
    text: `${profile.model}, iOS ${profile.runtime.version} (${profile.runtime.build}), ${profile.locale}, ${profile.timeZone}, ${profile.clockStart}`,
  }),
  el("span", {
    text: `captured ${summary.captured}, cached ${summary.cached}, failed ${summary.failed}`,
  }),
  el("span", { text: DATA.isDeployable ? "" : "not from origin/main" })
);

readHash();
$("flags-off").setAttribute("aria-pressed", String(ui.flags === "off"));
$("flags-on").setAttribute("aria-pressed", String(ui.flags === "on"));
renderCards();
renderLines();
fit();
renderDetail();
