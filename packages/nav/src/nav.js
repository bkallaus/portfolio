// Shared navigation web component for ben.kallaus.me.
// Self-registers as <site-nav> and self-appends to document.body.
// __SITES__ and __NAV_CSS__ are replaced at build time (see build.mjs)
// with the site manifest (JSON) and the nav.css text respectively.

const SITES = __SITES__;
const NAV_CSS = __NAV_CSS__;

const STORAGE_KEY = "kallaus.nav.experiments-open";
const TAG_NAME = "site-nav";

function readStoredBool(key) {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch (err) {
    return false;
  }
}

function writeStoredBool(key, value) {
  try {
    window.localStorage.setItem(key, value ? "1" : "0");
  } catch (err) {
    // ignore - some embedded contexts throw on storage access
  }
}

function currentSlug() {
  const segments = window.location.pathname.split("/").filter(Boolean);
  return segments.length === 0 ? "portfolio" : segments[0];
}

function hrefForSlug(slug) {
  return slug === "portfolio" ? "/" : "/" + slug + "/";
}

class SiteNav extends HTMLElement {
  constructor() {
    super();
    this._open = false;
    this._root = this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this._render();
  }

  _render() {
    const active = currentSlug();
    const visible = SITES.filter(function (site) {
      return (site.tier || "experiment") !== "hidden";
    });
    const featured = visible.filter(function (site) {
      return (site.tier || "experiment") === "featured";
    });
    const experiments = visible.filter(function (site) {
      return (site.tier || "experiment") === "experiment";
    });

    const root = this._root;
    root.innerHTML = "";

    const style = document.createElement("style");
    style.textContent = NAV_CSS;
    root.appendChild(style);

    const btn = document.createElement("button");
    btn.className = "nav-btn";
    btn.type = "button";
    btn.setAttribute("aria-label", "Open site navigation");
    btn.setAttribute("aria-haspopup", "dialog");
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-controls", "kallaus-nav-drawer");
    btn.textContent = "☰";

    const backdrop = document.createElement("div");
    backdrop.className = "backdrop";

    const drawer = document.createElement("div");
    drawer.className = "drawer";
    drawer.id = "kallaus-nav-drawer";
    drawer.setAttribute("role", "dialog");
    drawer.setAttribute("aria-modal", "true");
    drawer.setAttribute("aria-labelledby", "kallaus-nav-heading");
    drawer.tabIndex = -1;

    const header = document.createElement("div");
    header.className = "drawer-header";
    const heading = document.createElement("h2");
    heading.id = "kallaus-nav-heading";
    heading.textContent = "ben.kallaus.me";
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "close-btn";
    closeBtn.setAttribute("aria-label", "Close navigation");
    closeBtn.textContent = "✕";
    header.appendChild(heading);
    header.appendChild(closeBtn);

    const body = document.createElement("div");
    body.className = "drawer-body";

    const featuredList = document.createElement("ul");
    featuredList.className = "site-list featured-list";
    featured.forEach(function (site) {
      featuredList.appendChild(buildSiteItem(site, active, true));
    });
    body.appendChild(featuredList);

    if (experiments.length > 0) {
      const divider = document.createElement("hr");
      divider.className = "divider";
      body.appendChild(divider);

      const expOpen = readStoredBool(STORAGE_KEY);

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "exp-toggle";
      toggle.id = "kallaus-nav-exp-toggle";
      toggle.setAttribute("aria-expanded", expOpen ? "true" : "false");
      toggle.setAttribute("aria-controls", "kallaus-nav-exp-list");

      const label = document.createElement("span");
      label.textContent = "Experiments (" + experiments.length + ")";
      const caret = document.createElement("span");
      caret.className = "exp-caret";
      caret.setAttribute("aria-hidden", "true");
      caret.textContent = "❯";
      toggle.appendChild(label);
      toggle.appendChild(caret);
      body.appendChild(toggle);

      const expList = document.createElement("ul");
      expList.className = "site-list exp-list";
      expList.id = "kallaus-nav-exp-list";
      if (!expOpen) {
        expList.hidden = true;
      }
      experiments.forEach(function (site) {
        expList.appendChild(buildSiteItem(site, active, false));
      });
      body.appendChild(expList);

      toggle.addEventListener("click", function () {
        const nowOpen = expList.hidden;
        expList.hidden = !nowOpen;
        toggle.setAttribute("aria-expanded", nowOpen ? "true" : "false");
        writeStoredBool(STORAGE_KEY, nowOpen);
      });
    }

    drawer.appendChild(header);
    drawer.appendChild(body);

    root.appendChild(btn);
    root.appendChild(backdrop);
    root.appendChild(drawer);

    const self = this;

    function openDrawer() {
      self._open = true;
      backdrop.classList.add("open");
      drawer.classList.add("open");
      btn.setAttribute("aria-expanded", "true");
      closeBtn.focus();
    }

    function closeDrawer() {
      self._open = false;
      backdrop.classList.remove("open");
      drawer.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
      btn.focus();
    }

    btn.addEventListener("click", function () {
      if (self._open) {
        closeDrawer();
      } else {
        openDrawer();
      }
    });
    closeBtn.addEventListener("click", closeDrawer);
    backdrop.addEventListener("click", closeDrawer);
    root.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && self._open) {
        closeDrawer();
      }
    });
  }
}

function buildSiteItem(site, activeSlug, isFeatured) {
  const li = document.createElement("li");
  li.className = "site-item " + (isFeatured ? "featured" : "experiment");
  const isCurrent = site.slug === activeSlug;

  const inner = document.createElement(isCurrent ? "div" : "a");
  inner.className = isCurrent ? "current-item" : "site-link";
  if (!isCurrent) {
    inner.setAttribute("href", hrefForSlug(site.slug));
  }

  const title = document.createElement("p");
  title.className = "site-title";
  title.textContent = site.title || site.slug;
  inner.appendChild(title);

  if (isFeatured && site.blurb) {
    const blurb = document.createElement("p");
    blurb.className = "site-blurb";
    blurb.textContent = site.blurb;
    inner.appendChild(blurb);
  }

  if (isCurrent) {
    const badge = document.createElement("span");
    badge.className = "here-badge";
    const dot = document.createElement("span");
    dot.className = "here-dot";
    dot.setAttribute("aria-hidden", "true");
    badge.appendChild(dot);
    badge.appendChild(document.createTextNode("you are here"));
    inner.appendChild(badge);
  }

  li.appendChild(inner);
  return li;
}

function init() {
  if (window.self !== window.top) return;

  if (!customElements.get(TAG_NAME)) {
    customElements.define(TAG_NAME, SiteNav);
  }

  if (!document.querySelector(TAG_NAME)) {
    document.body.appendChild(document.createElement(TAG_NAME));
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
