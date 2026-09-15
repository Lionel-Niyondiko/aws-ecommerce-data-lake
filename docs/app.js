/* ===========================================================================
   app.js — the renderer. Contains no content.
   ===========================================================================
   Every string a reader sees comes from steps.js. This file decides only how
   blocks are drawn, how the walkthrough moves, and how the URL tracks it.

   Three concerns, kept apart:
     i18n     active language, persisted, browser-detected on first visit
     theme    light / dark, persisted, system-aware
     render   pure functions from content to HTML

   Switching language re-runs render() and re-renders the current step in
   place. No reload, no second document, no duplicated markup, and the reader
   keeps their position in the walkthrough.

   No framework, no build step, no dependency. A GitHub Pages site that needs
   npm install before it can be read is a site that stops working the day the
   toolchain moves on.
   =========================================================================== */

import {
  languages, ui, sections, meta, views, numbers, challenge, howItRuns,
  integrity, architecture, medallion, stages, quickstart, steps,
  dimensionalModel, questions, decisions, reproducibility, summary
} from "./steps.js";

const $ = (sel) => document.querySelector(sel);
const set = (sel, html) => { const n = $(sel); if (n) n.innerHTML = html; };

/* ===========================================================================
   i18n
   =========================================================================== */

const LANG_KEY = "ecommerce-datalake-language";
const SUPPORTED = languages.map((l) => l.code);

/* First visit only: read the browser. navigator.languages is ordered by
   preference, so it is checked before navigator.language. */
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

/** Resolve a content value. A plain string is language-neutral by design:
 *  commands, SQL, Terraform, AWS service names, file names, table names and
 *  identifiers read the same in both languages, and duplicating them would
 *  only create a way for the two copies to disagree. */
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
  /* Follow the operating system, but only while the reader has expressed no
     preference of their own. */
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
   escaping
   =========================================================================== */

/* Escapes text destined for a <pre>. Prose in steps.js is authored with inline
   HTML (<code>, <strong>, <em>) on purpose and is NOT escaped; code excerpts
   are, or a Terraform block containing "<" would silently vanish. */
const esc = (s) => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const attr = (s) => esc(s).replace(/"/g, "&quot;");

/* An outbound link and an in-page jump get different arrows and different
   rel/target, decided in one place. */
function link(item, cls = "") {
  const internal = item.internal || String(item.href).startsWith("#");
  return `<a class="arrow ${internal ? "down" : ""} ${cls}" href="${attr(item.href)}"
    ${internal ? "" : 'target="_blank" rel="noopener noreferrer"'}>${esc(t(item.label))}</a>`;
}

/* A copyable command block. Used by the quickstart and by every step. */
function commandBlock(cmd, note) {
  return `
    <div class="cmd">
      <div class="cmd-bar">
        <span>${esc(t(ui.run))}</span>
        <button class="copy" type="button" data-copy="${attr(cmd)}"
                aria-label="${attr(t(ui.copyLabel))}">${esc(t(ui.copy))}</button>
      </div>
      <pre>${esc(cmd)}</pre>
      ${note ? `<p class="note">${t(note)}</p>` : ""}
    </div>`;
}

/* A vertical chain: a command, then what it actually triggers. Square markers
   on a single rule, to stay inside the drawing language of the page. */
function chainList(items, cls = "") {
  return `<ol class="chain-flow ${cls}">${items.map((s) => {
    /* Three accepted shapes, because a chain node is sometimes a command
       (language-neutral), sometimes a localised label, and sometimes a label
       with a note underneath:
         "terraform apply"                     plain, escaped
         { en, fr }                            localised label, escaped
         { label: {en,fr}, note?: {en,fr} }    label may carry inline HTML   */
    if (typeof s === "string") return `<li><b>${esc(s)}</b></li>`;
    if (s.label === undefined) return `<li><b>${esc(t(s))}</b></li>`;
    const note = s.note ? `<span>${t(s.note)}</span>` : "";
    return `<li><b>${t(s.label)}</b>${note}</li>`;
  }).join("")}</ol>`;
}

function kvTable(block, cls = "check") {
  return `
    <div class="${cls}">
      <table>
        <caption>${esc(t(block.caption))}</caption>
        <tbody>
          ${block.rows.map(([k, v]) => `<tr><th scope="row">${t(k)}</th><td>${t(v)}</td></tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

/* ===========================================================================
   Chrome: the strings that belong to the controls rather than the case study
   =========================================================================== */

function renderChrome() {
  document.documentElement.setAttribute("lang", lang);
  document.title = t(ui.pageTitle);

  set("#skip-link", esc(t(ui.skip)));
  set("#wordmark", `${esc(ui.wordmark)}&nbsp;<span>${esc(ui.wordmarkTail)}</span>`);
  $("#site-nav").setAttribute("aria-label", t(ui.sectionsNav));
  set("#site-nav", ui.nav
    .map((s) => `<a href="#${s.id}">${esc(t(s.label))}</a>`).join(""));
  set("#head-cta", esc(t(ui.viewSource)));

  $("#lang-switch").setAttribute("aria-label", t(ui.language));
  set("#lang-switch", languages.map((l) => `
    <button type="button" data-lang="${l.code}" lang="${l.code}"
            aria-pressed="${l.code === lang}"
            aria-label="${attr(l.name)}">${esc(l.label)}</button>`).join(""));

  theme.sync();

  /* Band headings that used to be hard-coded in index.html. */
  set("#architecture-title", esc(t(architecture.title)));
  set("#architecture-note", t(architecture.note));
  set("#plate-label", esc(t(ui.plate)));
  set("#zones", architecture.zones.map((z) => `
    <li>
      <span class="tag">${esc(z.path)}</span>
      <b>${esc(t(z.title))}</b>
      <span class="zone-volume">${esc(t(z.volume))}</span>
      <span>${t(z.text)}</span>
    </li>`).join(""));
  set("#architecture-closing", t(architecture.closing));

  set("#medallion-title", esc(t(sections.medallion.title)));
  set("#medallion-note", t(sections.medallion.note));
  set("#walkthrough-title", esc(t(sections.walkthrough.title)));
  set("#walkthrough-note", t(sections.walkthrough.note));
  set("#decisions-note", t(sections.decisions.note));

  set("#steps-label", esc(t(ui.steps)));
  $("#walk-nav").setAttribute("aria-label", t(ui.stepsNav));
  $("#stage-rail").setAttribute("aria-label", t(ui.stagesNav));
  set("#walk-hint", t(ui.keyboardHint));
  set("#prev", `← ${esc(t(ui.previous))}`);
  set("#next", `${esc(t(ui.next))} →`);

  set("#foot-project-label", esc(t(ui.footProject)));
  set("#foot-stack-label", esc(t(ui.footStack)));
  set("#foot-method-label", esc(t(ui.footMethod)));
  set("#foot-claim", `${esc(t(ui.footClaimLead))} <em>${esc(t(ui.footClaimAccent))}</em>`);
  set("#colophon", ui.colophon.map((c) => `<span>${esc(t(c))}</span>`).join(""));
}

/* ===========================================================================
   Static sections
   =========================================================================== */

function renderCover() {
  set("#cover-eyebrow",
    `<span class="mono">${esc(t(meta.eyebrow))}</span>
     <span class="mono">${esc(t(meta.discipline))}</span>
     <span class="mono">${esc(meta.spec.find(([k]) => t(k) === "Region" || t(k) === "Région")?.[1] || "")}</span>`);

  set("#cover-title",
    meta.titleLines.map(esc).join("<br>") +
    `<span class="tail">${esc(t(meta.titleTail))}</span>`);

  set("#cover-tagline", esc(t(meta.tagline)));
  set("#cover-lede", esc(t(meta.lede)));
  set("#cover-zones", `
    <p class="zones-line"><code>${esc(meta.zonesLine)}</code></p>
    <p class="zones-note">${esc(t(meta.zonesNote))}</p>`);
  set("#cover-explain", `
    <p>${esc(t(meta.explainIntro))}</p>
    <ul class="point-list">${meta.explainPoints.map((x) => `<li>${esc(t(x))}</li>`).join("")}</ul>
    <p class="cover-explain-closing"><strong>${esc(t(meta.explainClosing))}</strong></p>`);
  set("#cover-stack", meta.stack.map((s) => `<li>${esc(s)}</li>`).join(""));
  set("#cover-actions", meta.links
    .map((l, i) => link(l, i === 0 ? "cta primary" : "cta")).join(""));

  set("#spec-title", esc(t(ui.specification)));
  set("#spec-ref", "Rev. 2026.09");
  set("#spec-list", meta.spec.map(([k, v]) => `
    <div class="spec-row"><dt>${esc(t(k))}</dt><dd>${esc(t(v))}</dd></div>`).join(""));

  const cta = $("#head-cta");
  cta.href = meta.repo;
  cta.target = "_blank";
  cta.rel = "noopener noreferrer";
}

/* The two views, drawn side by side and labelled with the question each one
   answers. Drawing them as a single chain is what made the previous version
   of this page hard to follow. */
function renderViews() {
  set("#views-title", esc(t(views.title)));
  set("#views-note", esc(t(views.note)));

  const view = (v, cls) => `
    <div class="view ${cls}">
      <p class="view-label mono">${esc(t(v.label))}</p>
      <p class="view-question">${esc(t(v.question))}</p>
      <ol class="view-stages">${v.stages.map((s) => `
        <li><b>${esc(t(s.name))}</b><span>${esc(t(s.detail))}</span></li>`).join("")}</ol>
    </div>`;

  set("#views-grid", view(views.pipeline, "is-pipeline") + view(views.loop, "is-loop"));
  set("#views-explanation", t(views.explanation));
}

function renderNumbers() {
  set("#numbers-title", esc(t(numbers.title)));
  set("#numbers-note", esc(t(numbers.note)));
  set("#numbers-list", numbers.items.map((m) => `
    <li class="metric${m.accent ? " accent" : ""}">
      <p class="metric-value">${esc(t(m.value))}</p>
      <span class="metric-unit">${esc(t(m.unit))}</span>
      <p class="metric-label">${esc(t(m.label))}</p>
      <p class="metric-note">${esc(t(m.why))}</p>
    </li>`).join(""));
  set("#numbers-pullquote", esc(t(numbers.pullquote)));
  set("#numbers-closing", t(numbers.closing));
}

function renderChallenge() {
  set("#challenge-title", esc(t(challenge.title)));
  set("#challenge-question", esc(t(challenge.question)));
  set("#challenge-body", `
    ${challenge.body.map((p) => `<p>${t(p)}</p>`).join("")}
    <ul class="point-list">${challenge.points.map((x) => `<li>${t(x)}</li>`).join("")}</ul>
    <p>${t(challenge.closing)}</p>`);

  /* The <img> already has its src from the markup: only the accessible name
     and the caption follow the language. */
  const fig = $("#flow-figure");
  if (fig) fig.setAttribute("alt", attr(t(challenge.figure.alt)));
  set("#flow-caption", esc(t(challenge.figure.caption)));
}

function renderHowItRuns() {
  const H = howItRuns;
  set("#how-title", esc(t(H.title)));
  set("#how-note", esc(t(H.note)));

  set("#how-layers", H.layers.map((l) => `
    <div class="layer-row">
      <span class="layer-name">${esc(l.name)}</span>
      <span class="layer-role mono">${esc(t(l.role))}</span>
      <span class="layer-detail">${esc(t(l.detail))}</span>
    </div>`).join(""));

  set("#how-make-note", esc(t(H.principle)));

  set("#how-chains-title", esc(t(H.chainTitle)));
  set("#how-chains", H.chains.map((c) => `
    <div class="chain-card">
      <p class="chain-cmd"><code>${esc(c.cmd)}</code></p>
      ${chainList(c.steps, "compact")}
    </div>`).join(""));

  set("#how-warning", `
    <p class="warn-title">${esc(t(H.warning.title))}</p>
    <p>${t(H.warning.lead)}</p>
    <pre class="warn-code">${esc(H.warning.runs)}</pre>
    <p>${t(H.warning.notLead)}</p>
    <pre class="warn-code is-not">${esc(H.warning.notRuns)}</pre>
    <p>${t(H.warning.text)}</p>`);

  set("#how-families-title", esc(t(H.familiesTitle)));
  set("#how-families-note", esc(t(H.familiesNote)));
  set("#how-families", H.families.map((f) => `
    <div class="family family-${f.key}">
      <p class="family-name">${esc(t(f.name))}</p>
      <p class="family-note">${esc(t(f.note))}</p>
      <dl>${f.items.map((i) => `
        <div><dt><code>${esc(i.cmd)}</code></dt><dd>${esc(t(i.what))}</dd></div>`).join("")}</dl>
    </div>`).join(""));
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
  set("#integrity-body", `
    ${I.body.map((p) => `<p>${t(p)}</p>`).join("")}
    <ul class="point-list">${I.causes.map((x) => `<li>${esc(t(x))}</li>`).join("")}</ul>
    <h4 class="integrity-sub">${esc(t(I.innerTitle))}</h4>
    <p>${t(I.innerBody)}</p>
    <div class="versus">
      <table>
        <caption>${esc(t(c.caption))}</caption>
        <thead>
          <tr><th scope="col">${esc(t(ui.measure))}</th>${
            c.columns.map((h) => `<th scope="col">${esc(t(h))}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${c.rows.map(([k, a, b]) => `
            <tr><th scope="row">${t(k)}</th><td>${t(a)}</td><td>${t(b)}</td></tr>`).join("")}
        </tbody>
      </table>
    </div>
    <h4 class="integrity-sub">${esc(t(I.preserve.title))}</h4>
    ${I.preserve.body.map((p) => `<p>${t(p)}</p>`).join("")}
    <p>${t(I.preserve.keysLead)}</p>
    <pre class="integrity-code">${esc(I.preserve.keys)}</pre>
    <p>${t(I.preserve.keysNote)}</p>
    <p>${t(I.preserve.sumLead)}</p>
    <pre class="integrity-code">${esc(I.preserve.sumCode)}</pre>
    <p>${t(I.preserve.sumNote)}</p>
    <p>${t(I.preserve.isolateLead)}</p>
    <pre class="integrity-code">${esc(I.preserve.isolateCode)}</pre>
    <p>${t(I.preserve.isolateNote)}</p>
    <h4 class="integrity-sub">${esc(t(I.reasons.title))}</h4>
    <p>${t(I.reasons.lead)}</p>
    <ol class="reason-list">${I.reasons.items.map((x) => `<li>${t(x)}</li>`).join("")}</ol>
    <p class="integrity-closing">${t(I.closing)}</p>`);
}

function renderMedallion() {
  set("#layers", medallion.map((l) => `
    <li class="layer">
      <span class="layer-n">${esc(l.n)}</span>
      <h3>${esc(t(l.name))}</h3>
      <p class="layer-badge">${esc(t(l.guarantee))}</p>
      <ul class="layer-attrs">${l.attrs.map((a) => `<li>${esc(t(a))}</li>`).join("")}</ul>
      <p class="layer-meta"><b>${esc(t(l.volume))}</b>${esc(t(l.format))}</p>
      <p class="layer-guarantee">${t(l.guaranteeText)}</p>
      <p class="layer-principle">${esc(t(l.principle))}</p>
    </li>`).join(""));
}

function renderDimensionalModel() {
  set("#dimensional-model-title", esc(t(dimensionalModel.title)));
  set("#grain-title", esc(t(dimensionalModel.grainTitle)));
  set("#grain-note", t(dimensionalModel.grain));

  /* The src comes from the markup, so only the accessible name follows the
     language. Same contract as the illustration in band 01. */
  const fig = $("#model-figure");
  if (fig) fig.setAttribute("alt", attr(t(dimensionalModel.diagramAlt)));
}

function renderQuestions() {
  set("#questions-title", esc(t(questions.title)));
  set("#questions-note", t(questions.note));

  /* Same figure.code component the walkthrough uses for SQL, so the six
     queries read exactly like every other code block on the page. */
  set("#questions-list", questions.items.map((q) => `
    <figure class="code">
      <figcaption>
        <span class="what">${esc(q.n)} · ${esc(t(q.question))}</span>
        <span class="src">${esc(questions.source)}</span>
      </figcaption>
      <pre><code>${esc(q.sql)}</code></pre>
    </figure>`).join(""));

  set("#questions-table-title", esc(t(questions.tableTitle)));
  set("#questions-table", questions.items.map((q) => `
    <div class="ci-row">
      <span class="path">${esc(q.n)}</span>
      <span class="what"><b>${esc(t(q.question))}</b>${esc(t(q.result))}</span>
    </div>`).join(""));
}

function renderDecisions() {
  set("#decisions-title", esc(t(decisions.title)));
  set("#decisions-thesis", esc(t(decisions.thesis)));
  set("#decisions-principle", esc(t(decisions.principle)));
  set("#decision-rows", decisions.items.map((d, i) => `
    <div class="dec-row">
      <div class="dec-tool">
        <span class="tag">${String(i + 1).padStart(2, "0")}</span>
        <b>${esc(t(d.tool))}</b>
        <p class="dec-instead"><span class="tag">${esc(t(ui.usedInstead))}</span>${esc(t(d.instead))}</p>
      </div>
      <div class="dec-col">
        <span class="tag">${esc(t(ui.usedHere))}</span>
        <p class="dec-no">${esc(t(ui.no))}</p>
      </div>
      <div class="dec-col">
        <span class="tag">${esc(t(ui.whyNotHere))}</span>
        <p>${esc(t(d.why))}</p>
      </div>
      <div class="dec-col">
        <span class="tag">${esc(t(ui.whenRelevant))}</span>
        <p>${esc(t(d.when))}</p>
      </div>
    </div>`).join(""));
}

function renderReproducibility() {
  const r = reproducibility;
  set("#repro-title", esc(t(r.title)));
  set("#repro-thesis", esc(t(r.thesis)));
  set("#repro-components-title", esc(t(r.componentsTitle)));
  set("#repro-components", r.components.map(([k, v]) => `
    <div class="ci-row"><span class="path">${esc(t(k))}</span><span class="what">${esc(t(v))}</span></div>`)
    .join(""));
  set("#repro-claims-title", esc(t(r.claimsTitle)));
  set("#repro-claims-lead", esc(t(r.claimsLead)));
  set("#repro-claims", r.claims.map(([k, v]) => `
    <li><b>${esc(t(k))}</b><span>${esc(t(v))}</span></li>`).join(""));
  set("#repro-ci-title", esc(t(r.ci.title)));
  set("#repro-ci", `<p class="prose-note">${t(r.ci.body)}</p>`);
  set("#repro-trace-title", esc(t(r.traceTitle)));
  set("#repro-trace", `
    <p>${esc(t(r.traceLead))}</p>
    <ul class="point-list">${r.trace.map((x) => `<li>${esc(t(x))}</li>`).join("")}</ul>
    <p>${esc(t(r.traceClosing))}</p>`);
}

function renderSummary() {
  const S = summary;
  set("#summary-title", esc(t(S.title)));
  set("#summary-thesis", esc(t(S.thesis)));
  set("#summary-body", `
    <p>${esc(t(S.lead))}</p>
    <ul class="point-list">${S.points.map((x) => `<li>${esc(t(x))}</li>`).join("")}</ul>
    <p>${esc(t(S.stackLead))}</p>`);
  set("#summary-stack", S.stack.map((x) => `<li>${esc(x)}</li>`).join(""));
  set("#summary-stack-note", esc(t(S.stackNote)));
  set("#summary-closing", esc(t(S.closing)));
}

function renderFooter() {
  set("#foot-links", meta.links
    .concat([{ label: ui.repository, href: meta.repo }])
    .map((l) => `<li>${link(l)}</li>`).join(""));
  set("#foot-stack", meta.stack.map(esc).join(" · "));
  set("#foot-note", esc(t(meta.footer)));
}

/* The diagram is fetched and inlined rather than referenced as <img src>, so
   its text scales with the page and stays selectable and searchable. If the
   fetch fails, for instance when the file is opened straight from disk, fall
   back to an <img>, which always works. */
let diagramLoaded = false;
async function renderDiagram() {
  const holder = $("#svg-holder");
  const caption = $("#svg-caption");

  /* Already inlined: do not re-fetch, but DO re-apply the localised label,
     because the accessible name of the diagram follows the language too. */
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
      // An inline SVG is not an <img>: it needs an explicit role and label.
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
   Walkthrough — optional depth blocks
   =========================================================================== */

const blocks = {
  prose: (b) => `<div class="block"><p>${t(b.text)}</p></div>`,

  note: (b) => `<div class="note-block"><p>${t(b.text)}</p></div>`,

  code: (b) => `
    <figure class="code">
      <figcaption>
        <span class="what">${t(b.does)}</span>
        <span class="src">${esc(b.caption)}</span>
      </figcaption>
      <pre><code>${esc(b.text)}</code></pre>
      ${b.matters ? `<p class="code-note"><span class="tag">${esc(t(ui.whyItMatters))}</span>${t(b.matters)}</p>` : ""}
      ${b.expect ? `<p class="code-expect"><span class="tag">${esc(t(ui.expectedResult))}</span>${t(b.expect)}</p>` : ""}
    </figure>`,

  decision: (b) => `
    <div class="decision">
      <div class="decision-in">
        <span class="tag">${esc(t(ui.architectureChoice))}</span>
        <h4>${t(b.title)}</h4>
        <ul>${b.options.map((o) => `<li>${t(o)}</li>`).join("")}</ul>
        <span class="chosen">${t(b.chosen)}</span>
        <p class="because">${t(b.because)}</p>
      </div>
    </div>`,

  pitfall: (b) => `
    <div class="pitfall">
      <span class="tag">${esc(t(ui.pitfall))}</span>
      <h4>${t(b.title)}</h4>
      <p>${t(b.text)}</p>
    </div>`,

  check: (b) => kvTable(b),

  chain: (b) => `
    <div class="chain-block">
      <p class="chain-title tag">${esc(t(b.title))}</p>
      ${chainList(b.steps)}
    </div>`,

  invariant: (b) => `
    <div class="invariant">
      <span class="tag">${esc(t(ui.invariant))}</span>
      <h4>${t(b.name)}</h4>
      <dl>
        <div><dt>${esc(t(ui.why))}</dt><dd>${t(b.why)}</dd></div>
        <div><dt>${esc(t(ui.test))}</dt><dd>${t(b.test)}</dd></div>
        <div><dt>${esc(t(ui.failureMeans))}</dt><dd>${t(b.failure)}</dd></div>
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
   Walkthrough — navigation
   =========================================================================== */

const stageLabel = (id) => t((stages.find((s) => s.id === id) || {}).label);

let current = 0;

function renderWalkChrome() {
  set("#quickstart", `
    <p class="quickstart-title">${esc(t(quickstart.title))}</p>
    <p class="quickstart-note">${esc(t(quickstart.note))}</p>
    ${commandBlock(quickstart.cmd)}`);

  set("#step-list", steps.map((s) => `
    <li>
      <button type="button" data-step="${attr(s.id)}">
        <span class="num">${esc(s.n)}</span>
        <span class="txt">${esc(t(s.label))}</span>
      </button>
    </li>`).join(""));

  set("#stage-rail", stages.map((st) => {
    const count = steps.filter((s) => s.stage === st.id).length;
    const tpl = count > 1 ? ui.stepCount : ui.stepCountOne;
    return `<div class="rail-cell" data-stage="${attr(st.id)}">
      <span class="k">${esc(t(st.label))}</span>
      <span class="v">${esc(t(tpl).replace("%n", String(count)))}</span>
    </div>`;
  }).join(""));
}

function show(index, { push = true, focus = false } = {}) {
  current = Math.max(0, Math.min(index, steps.length - 1));
  const s = steps[current];

  const part = (label, cls, body) => `
    <section class="part ${cls}">
      <h4 class="part-label">${esc(label)}</h4>
      <div class="part-body">${body}</div>
    </section>`;

  $("#step-panel").innerHTML = `
    <header class="step-head">
      <p class="step-kicker">
        <span class="step-num">${esc(s.n)}</span>
        <span class="tag">${esc(stageLabel(s.stage))}</span>
        <span class="tag">${esc(s.duration)}</span>
        ${s.partOfPipeline
          ? `<span class="badge">${esc(t(ui.inPipeline))} <code>make pipeline</code></span>` : ""}
      </p>
      <h3 class="step-title">${esc(t(s.title))}</h3>
      <p class="step-objective">${esc(t(s.objective))}</p>
    </header>

    ${part(t(ui.why), "is-why", `<p>${t(s.why)}</p>`)}

    ${part(t(ui.run), "is-run", s.run
      ? commandBlock(s.run.cmd, s.run.note)
      : `<p class="no-command">${esc(t(ui.noCommand))}</p>`)}

    ${part(t(ui.whatHappens), "is-what",
      (s.flow ? chainList(s.flow, "compact") : "") + `<p>${t(s.whatHappens)}</p>`)}

    ${part(t(ui.check), "is-check", kvTable(s.check))}

    ${part(t(ui.whyItMatters), "is-matters", `<p>${t(s.whyItMatters)}</p>`)}

    <p class="key-idea">
      <span class="tag">${esc(t(ui.keyIdea))}</span>
      <span class="idea">${esc(t(s.keyIdea))}</span>
    </p>

    ${s.blocks && s.blocks.length
      ? `<div class="step-depth">${s.blocks.map(renderBlock).join("")}</div>` : ""}
  `;

  document.querySelectorAll("#step-list button").forEach((b) => {
    if (b.dataset.step === s.id) b.setAttribute("aria-current", "step");
    else b.removeAttribute("aria-current");
  });

  document.querySelectorAll(".rail-cell").forEach((c) => {
    c.classList.toggle("on", c.dataset.stage === s.stage);
  });

  $("#prev").disabled = current === 0;
  $("#next").disabled = current === steps.length - 1;
  $("#pager-label").textContent = t(ui.stepOf)
    .replace("%s", s.n)
    .replace("%t", String(steps.length).padStart(2, "0")) + ` · ${t(s.label)}`;

  if (push && location.hash !== `#${s.id}`) {
    history.pushState({ step: s.id }, "", `#${s.id}`);
  }
  if (focus) $("#step-panel").focus({ preventScroll: true });
}

/* The hash may point at a step, at a section, or at nothing. Only the first
   case moves the walkthrough; the other two must not hijack the anchor. */
function indexOfHash() {
  const id = location.hash.replace(/^#/, "");
  const i = steps.findIndex((s) => s.id === id);
  return i === -1 ? current : i;
}

/* ===========================================================================
   Render everything
   =========================================================================== */

function render() {
  renderChrome();
  renderCover();
  renderViews();
  renderNumbers();
  renderChallenge();
  renderHowItRuns();
  renderIntegrity();
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
}

function setLanguage(next) {
  if (!SUPPORTED.includes(next) || next === lang) return;
  lang = next;
  try { localStorage.setItem(LANG_KEY, next); } catch { /* private mode */ }
  render();                       // the walkthrough keeps its current step
}

/* ===========================================================================
   Events
   =========================================================================== */

function wire() {
  $("#lang-switch").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-lang]");
    if (btn) setLanguage(btn.dataset.lang);
  });

  $("#theme-toggle").addEventListener("click", () => theme.toggle());
  theme.watchSystem();

  $("#step-list").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-step]");
    if (!btn) return;
    show(steps.findIndex((s) => s.id === btn.dataset.step), { focus: true });
  });

  $("#prev").addEventListener("click", () => show(current - 1, { focus: true }));
  $("#next").addEventListener("click", () => show(current + 1, { focus: true }));

  /* Copy buttons are delegated from the document, because they appear both in
     the quickstart and inside a panel that is re-rendered on every step and
     language change. Binding per button would leak listeners. */
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

  /* Arrow keys move between steps, but only once the walkthrough is the thing
     the reader is looking at. Otherwise they would fight page scrolling. */
  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    const el = e.target;
    const tag = (el.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || el.isContentEditable) return;

    const section = $("#walkthrough");
    const box = section.getBoundingClientRect();
    const visible = box.top < window.innerHeight * 0.6 && box.bottom > 0;
    if (!section.contains(el) && !visible) return;

    if (e.key === "ArrowRight") { e.preventDefault(); show(current + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); show(current - 1); }
  });

  window.addEventListener("popstate", () => show(indexOfHash(), { push: false }));
}

/* ===========================================================================
   Boot
   =========================================================================== */

current = indexOfHash();
render();
wire();
