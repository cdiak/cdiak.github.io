/* ============================================================
   Margin of Safety — app.js
   Static, serverless. The visitor's Anthropic API key is sent
   only to api.anthropic.com from their own browser (BYOK).
   ============================================================ */
"use strict";

const MODEL = "claude-sonnet-4-6";   // change to taste
const MAX_TOKENS = 16000;
const MAX_SEARCHES = 8;
const BASE_YEAR = new Date().getFullYear();

const SCEN_COLORS = ["var(--s1)","var(--s2)","var(--s3)","var(--s4)","var(--s5)"];

/* ---------------- utilities ---------------- */
const $ = (sel) => document.querySelector(sel);

function fmtB(v) {
  if (!isFinite(v)) return "—";
  const sign = v < 0 ? "−" : "";
  v = Math.abs(v);
  if (v >= 1000) return `${sign}$${(v/1000).toFixed(2)}T`;
  if (v >= 100)  return `${sign}$${Math.round(v)}B`;
  if (v >= 10)   return `${sign}$${v.toFixed(1)}B`;
  return `${sign}$${v.toFixed(2)}B`;
}
function esc(s){ return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function download(name, text, mime="text/plain") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], {type:mime}));
  a.download = name; a.click(); URL.revokeObjectURL(a.href);
}

/* ---------------- key storage (graceful) ---------------- */
function saveKey(key, remember) {
  try { sessionStorage.setItem("mos_key", key);
        if (remember) localStorage.setItem("mos_key", key);
        else localStorage.removeItem("mos_key"); } catch (_) {}
}
function loadKey() {
  try { return sessionStorage.getItem("mos_key") || localStorage.getItem("mos_key") || ""; }
  catch (_) { return ""; }
}

/* ---------------- the prompt ---------------- */
function buildPrompt(company) {
  return `You are a buy-side analyst applying a Greenwald-style intrinsic-value framework (NAV / EPV / GV) to: ${company}

RESEARCH FIRST. Use web search to find, as of today: latest revenue or run-rate, margins/profitability, burn or FCF, last funding round or market cap (the "mark"), competitive position, governance, and risks. If the company is public, the mark is its current market capitalization (equity value, $B). If private, the mark is the latest credible post-money valuation or tender price.

THEN VALUE IT with five scenarios, each by the framework rule it earns:
1. Catastrophe — NAV at liquidation (cash recoverable + distressed asset/IP sale; satellite/AI/biotech assets usually recover little).
2. Commoditization / no moat — max(NAV, EPV) capped at replacement cost: revenue plateaus at squeezed margins.
3. Moat around current business — EPV: normalized steady-state FCF ÷ K, no value-creating growth.
4. Moat around new investment — GV via P = D/(K−G): growth compounds above the cost of capital.
5. Transformative tail — GV with extreme PVGO.
Also run the incremental-ROIC test: capital consumed recently vs. revenue/gross profit added → is incremental ROIC above or below K (framework Case 2 vs Case 3)?

CONVENTIONS: K = 10–12% (11% if self-funding/asset-backed, 12% if financing-dependent and pre-profit; lower only with strong justification). Steady-state values are capitalized at the steady-state year then discounted back to today at K. All dollar figures in $B (billions, USD). Probabilities sum to 100. Scenario values must be internally consistent with the parameters you return (the page recomputes them client-side as: EPV = (fcf or rev×margin)/K ÷ (1+K)^(year−${BASE_YEAR}) + addBack; GV = d/(K−g) ÷ (1+K)^(year−${BASE_YEAR}) + addBack).

OUTPUT: respond with ONLY a single JSON object — no markdown fences, no commentary — matching exactly this schema:

{
 "company": "Name",
 "status": "public NYSE: XYZ | private",
 "asOf": "Month DD, YYYY",
 "headline": "one-sentence hook about the valuation tension",
 "mark": { "value": 126, "label": "Series D, Feb 2026, post-money", "multiple": "~355x run-rate revenue" },
 "K": 11,
 "kRationale": "one sentence",
 "sectionA": [ { "signal": "framework signal name", "observed": "what you found, with numbers" } ],   // 4-6 rows
 "sectionB": {
   "rows": [ { "line": "Revenue", "figure": "$X.XB", "notes": "detail with numbers" } ],              // 4-6 rows
   "risks": "numbered risks paragraph",
   "governance": "paragraph"
 },
 "sectionC": [ { "factor": "Market size & growth", "assessment": "..." } ],                            // 5 rows: market size, historical industry returns, unit economics, competitive position, cyclicality
 "roicTest": { "lines": ["evidence line 1", "evidence line 2", "evidence line 3"], "verdict": "Case 2 or Case 3 verdict sentence" },
 "scenarios": [
   { "name": "Catastrophe", "rule": "NAV at liquidation", "desc": "...", "type": "nav", "prob": 10, "value": 20 },
   { "name": "Commoditization", "rule": "max(NAV, EPV) ≤ replacement cost", "desc": "...", "type": "epv", "prob": 25, "rev": 39, "margin": 18, "year": 2030, "addBack": 33 },
   { "name": "Moat: current business", "rule": "EPV", "desc": "...", "type": "epv", "prob": 35, "fcf": 28, "year": 2031, "addBack": 18 },
   { "name": "Moat: new investment", "rule": "GV = EPV + PVGO", "desc": "...", "type": "gv", "prob": 20, "d": 60, "g": 4, "year": 2032, "addBack": 30 },
   { "name": "Transformative tail", "rule": "GV, extreme PVGO", "desc": "...", "type": "gv", "prob": 10, "d": 200, "g": 5, "year": 2034, "addBack": 0 }
 ],
 "presets": { "base": [10,25,35,20,10], "bear": [25,45,25,5,0], "marketImplied": [0,0,10,45,45] },     // marketImplied = weights that roughly reproduce the mark, or your closest attempt
 "impliedProbs": "paragraph inverting the market price: what probability distribution does the mark require? Is it reachable at all?",
 "tradeSetup": "paragraph: crowding, counterparty, catalysts to watch, honest bull and bear counterpoints",
 "sources": "one paragraph listing the sources you relied on"
}

Scenario types: "nav" needs {value}. "epv" needs {rev, margin} or {fcf}, plus {year, addBack}. "gv" needs {d, g, year, addBack}. addBack is interim FCF or residual cash in $B and may be negative. Keep desc fields under 220 characters. Be rigorous and skeptical; do not flatter the company.`;
}

/* ---------------- API call ---------------- */
async function runClaude(company, key, onStatus) {
  const body = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: "user", content: buildPrompt(company) }],
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: MAX_SEARCHES }]
  };
  onStatus("Contacting the Claude API…");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    let detail = "";
    try { detail = (await res.json()).error?.message || ""; } catch (_) {}
    throw new Error(`API error ${res.status}: ${detail || res.statusText}`);
  }
  const data = await res.json();
  const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
  return extractJSON(text);
}

function extractJSON(text) {
  const cleaned = text.replace(/```json|```/g, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON found in the model response.");
  const obj = JSON.parse(cleaned.slice(start, end + 1));
  if (!Array.isArray(obj.scenarios) || obj.scenarios.length !== 5)
    throw new Error("Response did not contain five scenarios.");
  return obj;
}

/* ---------------- valuation engine ---------------- */
function scenarioValue(s, Kpct) {
  const k = Kpct / 100;
  const years = Math.max(0, (s.year || BASE_YEAR) - BASE_YEAR);
  const add = Number(s.addBack || 0);
  if (s.type === "nav") return Number(s.value || 0);
  if (s.type === "epv") {
    const F = s.fcf != null ? Number(s.fcf) : Number(s.rev || 0) * Number(s.margin || 0) / 100;
    return (F / k) / Math.pow(1 + k, years) + add;
  }
  if (s.type === "gv") {
    const g = Math.min(Number(s.g || 0) / 100, k - 0.005);
    return (Number(s.d || 0) / (k - g)) / Math.pow(1 + k, years) + add;
  }
  return 0;
}

function scenarioMath(s, Kpct) {
  const k = Kpct / 100;
  const years = Math.max(0, (s.year || BASE_YEAR) - BASE_YEAR);
  const disc = Math.pow(1 + k, years);
  const add = Number(s.addBack || 0);
  const addStr = add ? ` ${add >= 0 ? "+" : "−"} ${fmtB(Math.abs(add))} interim/cash` : "";
  if (s.type === "nav") return `NAV ≈ ${fmtB(Number(s.value||0))} (liquidation / distressed sale)`;
  if (s.type === "epv") {
    const F = s.fcf != null ? Number(s.fcf) : Number(s.rev||0) * Number(s.margin||0) / 100;
    const base = s.fcf != null ? `FCF ${fmtB(F)}` : `${fmtB(Number(s.rev||0))} × ${s.margin}%`;
    const epv = F / k;
    return `EPV(${s.year}) = ${base} ÷ ${Kpct}% = ${fmtB(epv)} → ÷ ${disc.toFixed(2)} (${years}y @ K) = ${fmtB(epv/disc)}${addStr}`;
  }
  const g = Math.min(Number(s.g||0)/100, k - 0.005);
  const tv = Number(s.d||0) / (k - g);
  return `P = D/(K−G) = ${s.d}/(${Kpct}%−${(g*100).toFixed(1)}%) = ${fmtB(tv)} in ${s.year} → ÷ ${disc.toFixed(2)} = ${fmtB(tv/disc)}${addStr}`;
}

/* ---------------- state ---------------- */
let state = null;

function computeAll() {
  const vals = state.data.scenarios.map(s => scenarioValue(s, state.K));
  const tot = state.weights.reduce((a,b)=>a+b,0) || 1;
  const probs = state.weights.map(w => w / tot);
  const contribs = probs.map((p,i)=> p * vals[i]);
  const EV = contribs.reduce((a,b)=>a+b,0);
  return { vals, probs, contribs, EV };
}

/* ---------------- dashboard renderer ---------------- */
function renderDashboard() {
  const d = state.data;
  const root = $("#dashboard");
  root.innerHTML = `
    <div class="tape-card" id="tape">
      <div class="tape-head">
        <div><span class="tape-label">EXPECTED VALUE</span><span class="tape-ev" id="ev-num"></span></div>
        <div style="font-size:12px;color:var(--sub)"><span class="tape-pct" id="ev-pct"></span> of the mark</div>
      </div>
      <div class="tape-track"><div class="tape-fill" id="tape-fill"></div><div class="tape-mark" id="tape-mark"></div></div>
      <div class="tape-legend">
        <div class="tape-keys" id="tape-keys"></div>
        <span class="tape-marklabel">▲ mark ${fmtB(d.mark.value)} — ${esc(d.mark.label)}</span>
      </div>
    </div>
    <div class="controls" id="controls">
      <span></span>
      <div class="k-wrap">
        <div class="slider-row"><div class="lab"><span>K — cost of capital (WACC)</span><span class="val" id="k-val"></span></div>
        <input type="range" id="k-slider" min="7" max="18" step="0.5"></div>
      </div>
    </div>
    <div id="scen-cards"></div>
    <div class="ledger">
      <div class="ledger-title">THE LEDGER</div>
      <div class="ledger-eq" id="ledger-eq"></div>
      <div class="ledger-sum" id="ledger-sum"></div>
      <p class="ledger-note">${esc(d.impliedProbs)}</p>
    </div>`;

  // presets
  const presets = Object.assign({ base: state.weights.slice() }, d.presets || {});
  const ctl = $("#controls").firstElementChild;
  const wrap = document.createElement("div");
  wrap.style.display = "flex"; wrap.style.gap = "8px"; wrap.style.flexWrap = "wrap";
  [["Base case","base"],["Market-implied","marketImplied"],["Bear","bear"]].forEach(([label,keyName]) => {
    if (!presets[keyName]) return;
    const b = document.createElement("button");
    b.className = "preset-btn"; b.textContent = label;
    b.onclick = () => { state.weights = presets[keyName].slice(); syncInputs(); update(); };
    wrap.appendChild(b);
  });
  ctl.replaceWith(wrap);

  // K slider
  $("#k-slider").value = state.K;
  $("#k-slider").addEventListener("input", e => { state.K = Number(e.target.value); update(); });

  // scenario cards
  const cards = $("#scen-cards");
  d.scenarios.forEach((s, i) => {
    const card = document.createElement("div");
    card.className = "scen-card";
    card.style.borderLeftColor = SCEN_COLORS[i];
    card.innerHTML = `
      <div class="scen-head">
        <div><span class="scen-name">${i+1}. ${esc(s.name)}</span><span class="scen-rule">${esc(s.rule)}</span></div>
        <div class="scen-calc" id="calc-${i}"></div>
      </div>
      <p class="scen-desc">${esc(s.desc)}</p>
      <div class="slider-row">
        <div class="lab"><span>Probability weight</span><span class="val" id="pw-${i}"></span></div>
        <input type="range" id="w-${i}" min="0" max="100" step="1" style="accent-color:${SCEN_COLORS[i]}">
      </div>
      <button class="math-toggle" id="mt-${i}">Show the math</button>
      <div id="mb-${i}" hidden>
        <div class="math-box" id="mx-${i}"></div>
        <div class="assump-row" id="ar-${i}"></div>
      </div>`;
    cards.appendChild(card);
    $(`#w-${i}`).addEventListener("input", e => { state.weights[i] = Number(e.target.value); update(); });
    $(`#mt-${i}`).addEventListener("click", () => {
      const box = $(`#mb-${i}`); box.hidden = !box.hidden;
      $(`#mt-${i}`).textContent = box.hidden ? "Show the math" : "Hide the math";
    });
    // assumption inputs
    const ar = $(`#ar-${i}`);
    const fields = s.type === "nav" ? [["value","NAV ($B)"]]
      : s.type === "epv" ? (s.fcf != null
          ? [["fcf","Steady FCF ($B)"],["year","Year"],["addBack","Interim/cash ($B)"]]
          : [["rev","Revenue ($B)"],["margin","FCF margin (%)"],["year","Year"],["addBack","Interim/cash ($B)"]])
      : [["d","FCF D ($B)"],["g","Growth G (%)"],["year","Year"],["addBack","Interim/cash ($B)"]];
    fields.forEach(([f, label]) => {
      const lab = document.createElement("label");
      lab.className = "assump";
      lab.innerHTML = `<span>${label}</span>`;
      const inp = document.createElement("input");
      inp.type = "number"; inp.step = "any"; inp.value = s[f] ?? 0;
      inp.addEventListener("input", e => { s[f] = Number(e.target.value) || 0; update(); });
      lab.appendChild(inp); ar.appendChild(lab);
    });
  });

  syncInputs(); update();
}

function syncInputs() {
  state.data.scenarios.forEach((_, i) => { const el = $(`#w-${i}`); if (el) el.value = state.weights[i]; });
  $("#k-slider").value = state.K;
}

function update() {
  const d = state.data;
  const { vals, probs, contribs, EV } = computeAll();
  const scale = Math.max(d.mark.value, EV) * 1.12;
  $("#ev-num").textContent = fmtB(EV);
  const pct = Math.round((EV / d.mark.value) * 100);
  const pctEl = $("#ev-pct");
  pctEl.textContent = `${pct}%`;
  pctEl.style.color = EV >= d.mark.value ? "var(--good)" : "var(--market)";
  $("#k-val").textContent = `${state.K}%`;
  $("#tape-fill").innerHTML = contribs.map((c,i) =>
    `<div class="tape-seg" style="width:${(c/scale)*100}%;background:${SCEN_COLORS[i]}" title="${esc(d.scenarios[i].name)}: ${fmtB(c)}"></div>`).join("");
  $("#tape-mark").style.left = `${(d.mark.value/scale)*100}%`;
  $("#tape-keys").innerHTML = d.scenarios.map((s,i) =>
    `<span class="tape-key"><span class="tape-swatch" style="background:${SCEN_COLORS[i]}"></span>${esc(s.name)} ${fmtB(contribs[i])}</span>`).join("");
  d.scenarios.forEach((s,i) => {
    $(`#calc-${i}`).innerHTML = `${fmtB(vals[i])} × ${(probs[i]*100).toFixed(0)}% = <b>${fmtB(contribs[i])}</b>`;
    $(`#pw-${i}`).textContent = `${state.weights[i]} → ${(probs[i]*100).toFixed(0)}%`;
    $(`#mx-${i}`).textContent = scenarioMath(s, state.K);
  });
  $("#ledger-eq").textContent = "E(V) = " + probs.map((p,i)=>`${(p*100).toFixed(0)}%·${fmtB(vals[i])}`).join(" + ");
  $("#ledger-sum").textContent =
    `E(V) ≈ ${fmtB(EV)}  vs.  mark ${fmtB(d.mark.value)}  →  ${EV>=d.mark.value?"premium":"discount"} of ${fmtB(Math.abs(d.mark.value-EV))}`;
}

/* ---------------- report renderer ---------------- */
function renderReport() {
  const d = state.data;
  const { vals, probs, contribs, EV } = computeAll();
  const rows = (arr, cols) => arr.map(r =>
    `<tr>${cols.map(c => `<td${c.num?' class="num"':''}>${esc(r[c.key])}</td>`).join("")}</tr>`).join("");

  $("#report").innerHTML = `
    <div class="rep-sub">INVESTMENT THESIS WORKSHEET · GENERATED ${esc(d.asOf || new Date().toDateString()).toUpperCase()}</div>
    <h2 class="rep-title">${esc(d.company)} — Intrinsic Value by Expected-Value Method</h2>
    <div class="rep-sub">${esc(d.status)} · Framework: NAV / EPV / GV (EPV + PVGO), probability-weighted · K = ${d.K}% — ${esc(d.kRationale)} · Model-generated estimates from public reporting · Not investment advice</div>
    <p><em>${esc(d.headline)}</em></p>
    <hr class="rep-rule">

    <h3>A. Thesis generation — what the newspaper flags</h3>
    <table><tr><th>Signal (from framework)</th><th>Observed</th></tr>
      ${rows(d.sectionA, [{key:"signal"},{key:"observed"}])}</table>

    <h3>B. Micro due diligence — revenue model</h3>
    <table><tr><th>Line</th><th>Figure</th><th>Notes</th></tr>
      ${rows(d.sectionB.rows, [{key:"line"},{key:"figure",num:true},{key:"notes"}])}</table>
    <h4>Key risks to cash generation</h4><p>${esc(d.sectionB.risks)}</p>
    <h4>Management / governance</h4><p>${esc(d.sectionB.governance)}</p>

    <h3>C. Macro due diligence</h3>
    <table><tr><th>Factor</th><th>Assessment</th></tr>
      ${rows(d.sectionC, [{key:"factor"},{key:"assessment"}])}</table>

    <h3>D. The math — NAV, EPV, GV (K = ${d.K}%)</h3>
    ${d.scenarios.map((s,i)=>`
      <h4>D${i+1}. ${esc(s.name)} <span style="font-weight:400;color:var(--sub)">(${esc(s.rule)})</span></h4>
      <p>${esc(s.desc)}</p>
      <div class="mathline">${esc(scenarioMath(s, state.K))}</div>
      <div class="mathfinal">Value today ≈ ${fmtB(vals[i])}</div>`).join("")}
    <h4>The three-cases test: incremental ROIC vs. K</h4>
    ${d.roicTest.lines.map(l=>`<div class="mathline">${esc(l)}</div>`).join("")}
    <div class="mathfinal">${esc(d.roicTest.verdict)}</div>

    <h3>E. Expected value — probability-weighted intrinsic value</h3>
    <table><tr><th>#</th><th>Scenario</th><th>Rule</th><th>Value today</th><th>Prob.</th><th>Contribution</th></tr>
      ${d.scenarios.map((s,i)=>`<tr><td>${i+1}</td><td>${esc(s.name)} — ${esc(s.desc)}</td><td>${esc(s.rule)}</td>
        <td class="num">${fmtB(vals[i])}</td><td class="num">${(probs[i]*100).toFixed(0)}%</td>
        <td class="num">${fmtB(contribs[i])}</td></tr>`).join("")}
      <tr class="evrow"><td></td><td>EXPECTED VALUE</td><td>Σ p(i) × V(i)</td><td></td>
        <td class="num">100%</td><td class="num">≈ ${fmtB(EV)}</td></tr></table>

    <h3>F. The trade — price vs. value</h3>
    <table>
      <tr><td>Market mark (${esc(d.mark.label)})</td><td class="num">${fmtB(d.mark.value)} (${esc(d.mark.multiple)})</td></tr>
      <tr><td>Expected value, this worksheet</td><td class="num">≈ ${fmtB(EV)}</td></tr>
      <tr><td>E(V) as % of mark</td><td class="num">≈ ${Math.round(EV/d.mark.value*100)}%</td></tr>
    </table>
    <h4>Implied probabilities</h4><p>${esc(d.impliedProbs)}</p>
    <h4>Setting up the trade</h4><p>${esc(d.tradeSetup)}</p>
    <p class="fine">Sources: ${esc(d.sources)} All scenario values, margins, probabilities and the WACC are model assumptions — adjust them in the dashboard above. Analytical output, not investment advice.</p>`;
}

/* ---------------- downloads ---------------- */
function reportMarkdown() {
  const d = state.data;
  const { vals, probs, contribs, EV } = computeAll();
  let md = `# ${d.company} — Intrinsic Value by Expected-Value Method\n\n`;
  md += `*${d.status} · ${d.asOf} · K = ${d.K}% (${d.kRationale}) · NAV/EPV/GV framework · Not investment advice*\n\n> ${d.headline}\n\n`;
  md += `## A. Thesis generation\n\n| Signal | Observed |\n|---|---|\n`;
  d.sectionA.forEach(r => md += `| ${r.signal} | ${r.observed} |\n`);
  md += `\n## B. Micro due diligence\n\n| Line | Figure | Notes |\n|---|---|---|\n`;
  d.sectionB.rows.forEach(r => md += `| ${r.line} | ${r.figure} | ${r.notes} |\n`);
  md += `\n**Risks:** ${d.sectionB.risks}\n\n**Governance:** ${d.sectionB.governance}\n`;
  md += `\n## C. Macro due diligence\n\n| Factor | Assessment |\n|---|---|\n`;
  d.sectionC.forEach(r => md += `| ${r.factor} | ${r.assessment} |\n`);
  md += `\n## D. The math (K = ${d.K}%)\n\n`;
  d.scenarios.forEach((s,i) => md += `**D${i+1}. ${s.name}** (${s.rule}) — ${s.desc}\n\n\`${scenarioMath(s, state.K)}\`\n\n**Value today ≈ ${fmtB(vals[i])}**\n\n`);
  md += `**Incremental-ROIC test:**\n${d.roicTest.lines.map(l=>`- ${l}`).join("\n")}\n\n> ${d.roicTest.verdict}\n`;
  md += `\n## E. Expected value\n\n| # | Scenario | Value | Prob. | Contribution |\n|---|---|---|---|---|\n`;
  d.scenarios.forEach((s,i) => md += `| ${i+1} | ${s.name} | ${fmtB(vals[i])} | ${(probs[i]*100).toFixed(0)}% | ${fmtB(contribs[i])} |\n`);
  md += `| | **E(V)** | | **100%** | **≈ ${fmtB(EV)}** |\n`;
  md += `\n## F. The trade\n\nMark: **${fmtB(d.mark.value)}** (${d.mark.label}, ${d.mark.multiple}) · E(V) ≈ **${fmtB(EV)}** ≈ **${Math.round(EV/d.mark.value*100)}% of mark**\n\n`;
  md += `**Implied probabilities:** ${d.impliedProbs}\n\n**Setting up the trade:** ${d.tradeSetup}\n\n*Sources: ${d.sources}*\n`;
  return md;
}

function dashboardJSX() {
  const d = state.data;
  const cfg = JSON.stringify({
    company: d.company, mark: d.mark, K: state.K,
    weights: state.weights, scenarios: d.scenarios,
    presets: d.presets, note: d.impliedProbs
  }, null, 2);
  return `import { useState, useMemo } from "react";
// ${d.company} — expected-value dashboard, generated by margin-of-safety
// Same math as the worksheet series: NAV / EPV / GV, probability-weighted.

const CFG = ${cfg};

const T = { bg:"#E9ECEE", panel:"#fff", ink:"#16232E", sub:"#5C6B76", rule:"#C7CFD4",
  hilite:"#F2D45C", market:"#A33B2E", scen:["#8A93A0","#5E7A8C","#2E5E63","#1C7A6B","#C29130"] };
const mono = "ui-monospace, Menlo, monospace";
const BASE_YEAR = ${BASE_YEAR};
const fmtB = (v) => { const s = v<0?"−":""; v=Math.abs(v);
  if (v>=1000) return s+"$"+(v/1000).toFixed(2)+"T";
  if (v>=100) return s+"$"+Math.round(v)+"B";
  if (v>=10) return s+"$"+v.toFixed(1)+"B"; return s+"$"+v.toFixed(2)+"B"; };

function val(s, K) {
  const k = K/100, y = Math.max(0,(s.year||BASE_YEAR)-BASE_YEAR), add = s.addBack||0;
  if (s.type==="nav") return s.value||0;
  if (s.type==="epv") { const F = s.fcf!=null ? s.fcf : (s.rev||0)*(s.margin||0)/100;
    return (F/k)/Math.pow(1+k,y)+add; }
  const g = Math.min((s.g||0)/100, k-0.005);
  return ((s.d||0)/(k-g))/Math.pow(1+k,y)+add;
}

export default function App() {
  const [w, setW] = useState(CFG.weights);
  const [K, setK] = useState(CFG.K);
  const vals = useMemo(() => CFG.scenarios.map(s => val(s,K)), [K]);
  const tot = w.reduce((a,b)=>a+b,0)||1;
  const contribs = w.map((x,i)=>(x/tot)*vals[i]);
  const EV = contribs.reduce((a,b)=>a+b,0);
  const scale = Math.max(CFG.mark.value, EV)*1.12;
  return (
    <div style={{minHeight:"100vh",background:T.bg,color:T.ink,padding:24,fontFamily:"system-ui"}}>
      <div style={{maxWidth:720,margin:"0 auto"}}>
        <h1 style={{fontFamily:"Georgia,serif"}}>What is {CFG.company}{" "}
          <span style={{background:T.hilite,padding:"0 4px"}}>actually worth?</span></h1>
        <div style={{background:T.panel,border:\`1px solid \${T.rule}\`,borderRadius:10,padding:14,marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <b style={{fontFamily:mono,fontSize:22}}>{fmtB(EV)}</b>
            <span style={{fontFamily:mono,color:EV>=CFG.mark.value?"#1C7A6B":T.market}}>
              {Math.round(EV/CFG.mark.value*100)}% of mark</span>
          </div>
          <div style={{position:"relative",height:36,background:"#F2F4F5",borderRadius:6,overflow:"hidden",marginTop:8}}>
            <div style={{position:"absolute",inset:0,display:"flex"}}>
              {contribs.map((c,i)=>(<div key={i} style={{width:\`\${(c/scale)*100}%\`,background:T.scen[i],transition:"width .3s"}}/>))}
            </div>
            <div style={{position:"absolute",top:0,bottom:0,width:2,background:T.market,left:\`\${(CFG.mark.value/scale)*100}%\`}}/>
          </div>
          <div style={{fontSize:10,color:T.market,textAlign:"right",fontWeight:700}}>▲ mark {fmtB(CFG.mark.value)} — {CFG.mark.label}</div>
        </div>
        <label style={{display:"block",marginBottom:14,fontSize:12,color:T.sub}}>
          K — cost of capital: <b style={{fontFamily:mono}}>{K}%</b>
          <input type="range" min={7} max={18} step={0.5} value={K}
            onChange={e=>setK(Number(e.target.value))} style={{width:"100%"}}/>
        </label>
        {CFG.scenarios.map((s,i)=>(
          <div key={i} style={{background:T.panel,border:\`1px solid \${T.rule}\`,borderLeft:\`4px solid \${T.scen[i]}\`,borderRadius:10,padding:12,marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:6}}>
              <b>{i+1}. {s.name}</b>
              <span style={{fontFamily:mono,fontSize:13}}>{fmtB(vals[i])} × {Math.round(w[i]/tot*100)}% = <b>{fmtB(contribs[i])}</b></span>
            </div>
            <p style={{fontSize:12,color:T.sub,margin:"4px 0 8px"}}>{s.desc}</p>
            <input type="range" min={0} max={100} value={w[i]} style={{width:"100%",accentColor:T.scen[i]}}
              onChange={e=>setW(prev=>prev.map((x,j)=>j===i?Number(e.target.value):x))}/>
          </div>
        ))}
        <p style={{fontSize:12,color:T.sub}}>{CFG.note} Not investment advice.</p>
      </div>
    </div>
  );
}
`;
}

/* ---------------- orchestration ---------------- */
const STATUS_LINES = [
  "Searching the web for the latest numbers…",
  "Reading filings, funding announcements, press…",
  "Building the five scenarios…",
  "Running the discounting (NAV / EPV / GV)…",
  "Weighing the probabilities…"
];

async function run(company, key) {
  const statusEl = $("#status"), errEl = $("#error"), btn = $("#run-btn");
  errEl.hidden = true; statusEl.hidden = false; btn.disabled = true;
  let i = 0;
  statusEl.innerHTML = `<span class="dot"></span><span id="status-text">${STATUS_LINES[0]}</span>`;
  const ticker = setInterval(() => {
    i = (i + 1) % STATUS_LINES.length;
    const t = $("#status-text"); if (t) t.textContent = STATUS_LINES[i];
  }, 7000);
  try {
    const data = await runClaude(company, key, msg => { const t = $("#status-text"); if (t) t.textContent = msg; });
    state = { data, K: Number(data.K) || 11, weights: data.scenarios.map(s => Number(s.prob) || 20) };
    $("#hero-company").textContent = data.company;
    renderDashboard();
    renderReport();
    $("#results").hidden = false;
    $("#results").scrollIntoView({ behavior: "smooth" });
  } catch (e) {
    errEl.hidden = false;
    errEl.textContent = `Something went wrong: ${e.message}\n\nCommon causes: invalid API key, no credit on the key, or the model returned malformed JSON (just run it again).`;
  } finally {
    clearInterval(ticker);
    statusEl.hidden = true;
    btn.disabled = false;
  }
}

/* ---------------- wire up ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  $("#key-input").value = loadKey();
  $("#run-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const company = $("#company-input").value.trim();
    const key = $("#key-input").value.trim();
    if (!company || !key) return;
    saveKey(key, $("#remember-key").checked);
    run(company, key);
  });
  const safeName = () => state.data.company.replace(/\W+/g, "_");
  $("#dl-md").addEventListener("click", () =>
    state && download(`${safeName()}_worksheet.md`, reportMarkdown(), "text/markdown"));
  $("#dl-jsx").addEventListener("click", () =>
    state && download(`${safeName()}_EV_Model.jsx`, dashboardJSX(), "text/javascript"));
  $("#dl-json").addEventListener("click", () =>
    state && download(`${safeName()}_data.json`, JSON.stringify(state.data, null, 2), "application/json"));
  $("#print-btn").addEventListener("click", () => window.print());
});
