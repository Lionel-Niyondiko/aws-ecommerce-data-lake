/* ===========================================================================
   app.js · the renderer. Contains no content.
   ===========================================================================
   Every string a reader sees comes from steps.js. This file decides only how
   the content is composed, how the walkthrough moves, and how the URL tracks
   it.

   Four concerns, kept apart:
     i18n     active language, persisted, browser-detected on first visit
     theme    light / dark, persisted, system-aware
     render   pure functions from content to HTML
     motion   reveal-on-scroll, active section, step transitions. All of it
              is IntersectionObserver or CSS; no scroll listener, and nothing
              moves when the reader asks for reduced motion.

   Switching language re-runs render() in place: no reload, no second
   document, and the reader keeps their step in the walkthrough.

   No framework, no build step, no dependency. A GitHub Pages site that needs
   npm install before it can be read stops working the day the toolchain
   moves on.
   =========================================================================== */

import {
  languages, ui, sections, meta, views, numbers, challenge, howItRuns,
  integrity, architecture, medallion, stages, quickstart, steps,
  dimensionalModel, questions, decisions, reproducibility, summary
} from "./steps.js";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const set = (sel, html) => { const n = $(sel); if (n) n.innerHTML = html; };

const reduceMotion = () =>
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ===========================================================================
   i18n
   =========================================================================== */

const LANG_KEY = "ecommerce-datalake-language";
const SUPPORTED = languages.map((l) => l.code);

function detectLanguage() {
  const list = [].concat(navigator.languages || [], navigator.language || []);
  for (const tag of list) {
    const code = String(tag).toLowerCase().split("-")[0];
    if (SUPPORTED.includes(code)) return code;
  }
  return "en";
}

function initialLanguage() {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored && SUPPORTED.includes(stored)) return stored;   // explicit wins
  } catch { /* private mode */ }
  return detectLanguage();
}

let lang = initialLanguage();

/** A plain string is language-neutral by design (commands, SQL, service and
 *  file names). An object carries one value per language. */
function t(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  return v[lang] ?? v.en ?? "";
}

/* ===========================================================================
   theme
   =========================================================================== */

const THEME_KEY = "ecommerce-datalake-theme";

const theme = {
  current: () => (document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"),
  apply(next) {
    document.documentElement.setAttribute("data-theme", next);
    document.documentElement.style.colorScheme = next;
    try { localStorage.setItem(THEME_KEY, next); } catch { /* private mode */ }
    theme.sync();
  },
  toggle() { theme.apply(theme.current() === "dark" ? "light" : "dark"); },
  sync() {
    const btn = $("#theme-toggle");
    if (!btn) return;
    const dark = theme.current() === "dark";
    btn.setAttribute("aria-pressed", String(dark));
    const label = t(dark ? ui.themeToLight : ui.themeToDark);
    btn.setAttribute("aria-label", label);
    btn.setAttribute("title", label);
    set("#theme-toggle-text", esc(t(dark ? ui.light : ui.dark)));
  },
  watchSystem() {
    if (!window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e) => {
      let stored = null;
      try { stored = localStorage.getItem(THEME_KEY); } catch { /* ignore */ }
      if (stored) return;
      document.documentElement.setAttribute("data-theme", e.matches ? "dark" : "light");
      theme.sync();
    };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }
};

/* ===========================================================================
   escaping and small building blocks
   =========================================================================== */

/* Prose in steps.js is authored with inline HTML (<code>, <strong>, <em>) on
   purpose and is NOT escaped; code excerpts are, or a Terraform block
   containing "<" would silently vanish. */
const esc = (s) => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const attr = (s) => esc(s).replace(/"/g, "&quot;");
const pad2 = (n) => String(n).padStart(2, "0");

const ARROW_OUT = `<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 11 11 5M6 5h5v5"/></svg>`;
const ARROW_DOWN = `<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M4 9l4 4 4-4"/></svg>`;
const ARROW_R = `<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg>`;
const ARROW_L = `<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M13 8H3M7 4 3 8l4 4"/></svg>`;
const TICK = `<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="m3.5 8.5 3 3 6-7"/></svg>`;
const CROSS = `<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="m4.5 4.5 7 7M11.5 4.5l-7 7"/></svg>`;

/* An outbound link and an in-page jump get different arrows and different
   rel/target, decided in one place. */
function link(item, cls = "") {
  const internal = item.internal || String(item.href).startsWith("#");
  return `<a class="${cls}" href="${attr(item.href)}"
    ${internal ? "" : 'target="_blank" rel="noopener noreferrer"'}>
    <span>${esc(t(item.label))}</span>${internal ? ARROW_DOWN : ARROW_OUT}</a>`;
}

/* A terminal: the one surface that means "you type this". Copyable, dark in
   both themes, so a command never looks like a source excerpt. */
function terminal(cmd, { note, title } = {}) {
  const lines = String(cmd).split("\n").map((l) =>
    l.trim() === "" ? `<span class="ln is-blank"> </span>`
                    : `<span class="ln"><span class="ps" aria-hidden="true">$</span>${esc(l)}</span>`).join("");
  return `
    <div class="term">
      <div class="term-bar">
        <span class="term-dots" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="term-title">${title ? esc(title) : esc(t(ui.run))}</span>
        <button class="copy" type="button" data-copy="${attr(cmd)}"
                aria-label="${attr(t(ui.copyLabel))}">${esc(t(ui.copy))}</button>
      </div>
      <pre class="term-body"><code>${lines}</code></pre>
    </div>
    ${note ? `<p class="term-note">${t(note)}</p>` : ""}`;
}

/* A source excerpt: file tab, line numbers, and the two annotations the
   content model carries (why it matters, expected result). */
function sourceBlock({ file, does, text, matters, expect, lang: codeLang }) {
  const lines = String(text).split("\n");
  const body = lines.map((l) => `<span class="ln">${esc(l) || " "}</span>`).join("");
  return `
    <figure class="src${lines.length > 1 ? " has-lines" : ""}" data-lang="${attr(codeLang || "")}">
      <figcaption class="src-head">
        <span class="src-file">${esc(file)}</span>
        ${does ? `<span class="src-does">${t(does)}</span>` : ""}
      </figcaption>
      <pre class="src-body"><code>${body}</code></pre>
      ${matters ? `<p class="src-note"><span class="lbl">${esc(t(ui.whyItMatters))}</span>${t(matters)}</p>` : ""}
      ${expect ? `<p class="src-note is-expect"><span class="lbl">${esc(t(ui.expectedResult))}</span>${t(expect)}</p>` : ""}
    </figure>`;
}

/* A chain: a command, then what it actually triggers. Three accepted node
   shapes, because a node is sometimes a command (language-neutral), sometimes
   a localised label, sometimes a label with a note underneath. */
function chainNode(s) {
  if (typeof s === "string") return { html: `<code>${esc(s)}</code>`, cmd: true };
  if (s.label === undefined) return { html: esc(t(s)), cmd: false };
  return { html: t(s.label) + (s.note ? `<small>${t(s.note)}</small>` : ""), cmd: false };
}

function chainList(items, cls = "") {
  return `<ol class="chain ${cls}">${items.map((s) => {
    const n = chainNode(s);
    return `<li class="${n.cmd ? "is-cmd" : "is-label"}"><span class="node">${n.html}</span></li>`;
  }).join("")}</ol>`;
}

function evidence(block) {
  return `
    <div class="evidence">
      <p class="evidence-cap">${esc(t(block.caption))}</p>
      <dl>
        ${block.rows.map(([k, v]) => `
          <div class="ev-row"><dt>${t(k)}</dt><dd>${t(v)}</dd></div>`).join("")}
      </dl>
    </div>`;
}

const tag = (text, cls = "") => `<span class="tag ${cls}">${esc(text)}</span>`;

/* ===========================================================================
   Chrome
   =========================================================================== */

function renderChrome() {
  document.documentElement.setAttribute("lang", lang);
  document.title = t(ui.pageTitle);

  set("#skip-link", esc(t(ui.skip)));
  set("#wordmark-text", `${esc(ui.wordmark)} <span>${esc(ui.wordmarkTail)}</span>`);
  $("#site-nav").setAttribute("aria-label", t(ui.sectionsNav));
  set("#site-nav", ui.nav
    .map((s) => `<a href="#${s.id}" data-nav="${attr(s.id)}">${esc(t(s.label))}</a>`).join(""));
  set("#menu-btn-text", esc(t(ui.sectionsNav)));
  set("#head-cta", `<span>${esc(t(ui.viewSource))}</span>${ARROW_OUT}`);

  $("#lang-switch").setAttribute("aria-label", t(ui.language));
  set("#lang-switch", languages.map((l) => `
    <button type="button" data-lang="${l.code}" lang="${l.code}"
            aria-pressed="${l.code === lang}"
            aria-label="${attr(l.name)}">${esc(l.label)}</button>`).join(""));

  theme.sync();

  set("#steps-label", esc(t(ui.steps)));
  $("#walk-nav").setAttribute("aria-label", t(ui.stepsNav));
  $("#stage-rail").setAttribute("aria-label", t(ui.stagesNav));
  set("#walk-hint", t(ui.keyboardHint));

  set("#foot-project-label", esc(t(ui.footProject)));
  set("#foot-stack-label", esc(t(ui.footStack)));
  set("#foot-method-label", esc(t(ui.footMethod)));
  set("#foot-claim", `${esc(t(ui.footClaimLead))} <em>${esc(t(ui.footClaimAccent))}</em>`);
  set("#colophon", ui.colophon.map((c) => `<span>${esc(t(c))}</span>`).join(""));
}

/* ===========================================================================
   Cover: one moment, then the brief
   =========================================================================== */

function renderCover() {
  set("#cover-eyebrow",
    `<span>${esc(t(meta.eyebrow))}</span><span class="sep" aria-hidden="true">/</span><span>${esc(t(meta.discipline))}</span>`);

  set("#cover-title",
    meta.titleLines.map((l) => `<span class="t-line">${esc(l)}</span>`).join(" ") +
    ` <span class="t-line t-tail">${esc(t(meta.titleTail))}</span>`);

  set("#cover-tagline", esc(t(meta.tagline)));

  /* The walkthrough is the primary action; the source is the secondary one. */
  const ordered = [...meta.links].sort((a, b) => Number(!!b.internal) - Number(!!a.internal));
  set("#cover-actions", ordered
    .map((l) => link(l, l.internal ? "btn btn-primary" : "btn btn-ghost")).join(""));

  set("#spec-title", esc(t(ui.specification)));
  set("#spec-list", meta.spec.map(([k, v]) => `
    <div class="spec-cell"><dt>${esc(t(k))}</dt><dd>${esc(t(v))}</dd></div>`).join(""));
  set("#cover-stack-label", esc(t(ui.footStack)));
  set("#cover-stack", meta.stack.map((s) => `<li>${esc(s)}</li>`).join(""));

  /* The results ledger reuses the measured figures of the "numbers" band:
     the same values, the same labels, nothing recomputed here. */
  const pick = [0, 1, 2, 4, 5].map((i) => numbers.items[i]).filter(Boolean);
  set("#cover-ledger", pick.map((m, i) => `
    <li class="led${m.accent ? " is-accent" : ""}" style="--i:${i}">
      <span class="led-v">${esc(t(m.value))}</span>
      <span class="led-k">${esc(t(m.label))}</span>
    </li>`).join(""));

  set("#cover-lede", esc(t(meta.lede)));
  set("#cover-zones", `
    <p class="zones-line"><code>${esc(meta.zonesLine)}</code></p>
    <p>${esc(t(meta.zonesNote))}</p>`);
  set("#cover-explain", `
    <p>${esc(t(meta.explainIntro))}</p>
    <ol class="numbered">${meta.explainPoints.map((x) => `<li>${esc(t(x))}</li>`).join("")}</ol>
    <p class="brief-closing">${esc(t(meta.explainClosing))}</p>`);

  const cta = $("#head-cta");
  cta.href = meta.repo;
  cta.target = "_blank";
  cta.rel = "noopener noreferrer";
}

/* ===========================================================================
   Context bands
   =========================================================================== */

function renderChallenge() {
  set("#challenge-title", esc(t(challenge.title)));
  set("#challenge-question", esc(t(challenge.question)));
  set("#challenge-body", `
    <div class="cb-prose">${challenge.body.map((p) => `<p>${t(p)}</p>`).join("")}</div>
    <ul class="findings">${challenge.points.map((x) => `<li>${t(x)}</li>`).join("")}</ul>
    <p class="cb-closing">${t(challenge.closing)}</p>`);

  const fig = $("#flow-figure");
  if (fig) fig.setAttribute("alt", t(challenge.figure.alt));
  set("#flow-caption", esc(t(challenge.figure.caption)));
}

function renderViews() {
  set("#views-title", esc(t(views.title)));
  set("#views-note", esc(t(views.note)));

  const track = (v, cls) => `
    <div class="track ${cls} rv">
      <div class="track-head">
        <p class="track-label">${esc(t(v.label))}</p>
        <h3 class="track-q">${esc(t(v.question))}</h3>
      </div>
      <ol class="track-nodes" style="--n:${v.stages.length}">${v.stages.map((s, i) => `
        <li style="--i:${i}"><b>${esc(t(s.name))}</b><span>${esc(t(s.detail))}</span></li>`).join("")}</ol>
    </div>`;

  set("#views-grid", track(views.pipeline, "is-data") + track(views.loop, "is-env"));
  set("#views-explanation", t(views.explanation));
}

function renderNumbers() {
  set("#numbers-title", esc(t(numbers.title)));
  set("#numbers-note", esc(t(numbers.note)));
  set("#numbers-pullquote", esc(t(numbers.pullquote)));
  set("#numbers-list", numbers.items.map((m, i) => `
    <li class="metric rv${m.accent ? " is-accent" : ""}" style="--i:${i}">
      <p class="metric-v">${esc(t(m.value))}<span class="metric-u">${esc(t(m.unit))}</span></p>
      <p class="metric-k">${esc(t(m.label))}</p>
      <p class="metric-why">${esc(t(m.why))}</p>
    </li>`).join(""));
  set("#numbers-closing", t(numbers.closing));
}

function renderHowItRuns() {
  const H = howItRuns;
  set("#how-title", esc(t(H.title)));
  set("#how-note", esc(t(H.note)));

  set("#how-layers", H.layers.map((l, i) => `
    <div class="srow" style="--i:${i}">
      <span class="srow-n" aria-hidden="true">${pad2(i + 1)}</span>
      <code class="srow-name">${esc(l.name)}</code>
      <span class="srow-role">${esc(t(l.role))}</span>
      <span class="srow-detail">${esc(t(l.detail))}</span>
    </div>`).join(""));

  set("#how-make-note", esc(t(H.principle)));

  set("#how-chains-title", esc(t(H.chainTitle)));
  set("#how-chains", H.chains.map((c, i) => `
    <div class="trace rv" style="--i:${i}">
      <p class="trace-cmd"><span class="ps" aria-hidden="true">$</span><code>${esc(c.cmd)}</code></p>
      ${chainList(c.steps, "tree")}
    </div>`).join(""));

  const w = H.warning;
  const list = (txt, ok) => `<ul class="verdict-list ${ok ? "is-yes" : "is-no"}">${
    txt.split("\n").map((x) => `<li>${ok ? TICK : CROSS}<code>${esc(x)}</code></li>`).join("")}</ul>`;
  set("#how-warning", `
    <p class="verdict-title">${esc(t(w.title))}</p>
    <div class="verdict-cols">
      <div class="verdict-col"><p>${t(w.lead)}</p>${list(w.runs, true)}</div>
      <div class="verdict-col"><p>${t(w.notLead)}</p>${list(w.notRuns, false)}</div>
    </div>
    <p class="verdict-text">${t(w.text)}</p>`);

  set("#how-families-title", esc(t(H.familiesTitle)));
  set("#how-families-note", esc(t(H.familiesNote)));
  set("#how-families", H.families.map((f, i) => `
    <div class="family family-${attr(f.key)} rv" style="--i:${i}">
      <p class="family-name">${esc(t(f.name))}</p>
      <p class="family-note">${esc(t(f.note))}</p>
      <dl>${f.items.map((it) => `
        <div><dt><code>${esc(it.cmd)}</code></dt><dd>${esc(t(it.what))}</dd></div>`).join("")}</dl>
    </div>`).join(""));
}

/* ===========================================================================
   Integrity: the one decision the whole project turns on, drawn as
   problem, decision, reason, outcome.
   =========================================================================== */

function beat(label, cls, inner) {
  return `
    <section class="beat ${cls} rv">
      <p class="beat-tag"><span>${esc(label)}</span></p>
      <div class="beat-body">${inner}</div>
    </section>`;
}

function renderIntegrity() {
  const I = integrity;
  set("#integrity-title", esc(t(I.title)));
  set("#integrity-kicker", esc(t(I.kicker)));
  set("#integrity-figure", esc(I.figure));
  set("#integrity-caption", esc(t(I.figureCaption)));
  set("#integrity-pair", `
    <div><span class="v">${esc(I.amount)}</span><span class="k">${esc(t(I.amountLabel))}</span></div>
    <div><span class="v">${esc(I.rows)}</span><span class="k">${esc(t(I.rowsLabel))}</span></div>`);

  const c = I.comparison;
  const P = I.preserve;
  const codeLine = (s) => `<pre class="inline-code"><code>${esc(s)}</code></pre>`;

  set("#integrity-body",
    beat(t(ui.problem), "is-problem", `
      ${I.body.map((p) => `<p>${t(p)}</p>`).join("")}
      <ul class="causes">${I.causes.map((x) => `<li>${esc(t(x))}</li>`).join("")}</ul>
      <h3 class="beat-h">${esc(t(I.innerTitle))}</h3>
      <p>${t(I.innerBody)}</p>
      <div class="versus">
        <table>
          <caption>${esc(t(c.caption))}</caption>
          <thead>
            <tr><th scope="col">${esc(t(c.measure || ui.measure))}</th>${
              c.columns.map((h, i) => `<th scope="col" class="${i ? "is-loss" : "is-keep"}">${esc(t(h))}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${c.rows.map(([k, a, b]) => `
              <tr><th scope="row">${t(k)}</th><td class="is-keep">${t(a)}</td><td class="is-loss">${t(b)}</td></tr>`).join("")}
          </tbody>
        </table>
      </div>`) +
    beat(t(ui.decision), "is-decision", `
      <h3 class="beat-h">${esc(t(P.title))}</h3>
      ${P.body.map((p) => `<p>${t(p)}</p>`).join("")}
      <div class="keys">
        <div><p>${t(P.keysLead)}</p>${codeLine(P.keys)}<p class="muted">${t(P.keysNote)}</p></div>
        <div><p>${t(P.sumLead)}</p>${codeLine(P.sumCode)}<p class="muted">${t(P.sumNote)}</p></div>
        <div><p>${t(P.isolateLead)}</p>${codeLine(P.isolateCode)}<p class="muted">${t(P.isolateNote)}</p></div>
      </div>`) +
    beat(t(ui.reason), "is-reason", `
      <h3 class="beat-h">${esc(t(I.reasons.title))}</h3>
      <p>${t(I.reasons.lead)}</p>
      <ol class="two-facts">${I.reasons.items.map((x) => `<li>${t(x)}</li>`).join("")}</ol>`) +
    beat(t(ui.outcome), "is-outcome", `<p class="outcome">${t(I.closing)}</p>`));
}

function renderArchitecture() {
  set("#architecture-title", esc(t(architecture.title)));
  set("#architecture-note", t(architecture.note));
  set("#plate-label", esc(t(ui.plate)));
  set("#zones", architecture.zones.map((z, i) => `
    <li class="zone zone-${attr(z.key)} rv" style="--i:${i}">
      <code class="zone-path">${esc(z.path)}</code>
      <h3 class="zone-t">${esc(t(z.title))}</h3>
      <p class="zone-v">${esc(t(z.volume))}</p>
      <p class="zone-text">${t(z.text)}</p>
    </li>`).join(""));
  set("#architecture-closing", t(architecture.closing));
}

function renderMedallion() {
  set("#medallion-title", esc(t(sections.medallion.title)));
  set("#medallion-note", t(sections.medallion.note));
  set("#layers", medallion.map((l, i) => `
    <li class="layer layer-${attr(l.id)} rv" style="--i:${i}">
      <div class="layer-top">
        <span class="layer-n">${esc(l.n)}</span>
        <h3 class="layer-name">${esc(t(l.name))}</h3>
      </div>
      <p class="layer-g">${esc(t(l.guarantee))}</p>
      <p class="layer-vol"><b>${esc(t(l.volume))}</b> <span>${esc(t(l.format))}</span></p>
      <ul class="chips is-small">${l.attrs.map((a) => `<li>${esc(t(a))}</li>`).join("")}</ul>
      <p class="layer-text">${t(l.guaranteeText)}</p>
      <p class="layer-q">${esc(t(l.principle))}</p>
    </li>`).join(""));
}

/* ===========================================================================
   Walkthrough: depth blocks
   =========================================================================== */

const blocks = {
  prose: (b) => `<div class="d-prose"><p>${t(b.text)}</p></div>`,

  note: (b) => `<aside class="d-note"><p>${t(b.text)}</p></aside>`,

  code: (b) => sourceBlock({
    file: b.caption, does: b.does, text: b.text, matters: b.matters,
    expect: b.expect, lang: b.lang
  }),

  decision: (b) => `
    <div class="d-decision">
      <p class="d-lbl">${esc(t(ui.architectureChoice))}</p>
      <h4>${t(b.title)}</h4>
      <ul class="options">${b.options.map((o) => `<li>${t(o)}</li>`).join("")}</ul>
      <p class="chosen">${TICK}<span>${t(b.chosen)}</span></p>
      <p class="because">${t(b.because)}</p>
    </div>`,

  pitfall: (b) => `
    <div class="d-finding">
      <p class="d-lbl">${esc(t(ui.pitfall))}</p>
      <h4>${t(b.title)}</h4>
      <p>${t(b.text)}</p>
    </div>`,

  check: (b) => evidence(b),

  chain: (b) => `
    <div class="d-chain">
      <p class="d-lbl">${esc(t(b.title))}</p>
      ${chainList(b.steps, "flow")}
    </div>`,

  invariant: (b) => `
    <div class="d-invariant">
      <p class="d-lbl">${esc(t(ui.invariant))}</p>
      <h4>${t(b.name)}</h4>
      <dl>
        <div><dt>${esc(t(ui.why))}</dt><dd>${t(b.why)}</dd></div>
        <div><dt>${esc(t(ui.test))}</dt><dd>${t(b.test)}</dd></div>
        <div class="is-fail"><dt>${esc(t(ui.failureMeans))}</dt><dd>${t(b.failure)}</dd></div>
      </dl>
    </div>`
};

function renderBlock(block) {
  const fn = blocks[block.type];
  if (!fn) {
    console.warn(`steps.js: unknown block type "${block.type}"`);
    return "";
  }
  return fn(block);
}

/* ===========================================================================
   Walkthrough: navigation and step rendering
   =========================================================================== */

const stageLabel = (id) => t((stages.find((s) => s.id === id) || {}).label);
let current = 0;

function renderWalkChrome() {
  set("#walkthrough-title", esc(t(sections.walkthrough.title)));
  set("#walkthrough-note", t(sections.walkthrough.note));

  set("#quickstart", `
    <p class="qs-title">${esc(t(quickstart.title))}</p>
    ${terminal(quickstart.cmd, { title: t(quickstart.note) })}`);

  /* Timeline: the four stages as proportional segments, one tick per step. */
  set("#stage-rail", `<ol class="tl">${stages.map((st) => {
    const own = steps.map((s, i) => ({ s, i })).filter(({ s }) => s.stage === st.id);
    const tpl = own.length > 1 ? ui.stepCount : ui.stepCountOne;
    return `
      <li class="tl-stage" data-stage="${attr(st.id)}" style="--n:${own.length}">
        <p class="tl-head"><b>${esc(t(st.label))}</b><span>${esc(t(tpl).replace("%n", String(own.length)))}</span></p>
        <div class="tl-ticks">${own.map(({ s, i }) => `
          <button type="button" class="tl-tick" data-step="${attr(s.id)}" data-i="${i}"
                  aria-label="${attr(`${s.n} ${t(s.label)}`)}"><span>${esc(s.n)}</span></button>`).join("")}
        </div>
      </li>`;
  }).join("")}</ol>`);

  /* Sidebar: steps grouped under their stage. */
  set("#step-list", stages.map((st) => {
    const own = steps.filter((s) => s.stage === st.id);
    return `
      <li class="sl-group">
        <p class="sl-stage">${esc(t(st.label))}</p>
        <ol>${own.map((s) => `
          <li><button type="button" data-step="${attr(s.id)}">
            <span class="num">${esc(s.n)}</span><span class="txt">${esc(t(s.label))}</span>
          </button></li>`).join("")}</ol>
      </li>`;
  }).join(""));
}

/* The analytics step is where computation and presentation meet, so its
   "what happens" part is drawn as two lanes. The data is the step's own:
   its flow feeds the compute lane, its analytics-view code block feeds the
   present lane. */
function analyticsLanes(s) {
  const viewBlock = (s.blocks || []).find((b) => b.type === "code" && /analytics-view/.test(b.text));
  const treeBlock = (s.blocks || []).find((b) => b.type === "code" && b !== viewBlock && /reports\//.test(b.caption));
  const flow = s.flow || [];
  const last = flow[flow.length - 1];
  const head = flow.slice(0, -1);
  const formats = typeof last === "string" && last.includes("·")
    ? `<li class="is-formats"><span class="node">${last.split("·").map((f) => `<span>${esc(f.trim())}</span>`).join("")}</span></li>` : "";

  const lanes = `
    <div class="lanes">
      <div class="lane is-compute">
        <p class="lane-h"><b>${esc(t(ui.compute))}</b><span>${t(ui.computeNote)}</span></p>
        <ol class="chain flow">${head.map((x) => {
          const n = chainNode(x);
          return `<li class="${n.cmd ? "is-cmd" : "is-label"}"><span class="node">${n.html}</span></li>`;
        }).join("")}${formats}</ol>
        ${treeBlock ? sourceBlock({ file: treeBlock.caption, does: treeBlock.does, text: treeBlock.text,
                                   matters: treeBlock.matters, lang: treeBlock.lang }) : ""}
      </div>
      <div class="lane is-present">
        <p class="lane-h"><b>${esc(t(ui.present))}</b><span>${t(ui.presentNote)}</span></p>
        ${viewBlock ? sourceBlock({ file: viewBlock.caption, does: viewBlock.does, text: viewBlock.text,
                                   matters: viewBlock.matters, expect: viewBlock.expect, lang: viewBlock.lang }) : ""}
      </div>
    </div>`;
  return { lanes, used: [viewBlock, treeBlock].filter(Boolean) };
}

function stepMarkup(s) {
  const part = (label, cls, body) => `
    <section class="beat ${cls}">
      <p class="beat-tag"><span>${esc(label)}</span></p>
      <div class="beat-body">${body}</div>
    </section>`;

  let whatHtml = (s.flow ? chainList(s.flow, "flow") : "") + `<p>${t(s.whatHappens)}</p>`;
  let depth = s.blocks || [];
  if (s.id === "analytics") {
    const { lanes, used } = analyticsLanes(s);
    whatHtml = `<p>${t(s.whatHappens)}</p>${lanes}`;
    depth = depth.filter((b) => !used.includes(b));
  }

  return `
    <header class="step-head">
      <span class="step-no" aria-hidden="true">${esc(s.n)}</span>
      <div class="step-headtext">
        <p class="step-meta">
          <span>${esc(stageLabel(s.stage))}</span>
          <span>${esc(s.duration)}</span>
          ${s.partOfPipeline ? `<span class="is-pipe">${esc(t(ui.inPipeline))} <code>make pipeline</code></span>` : ""}
        </p>
        <h3 class="step-title">${esc(t(s.title))}</h3>
        <p class="step-obj">${esc(t(s.objective))}</p>
      </div>
    </header>

    <div class="step-beats">
      ${part(t(ui.why), "is-why", `<p>${t(s.why)}</p>`)}
      ${part(t(ui.run), "is-run", s.run
        ? terminal(s.run.cmd, { note: s.run.note })
        : `<p class="muted">${esc(t(ui.noCommand))}</p>`)}
      ${part(t(ui.whatHappens), "is-what", whatHtml)}
      ${part(t(ui.check), "is-check", evidence(s.check))}
      ${part(t(ui.whyItMatters), "is-matters", `<p>${t(s.whyItMatters)}</p>`)}
    </div>

    <blockquote class="key-idea">
      <p class="key-lbl">${esc(t(ui.keyIdea))}</p>
      <p class="key-text">${esc(t(s.keyIdea))}</p>
    </blockquote>

    ${depth.length ? `<div class="step-depth">${depth.map(renderBlock).join("")}</div>` : ""}`;
}

function show(index, { push = true, focus = false, dir = 0, scroll = false } = {}) {
  current = Math.max(0, Math.min(index, steps.length - 1));
  const s = steps[current];
  const panel = $("#step-panel");

  panel.innerHTML = stepMarkup(s);
  panel.dataset.step = s.id;

  if (dir && !reduceMotion()) {
    panel.classList.remove("enter-next", "enter-prev");
    void panel.offsetWidth;                                   // restart the animation
    panel.classList.add(dir > 0 ? "enter-next" : "enter-prev");
  }

  $$("#step-list button").forEach((b) => {
    const i = steps.findIndex((x) => x.id === b.dataset.step);
    b.classList.toggle("is-done", i < current);
    if (i === current) b.setAttribute("aria-current", "step");
    else b.removeAttribute("aria-current");
  });

  $$(".tl-tick").forEach((b) => {
    const i = Number(b.dataset.i);
    b.classList.toggle("is-done", i < current);
    if (i === current) b.setAttribute("aria-current", "step");
    else b.removeAttribute("aria-current");
  });
  $$(".tl-stage").forEach((c) => c.classList.toggle("is-on", c.dataset.stage === s.stage));

  const prev = steps[current - 1];
  const next = steps[current + 1];
  const pb = $("#prev");
  const nb = $("#next");
  pb.disabled = !prev;
  nb.disabled = !next;
  pb.innerHTML = `${ARROW_L}<span><small>${esc(t(ui.previous))}</small>${prev ? `<b>${esc(prev.n)} ${esc(t(prev.label))}</b>` : ""}</span>`;
  nb.innerHTML = `<span><small>${esc(t(ui.next))}</small>${next ? `<b>${esc(next.n)} ${esc(t(next.label))}</b>` : ""}</span>${ARROW_R}`;
  $("#pager-label").textContent = t(ui.stepOf)
    .replace("%s", s.n)
    .replace("%t", pad2(steps.length));

  if (push && location.hash !== `#${s.id}`) {
    history.pushState({ step: s.id }, "", `#${s.id}`);
  }

  if (scroll) {
    const top = panel.getBoundingClientRect().top;
    if (top < 0 || top > window.innerHeight * 0.6) {
      panel.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" });
    }
  }
  if (focus) panel.focus({ preventScroll: true });
}

function go(i, opts = {}) {
  if (i < 0 || i >= steps.length || i === current) return;
  show(i, { dir: i > current ? 1 : -1, ...opts });
}

/* The hash may point at a step, at a section, or at nothing. Only the first
   case moves the walkthrough; the other two must not hijack the anchor. */
function indexOfHash() {
  const id = location.hash.replace(/^#/, "");
  const i = steps.findIndex((s) => s.id === id);
  return i === -1 ? current : i;
}

/* ===========================================================================
   Model, questions, decisions, reproducibility, summary
   =========================================================================== */

function renderDimensionalModel() {
  set("#dimensional-model-title", esc(t(dimensionalModel.title)));
  set("#grain-title", esc(t(dimensionalModel.grainTitle)));
  set("#grain-note", t(dimensionalModel.grain));
  set("#model-open", `<span>${esc(t(ui.openFull))}</span>${ARROW_OUT}`);
  const fig = $("#model-figure");
  if (fig) fig.setAttribute("alt", t(dimensionalModel.diagramAlt));
}

let activeQuestion = 0;

function renderQuestions() {
  set("#questions-title", esc(t(questions.title)));
  set("#questions-note", t(questions.note));

  const Q = questions.items;
  set("#questions-list", `
    <div class="ex-tabs" role="tablist" aria-label="${attr(t(questions.title))}">
      ${Q.map((q, i) => `
        <button type="button" role="tab" id="qtab-${i}" aria-controls="qpanel-${i}"
                aria-selected="${i === activeQuestion}" tabindex="${i === activeQuestion ? 0 : -1}">
          <span class="ex-n">${esc(q.n)}</span>
          <span class="ex-q">${esc(t(q.question))}</span>
        </button>`).join("")}
    </div>
    <div class="ex-panels">
      ${Q.map((q, i) => `
        <div class="ex-panel" role="tabpanel" id="qpanel-${i}" aria-labelledby="qtab-${i}"
             tabindex="0" ${i === activeQuestion ? "" : "hidden"}>
          <p class="ex-question"><span class="ex-n">${esc(q.n)}</span>${esc(t(q.question))}</p>
          ${sourceBlock({ file: questions.source, text: q.sql, lang: "sql" })}
          <p class="ex-result"><span class="lbl">${esc(t(ui.returned))}</span>${esc(t(q.result))}</p>
        </div>`).join("")}
    </div>`);

  set("#questions-table-title", esc(t(questions.tableTitle)));
  set("#questions-table", Q.map((q, i) => `
    <li class="answer rv" style="--i:${i}">
      <span class="answer-n">${esc(q.n)}</span>
      <p class="answer-q">${esc(t(q.question))}</p>
      <p class="answer-r">${esc(t(q.result))}</p>
    </li>`).join(""));
}

function selectQuestion(i, focus = false) {
  const n = questions.items.length;
  activeQuestion = (i + n) % n;
  $$("#questions-list [role=tab]").forEach((b, k) => {
    const on = k === activeQuestion;
    b.setAttribute("aria-selected", String(on));
    b.tabIndex = on ? 0 : -1;
    if (on && focus) b.focus();
  });
  $$("#questions-list [role=tabpanel]").forEach((p, k) => { p.hidden = k !== activeQuestion; });
}

function renderDecisions() {
  set("#decisions-title", esc(t(decisions.title)));
  set("#decisions-note", t(sections.decisions.note));
  set("#decisions-thesis", esc(t(decisions.thesis)));
  set("#decisions-principle", esc(t(decisions.principle)));
  set("#decision-rows", decisions.items.map((d, i) => `
    <article class="adr rv" style="--i:${i}">
      <header class="adr-head">
        <span class="adr-n">${pad2(i + 1)}</span>
        <h3 class="adr-tool">${esc(t(d.tool))}</h3>
        <p class="adr-used"><span class="lbl">${esc(t(ui.usedHere))}</span><span class="stamp">${esc(t(ui.no))}</span></p>
      </header>
      <dl class="adr-body">
        <div class="is-instead"><dt>${esc(t(ui.usedInstead))}</dt><dd>${esc(t(d.instead))}</dd></div>
        <div><dt>${esc(t(ui.whyNotHere))}</dt><dd>${esc(t(d.why))}</dd></div>
        <div><dt>${esc(t(ui.whenRelevant))}</dt><dd>${esc(t(d.when))}</dd></div>
      </dl>
    </article>`).join(""));
}

function renderReproducibility() {
  const r = reproducibility;
  set("#repro-title", esc(t(r.title)));
  set("#repro-thesis", esc(t(r.thesis)));
  set("#repro-components-title", esc(t(r.componentsTitle)));
  set("#repro-components", r.components.map(([k, v]) => `
    <div><dt>${esc(t(k))}</dt><dd>${esc(t(v))}</dd></div>`).join(""));
  set("#repro-claims-title", esc(t(r.claimsTitle)));
  set("#repro-claims-lead", esc(t(r.claimsLead)));
  set("#repro-claims", r.claims.map(([k, v]) => `
    <li>${TICK}<span class="claim-t">${esc(t(k))}</span><code>${esc(t(v))}</code></li>`).join(""));
  set("#repro-ci-title", esc(t(r.ci.title)));
  set("#repro-ci", `<p>${t(r.ci.body)}</p>`);
  set("#repro-trace-title", esc(t(r.traceTitle)));
  set("#repro-trace", `
    <p>${esc(t(r.traceLead))}</p>
    <ul class="dashes">${r.trace.map((x) => `<li>${esc(t(x))}</li>`).join("")}</ul>
    <p>${esc(t(r.traceClosing))}</p>`);
}

function renderSummary() {
  const S = summary;
  set("#summary-title", esc(t(S.title)));
  set("#summary-thesis", esc(t(S.thesis)));
  set("#summary-body", `
    <p class="summary-leadin">${esc(t(S.lead))}</p>
    <ol class="numbered is-cols">${S.points.map((x) => `<li>${esc(t(x))}</li>`).join("")}</ol>
    <p>${esc(t(S.stackLead))}</p>`);
  set("#summary-stack", S.stack.map((x) => `<li>${esc(x)}</li>`).join(""));
  set("#summary-stack-note", esc(t(S.stackNote)));
  set("#summary-closing", esc(t(S.closing)));
}

function renderFooter() {
  set("#foot-links", meta.links
    .concat([{ label: ui.repository, href: meta.repo }])
    .map((l) => `<li>${link(l, "text-link")}</li>`).join(""));
  set("#foot-stack", meta.stack.map(esc).join(" · "));
  set("#foot-note", esc(t(meta.footer)));
}

/* The diagram is fetched and inlined rather than referenced as <img src>, so
   its text scales with the page and stays selectable. If the fetch fails
   (a file opened straight from disk), fall back to an <img>. */
let diagramLoaded = false;
async function renderDiagram() {
  const holder = $("#svg-holder");
  const caption = $("#svg-caption");

  if (diagramLoaded) {
    const svg = holder.querySelector("svg");
    const desc = holder.querySelector("desc");
    if (svg) svg.setAttribute("aria-label", t(ui.diagramAlt));
    if (desc) caption.textContent = desc.textContent;
    return;
  }

  try {
    const res = await fetch("architecture.svg");
    if (!res.ok) throw new Error(res.status);
    holder.innerHTML = await res.text();
    const svg = holder.querySelector("svg");
    const desc = holder.querySelector("desc");
    if (svg) {
      svg.setAttribute("role", "img");
      svg.removeAttribute("width");
      svg.removeAttribute("height");
      svg.setAttribute("aria-label", t(ui.diagramAlt));
    }
    if (desc) caption.textContent = desc.textContent;
    diagramLoaded = true;
  } catch {
    holder.innerHTML = `<img src="architecture.svg" alt="${attr(t(ui.diagramAlt))}">`;
    caption.textContent = t(ui.diagramFallback);
  }
}

/* ===========================================================================
   Motion: reveal on scroll, active section, header state
   =========================================================================== */

let revealer = null;
function observeReveals() {
  const items = $$(".rv:not(.is-in)");
  if (!("IntersectionObserver" in window) || reduceMotion()) {
    items.forEach((el) => el.classList.add("is-in"));
    return;
  }
  if (!revealer) {
    revealer = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("is-in"); revealer.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  }
  items.forEach((el) => revealer.observe(el));
}

function watchSections() {
  if (!("IntersectionObserver" in window)) return;
  const ids = ui.nav.map((s) => s.id);
  const seen = new Map();
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => seen.set(e.target.id, e.isIntersecting));
    const active = ids.find((id) => seen.get(id));
    $$("#site-nav a").forEach((a) => {
      if (a.dataset.nav === active) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  ids.forEach((id) => { const el = document.getElementById(id); if (el) spy.observe(el); });

  /* The header gains its rule once the cover has scrolled away. */
  const cover = $(".cover");
  if (cover) {
    new IntersectionObserver(([e]) => {
      $("#hdr").classList.toggle("is-stuck", !e.isIntersecting);
    }, { rootMargin: "-64px 0px 0px 0px", threshold: 0 }).observe($(".cover-grid"));
  }
}

/* ===========================================================================
   Render everything
   =========================================================================== */

function render() {
  renderChrome();
  renderCover();
  renderChallenge();
  renderViews();
  renderNumbers();
  renderHowItRuns();
  renderIntegrity();
  renderArchitecture();
  renderMedallion();
  renderWalkChrome();
  renderDimensionalModel();
  renderQuestions();
  renderDecisions();
  renderReproducibility();
  renderSummary();
  renderFooter();
  show(current, { push: false });
  renderDiagram();
  observeReveals();
}

function setLanguage(next) {
  if (!SUPPORTED.includes(next) || next === lang) return;
  lang = next;
  try { localStorage.setItem(LANG_KEY, next); } catch { /* private mode */ }
  render();
  $$(".rv").forEach((el) => el.classList.add("is-in"));   // no re-entrance on a language switch
}

/* ===========================================================================
   Events
   =========================================================================== */

function setMenu(open) {
  const btn = $("#menu-btn");
  btn.setAttribute("aria-expanded", String(open));
  document.body.classList.toggle("menu-open", open);
}

function wire() {
  $("#lang-switch").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-lang]");
    if (btn) setLanguage(btn.dataset.lang);
  });

  $("#theme-toggle").addEventListener("click", () => theme.toggle());
  theme.watchSystem();

  $("#menu-btn").addEventListener("click", () =>
    setMenu($("#menu-btn").getAttribute("aria-expanded") !== "true"));
  $("#site-nav").addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("click", (e) => {
    if (document.body.classList.contains("menu-open") && !e.target.closest(".hdr")) setMenu(false);
  });

  const stepFrom = (e) => {
    const btn = e.target.closest("button[data-step]");
    return btn ? steps.findIndex((s) => s.id === btn.dataset.step) : -1;
  };
  $("#step-list").addEventListener("click", (e) => {
    const i = stepFrom(e);
    if (i > -1) go(i, { focus: true, scroll: true });
  });
  $("#stage-rail").addEventListener("click", (e) => {
    const i = stepFrom(e);
    if (i > -1) go(i, { focus: true, scroll: true });
  });

  $("#prev").addEventListener("click", () => go(current - 1, { focus: true, scroll: true }));
  $("#next").addEventListener("click", () => go(current + 1, { focus: true, scroll: true }));

  /* Question explorer: a real tablist, with roving focus. */
  const qlist = $("#questions-list");
  qlist.addEventListener("click", (e) => {
    const tab = e.target.closest("[role=tab]");
    if (tab) selectQuestion(Number(tab.id.split("-")[1]));
  });
  qlist.addEventListener("keydown", (e) => {
    const tab = e.target.closest("[role=tab]");
    if (!tab) return;
    const i = Number(tab.id.split("-")[1]);
    const map = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1,
                  Home: 0, End: questions.items.length - 1 };
    if (e.key in map) { e.preventDefault(); selectQuestion(map[e.key], true); }
  });

  /* Copy buttons are delegated: they live in panels that re-render. */
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest(".copy");
    if (!btn) return;
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
      btn.textContent = t(ui.copied);
      btn.classList.add("done");
      setTimeout(() => { btn.textContent = t(ui.copy); btn.classList.remove("done"); }, 1600);
    } catch {
      btn.textContent = t(ui.copyFailed);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.classList.contains("menu-open")) {
      setMenu(false);
      $("#menu-btn").focus();
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    const el = e.target;
    const tagName = (el.tagName || "").toLowerCase();
    if (tagName === "input" || tagName === "textarea" || el.isContentEditable) return;
    if (el.closest && el.closest("[role=tablist]")) return;

    /* Arrow keys move between steps only once the walkthrough is what the
       reader is looking at; otherwise they would fight page scrolling. */
    const section = $("#walkthrough");
    const box = section.getBoundingClientRect();
    const visible = box.top < window.innerHeight * 0.6 && box.bottom > window.innerHeight * 0.3;
    if (!section.contains(el) && !visible) return;

    if (e.key === "ArrowRight") { e.preventDefault(); go(current + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(current - 1); }
  });

  window.addEventListener("popstate", () => show(indexOfHash(), { push: false }));
}

/* ===========================================================================
   Boot
   =========================================================================== */

current = indexOfHash();
render();
wire();
watchSections();
