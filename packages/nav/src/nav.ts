// Shared navigation web component for ben.kallaus.me.
// Self-registers as <site-nav> and self-appends to document.body.
//
// __SITES__ and __NAV_CSS__ are replaced at build time (see build.mjs) with the
// site manifest and the nav.css text, so the published bundle fetches neither.
//
// The drawer is a real <dialog> opened with showModal(). That is what buys the
// focus trap, the Escape handler, the inert background, and top-layer stacking
// that this component would otherwise have to hand-roll — and hand-roll wrongly,
// since a hand-rolled one had no focus trap at all.

type Tier = 'featured' | 'experiment' | 'hidden';

interface Site {
  slug: string;
  title?: string;
  blurb?: string;
  tier?: Tier;
}

declare const __SITES__: Site[];
declare const __NAV_CSS__: string;

const TAG_NAME = 'site-nav';
const STORAGE_KEY = 'kallaus.nav.experiments-open';

const sheet = new CSSStyleSheet();
sheet.replaceSync(__NAV_CSS__);

const tierOf = (site: Site): Tier => site.tier ?? 'experiment';

const hrefFor = (slug: string): string => (slug === 'portfolio' ? '/' : `/${slug}/`);

const currentSlug = (): string =>
  window.location.pathname.split('/').filter(Boolean)[0] ?? 'portfolio';

// Some embedded contexts throw on any storage access, so a failed read is just
// "collapsed" and a failed write is not worth surfacing.
const remembered = {
  read(key: string): boolean {
    try {
      return window.localStorage.getItem(key) === '1';
    } catch {
      return false;
    }
  },
  write(key: string, value: boolean): void {
    try {
      window.localStorage.setItem(key, value ? '1' : '0');
    } catch {
      /* ignore */
    }
  },
};

// SITES is inlined from a file in this repo, so it is author-controlled rather
// than user input. Escaping anyway costs one function and removes the need for
// anyone to re-derive that argument later.
const esc = (value: string): string =>
  value.replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string,
  );

function itemHtml(site: Site, activeSlug: string, isFeatured: boolean): string {
  const isCurrent = site.slug === activeSlug;
  const contents = [
    `<p class="site-title">${esc(site.title ?? site.slug)}</p>`,
    isFeatured && site.blurb ? `<p class="site-blurb">${esc(site.blurb)}</p>` : '',
    isCurrent
      ? '<span class="here-badge"><span class="here-dot" aria-hidden="true"></span>you are here</span>'
      : '',
  ].join('');

  const inner = isCurrent
    ? `<div class="current-item">${contents}</div>`
    : `<a class="site-link" href="${esc(hrefFor(site.slug))}">${contents}</a>`;

  return `<li class="site-item ${isFeatured ? 'featured' : 'experiment'}">${inner}</li>`;
}

function shellHtml(activeSlug: string, experimentsOpen: boolean): string {
  const visible = __SITES__.filter((site) => tierOf(site) !== 'hidden');
  const featured = visible.filter((site) => tierOf(site) === 'featured');
  const experiments = visible.filter((site) => tierOf(site) === 'experiment');

  const experimentsHtml = experiments.length
    ? `<hr class="divider">
       <button type="button" class="exp-toggle" aria-expanded="${experimentsOpen}" aria-controls="exp-list">
         <span>Experiments (${experiments.length})</span>
         <span class="exp-caret" aria-hidden="true">&#10095;</span>
       </button>
       <ul class="site-list exp-list" id="exp-list"${experimentsOpen ? '' : ' hidden'}>
         ${experiments.map((site) => itemHtml(site, activeSlug, false)).join('')}
       </ul>`
    : '';

  // <dialog> supplies role="dialog" and aria-modal itself once showModal() runs.
  return `
    <button class="nav-btn" type="button" aria-label="Open site navigation"
            aria-haspopup="dialog" aria-expanded="false" aria-controls="drawer">&#9776;</button>
    <dialog class="drawer" id="drawer" aria-labelledby="drawer-heading">
      <div class="drawer-header">
        <h2 id="drawer-heading">ben.kallaus.me</h2>
        <button type="button" class="close-btn" aria-label="Close navigation">&#10005;</button>
      </div>
      <div class="drawer-body">
        <ul class="site-list featured-list">
          ${featured.map((site) => itemHtml(site, activeSlug, true)).join('')}
        </ul>
        ${experimentsHtml}
      </div>
    </dialog>`;
}

class SiteNav extends HTMLElement {
  connectedCallback(): void {
    if (this.shadowRoot) return;

    const root = this.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = [sheet];
    root.innerHTML = shellHtml(currentSlug(), remembered.read(STORAGE_KEY));

    const drawer = root.querySelector('dialog') as HTMLDialogElement;
    const openBtn = root.querySelector('.nav-btn') as HTMLButtonElement;

    openBtn.addEventListener('click', () => {
      drawer.showModal();
      openBtn.setAttribute('aria-expanded', 'true');
    });

    root.querySelector('.close-btn')?.addEventListener('click', () => drawer.close());

    // A click on ::backdrop is dispatched at the dialog itself; the drawer's own
    // children cover it edge to edge, so nothing else can target it.
    drawer.addEventListener('click', (event) => {
      if (event.target === drawer) drawer.close();
    });

    // Fires for the close button, the backdrop, and Escape alike, so focus
    // returns to the trigger through one path instead of three.
    drawer.addEventListener('close', () => {
      openBtn.setAttribute('aria-expanded', 'false');
      openBtn.focus();
    });

    const toggle = root.querySelector('.exp-toggle') as HTMLButtonElement | null;
    const expList = root.querySelector('.exp-list') as HTMLElement | null;
    toggle?.addEventListener('click', () => {
      const open = expList!.hidden;
      expList!.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      remembered.write(STORAGE_KEY, open);
    });
  }
}

function init(): void {
  // simple-city is iframed into the portfolio's hero. A nav button inside that
  // frame would be a second one on the same screen.
  if (window.self !== window.top) return;

  if (!customElements.get(TAG_NAME)) customElements.define(TAG_NAME, SiteNav);
  if (!document.querySelector(TAG_NAME)) {
    document.body.appendChild(document.createElement(TAG_NAME));
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
