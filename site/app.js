(() => {
  const LS_KEY = "qb-radar-pilot";
  const API = "https://api.github.com";
  const WORKFLOW_FILE = "collect.yml";
  const $ = (s) => document.querySelector(s);

  let cfg = {};
  try { cfg = JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch (e) { cfg = {}; }
  let summary = null, workflow = null, branch = null, articlesCache = {};
  let latestRun = null, pendingSince = 0, pollTimer = null, radarRequest = 0, articleRequest = 0;

  const CHANNEL = { feed: "RSS", "wp-api": "API", sitemap: "sitemap", listing: "výpis", none: "žádný" };
  const STATUS = { ok: "OK", empty: "kanál prázdný", no_channel: "bez kanálu", parse_error: "nečitelný kanál", timeout: "časový limit",
    connection_error: "spojení selhalo", robots_disallowed: "robots.txt zakazuje", exception: "chyba skriptu", http_403: "403 blokováno",
    blocked: "blokuje automatický přístup", time_budget: "vypršel čas na hledání", no_usable_channel: "žádný použitelný kanál",
    http_404: "404 nenalezeno", http_429: "429 příliš požadavků", http_500: "500 chyba serveru", http_503: "503 nedostupné" };
  const ART_STATUS = { ok: "text", no_text: "bez textu", fetch_failed: "stažení selhalo", not_html: "není HTML" };

  function toast(msg, ms = 2600) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), ms); }
  function esc(s) { return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
  function fmtDT(iso) { if (!iso) return "–"; const d = new Date(iso); return d.toLocaleString("cs-CZ", { timeZone: "Europe/Prague", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" }); }
  function fmtPub(a) {
    if (!a.published_at) return '<span class="badge">bez data</span>';
    if (a.precision === "day") return new Date(a.published_at).toLocaleDateString("cs-CZ", { timeZone: "UTC", day: "numeric", month: "numeric" }) + ' <span class="badge" title="zdroj uvádí jen den, bez času">jen den</span>';
    return fmtDT(a.published_at);
  }
  function fmtDay(day) { const [y, m, d] = day.split("-"); return `${+d}. ${+m}.`; }
  function weekday(day) { return new Date(day + "T12:00:00").toLocaleDateString("cs-CZ", { weekday: "short" }); }
  function statusLabel(s) { return STATUS[s] || s || "–"; }

  async function gh(path, opts = {}) {
    const headers = { Authorization: "Bearer " + cfg.token, "X-GitHub-Api-Version": "2022-11-28",
      Accept: opts.raw ? "application/vnd.github.raw+json" : "application/vnd.github+json" };
    const r = await fetch(API + path, { method: opts.method || "GET", headers, body: opts.body ? JSON.stringify(opts.body) : undefined, cache: "no-store" });
    if (r.status === 204) return null;
    if (!r.ok) {
      let msg = r.status + " " + r.statusText;
      try { const j = await r.json(); if (j.message) msg += ": " + j.message; } catch (e) {}
      const err = new Error(msg); err.status = r.status; throw err;
    }
    return opts.raw ? r.text() : r.json();
  }
  const repo = () => `/repos/${cfg.repo}`;
  async function readFile(path) {
    const txt = await gh(`${repo()}/contents/${path}?ref=${encodeURIComponent(branch)}&_=${Date.now()}`, { raw: true });
    return txt;
  }

  // ---------- nastavení ----------
  function showSetup(err) {
    $("#setup").hidden = false; $("#app").hidden = true; $("#controls").hidden = true;
    $("#repoInput").value = cfg.repo || "miloscermak/qb-radar-pilot"; $("#tokenInput").value = cfg.token || "";
    $("#setupError").textContent = err || ""; $("#cancelSetup").hidden = !summary;
  }
  $("#saveSetup").onclick = async () => {
    cfg = { repo: $("#repoInput").value.trim().replace(/^https:\/\/github\.com\//, "").replace(/\/$/, ""), token: $("#tokenInput").value.trim() };
    if (!/^[\w.-]+\/[\w.-]+$/.test(cfg.repo) || !cfg.token) { $("#setupError").textContent = "Zadejte repozitář ve tvaru vlastník/název a token."; return; }
    try { localStorage.setItem(LS_KEY, JSON.stringify(cfg)); } catch (e) {}
    await loadAll();
  };
  $("#cancelSetup").onclick = () => { $("#setup").hidden = true; $("#app").hidden = false; $("#controls").hidden = false; };
  $("#settingsBtn").onclick = () => showSetup("");
  $("#refresh").onclick = () => loadAll();
  $("#logoutBtn").onclick = () => {
    clearTimeout(pollTimer);
    localStorage.removeItem(LS_KEY); cfg = {}; summary = null; radarCache = {}; articlesCache = {};
    showSetup("");
  };

  // ---------- načtení ----------
  async function loadAll() {
    clearTimeout(pollTimer);
    try {
      const info = await gh(repo());
      branch = info.default_branch;
    } catch (e) { showSetup("Repozitář se nepodařilo načíst: " + e.message); return; }
    $("#setup").hidden = true; $("#app").hidden = false; $("#controls").hidden = false;
    articlesCache = {}; radarCache = {};
    await Promise.all([loadSummary(), loadWorkflow(), loadSourceConfig()]);
    if (cfg.token) pollTimer = setTimeout(loadAll, pendingSince || (latestRun && latestRun.status !== "completed") ? 15000 : 180000);
  }

  async function loadSummary() {
    try {
      summary = JSON.parse(await readFile("data/summary.json"));
    } catch (e) {
      if (e.status === 404) { summary = null; renderEmpty(); return; }
      $("#health").hidden = false;
      $("#health").innerHTML = `<p class="notice bad">Data se nepodařilo obnovit. Zobrazené údaje mohou být staré. ${esc(e.message)}</p>`;
      return;
    }
    renderHealth(); renderTiles(); renderMatrix(); renderBatches(); renderRuns(); setupArticleFilters(); renderArticles(); setupRadar(); renderSourceList();
  }

  function radarError(error) {
    if (/key limit exceeded|openrouter_key_limit/i.test(error || "")) return "AI vyčerpala limit klíče OpenRouter. Správce zvýší limit v nastavení klíče; potom stiskněte Obnovit AI výběr.";
    if (/OPENROUTER_API_KEY/.test(error || "")) return "Chybí klíč OpenRouter. Správce ho doplní do nastavení pilotu.";
    if (/HTTP 402/.test(error || "")) return "Na účtu OpenRouter chybí kredit. Po doplnění kreditu lze výběr zopakovat.";
    if (/neplatný výběr|JSON|uříznut/i.test(error || "")) return "Model nevrátil použitelný výstup. Výběr lze znovu spustit; podklady zůstávají uložené.";
    return error || "Výběr se nepodařilo vytvořit. Po kontrole nastavení jej lze zopakovat.";
  }

  function renderHealth() {
    const messages = [], last = (summary.radar || []).at(-1), batch = summary.batches.at(-1);
    const lastRun = summary.runs.at(-1);
    const today = new Intl.DateTimeFormat("sv-SE", {timeZone: "Europe/Prague"}).format(new Date());
    if (!lastRun || Date.now() - new Date(lastRun.started_at).getTime() > 7 * 3600000) messages.push(`<p class="notice warn">Sběr nemá čerstvá data${lastRun ? ` od ${fmtDT(lastRun.started_at)}` : ""}. Zkontrolujte stav běhů.</p>`);
    if (last && last.status !== "ok") messages.push(`<p class="notice bad"><b>AI výběr ${fmtDay(last.date)} potřebuje zásah.</b> ${esc(radarError(last.error))} Sběr článků pokračuje.</p>`);
    if (batch && (!last || last.date < batch.date)) messages.push(`<p class="notice warn">Dávka ${fmtDay(batch.date)} je připravená, ale zatím nemá AI výběr.</p>`);
    if (last && last.status === "ok" && last.date !== today) messages.push(`<p class="notice warn">Poslední výběr je z ${fmtDay(last.date)}. Dnešní zatím není připravený.</p>`);
    $("#health").hidden = !messages.length;
    $("#health").innerHTML = messages.join("");
    $("#dataTime").textContent = `Data obnovena ${fmtDT(summary.generated_at)} · čas v Praze`;
  }

  // ---------- výběr pro redakci ----------
  const PRIO = { "řešit dnes": 0, "dobré téma": 1, "archiv": 2 };
  let radarCache = {};
  function setupRadar() {
    const list = (summary.radar || []).slice().reverse();
    const sel = $("#radarSelect"); const prev = sel.value;
    sel.innerHTML = list.map((r) => `<option value="${r.date}">${fmtDay(r.date)} · ${r.status === "ok" ? r.items + " námětů" : "chyba"}</option>`).join("");
    if (!list.length) { sel.innerHTML = `<option value="">zatím žádný výběr</option>`; $("#radar").innerHTML = `<div class="muted">Výběr vznikne po první dávce, pokud je v repozitáři nastavený secret OPENROUTER_API_KEY.</div>`; return; }
    if (list.some((r) => r.date === prev)) sel.value = prev;
    renderRadar();
  }
  $("#radarSelect").onchange = renderRadar;
  ["#priorityFilter", "#rubricFilter", "#radarSearch"].forEach((id) => $(id).addEventListener("input", renderRadar));
  async function renderRadar() {
    const request = ++radarRequest;
    const date = $("#radarSelect").value, box = $("#radar");
    if (!date) return;
    const meta = (summary.radar || []).find((r) => r.date === date);
    if (!radarCache[date]) {
      box.innerHTML = `<div class="muted">načítám…</div>`;
      try { radarCache[date] = JSON.parse(await readFile(`data/radar/${date}.json`)); } catch (e) { if (request === radarRequest) box.innerHTML = `<div class="muted">nepodařilo se načíst: ${esc(e.message)}</div>`; return; }
    }
    if (request !== radarRequest) return;
    const r = radarCache[date];
    const head = `<div class="muted" style="margin-bottom:8px">${esc(r.model || "")} · vstup ${r.input ? r.input.articles + " článků" : ""}${r.usage ? ` · tokeny ${r.usage.prompt_tokens || "?"} / ${r.usage.completion_tokens || "?"}` : ""} · vygenerováno ${fmtDT(r.generated_at)}
      · <button class="small" data-dl="${esc(meta.markdown)}">Markdown</button> <button class="small" data-dl="${esc(meta.json)}">JSON</button></div>`;
    if (r.status !== "ok") { box.innerHTML = head + `<div class="notice bad">${esc(radarError(r.error))}</div><p class="muted">Texty pro tento den lze stáhnout v denních dávkách. Pro ukázku vyberte starší úspěšný den.</p>`; bindDownloads(); return; }
    const priority = $("#priorityFilter").value, rubric = $("#rubricFilter").value, query = $("#radarSearch").value.trim().toLocaleLowerCase("cs");
    const items = (r.namety || []).filter((n) => (!priority || n.priorita === priority) && (!rubric || n.rubrika === rubric) && (!query || [n.titulek, n.fakt, ...(n.hracky || [])].join(" ").toLocaleLowerCase("cs").includes(query))).sort((a, b) => (PRIO[(a.priorita || "").toLowerCase()] ?? 9) - (PRIO[(b.priorita || "").toLowerCase()] ?? 9));
    let h = head, current = null;
    for (const n of items) {
      const p = (n.priorita || "?").toLowerCase();
      if (p !== current) { h += `<div class="radar-group">${esc(p.charAt(0).toUpperCase() + p.slice(1))}</div>`; current = p; }
      h += `<div class="item prio-${PRIO[p] ?? 2}"><h4>${esc(n.titulek || "(bez titulku)")} <span class="badge">${esc(n.rubrika || "?")}</span></h4>
        <div class="meta">${esc(n.dolozeni || "")}${n.hracky && n.hracky.length ? " · " + esc(n.hracky.join(", ")) : ""}</div>
        <p><b>Fakt:</b> ${esc(n.fakt || "")}</p>
        <p><b>Proč pro QB:</b> ${esc(n.proc || "")}</p>
        <details class="evidence"><summary>Podklady · ${(n.zdroje || []).length} zdrojů</summary>${(n.zdroje || []).map((z) => `<p><b>Zdroj${z.id ? " [" + esc(z.id) + "]" : ""}:</b> <a class="plain" href="${esc(z.url || "#")}" target="_blank" rel="noopener">${esc(z.url || "")}</a></p>${z.uryvek ? `<blockquote>${esc(z.uryvek)}</blockquote>` : ""}`).join("")}</details>
        <p class="muted"><b>Novost vůči QB:</b> neověřena · databáze QB není připojena</p>
        <p><b>Úkol:</b> ${esc(n.ukol || "")}</p>
        ${n.rozpor ? `<p><b>Rozpor / chybí:</b> ${esc(n.rozpor)}</p>` : ""}</div>`;
    }
    if (!items.length) h += `<div class="notice">${(r.namety || []).length ? "Žádný námět neodpovídá filtrům." : "Model pro tento den nevybral žádný námět."}</div>`;
    h += `<div class="radar-foot">Zpracováno článků: ${(r.zpracovana_id || []).length}${r.necitelna && r.necitelna.length ? " · nečitelné: " + r.necitelna.map((x) => esc(x.id + " (" + (x.duvod || "") + ")")).join(", ") : ""}${r.vyrazeno ? "<br>Vyřazeno: " + esc(r.vyrazeno) : ""}</div>`;
    if (r.unaccounted_ids && r.unaccounted_ids.length) h += `<p class="notice warn">Model nepotvrdil zpracování ${r.unaccounted_ids.length} článků. Úplnost je potřeba ověřit v denní dávce.</p>`;
    box.innerHTML = h; bindDownloads();
  }
  function bindDownloads() {
    document.querySelectorAll("[data-dl]").forEach((btn) => btn.onclick = async () => {
      try {
        const txt = await readFile(btn.dataset.dl);
        const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = btn.dataset.dl.split("/").pop(); a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      } catch (e) { toast("Stažení selhalo: " + e.message, 5000); }
    });
  }

  function renderEmpty() {
    $("#health").hidden = true;
    $("#tiles").innerHTML = `<div class="tile"><b>–</b><span>zatím žádný běh: zapněte sběr a stiskněte „Spustit teď“</span></div>`;
    $("#matrix").innerHTML = ""; $("#batches").innerHTML = ""; $("#articles").innerHTML = ""; $("#runs").innerHTML = "";
  }

  async function loadWorkflow() {
    try {
      const list = await gh(`${repo()}/actions/workflows`);
      workflow = (list.workflows || []).find((w) => w.path.endsWith("/" + WORKFLOW_FILE)) || null;
    } catch (e) { workflow = null; toast("Workflow se nepodařilo načíst: " + e.message, 5000); }
    renderSwitch();
    await loadLatestRun();
  }

  async function loadLatestRun() {
    if (!workflow) return;
    try {
      const r = await gh(`${repo()}/actions/workflows/${workflow.id}/runs?per_page=1`);
      const run = (r.workflow_runs || [])[0];
      latestRun = run || null;
      if (pendingSince && run && run.event === "workflow_dispatch" && new Date(run.created_at).getTime() >= pendingSince - 3000 && run.status === "completed") pendingSince = 0;
      const hint = $("#matrixHint");
      if (run && run.status !== "completed") hint.textContent = `Právě běží úloha spuštěná ${fmtDT(run.created_at)}. Po dokončení se data obnoví automaticky.`;
      else if (run) hint.textContent = `poslední běh na GitHubu ${fmtDT(run.updated_at)} (${run.conclusion === "success" ? "úspěch" : run.conclusion})`;
    } catch (e) {}
    const busy = pendingSince || (latestRun && latestRun.status !== "completed");
    $("#retryRadar").disabled = !!busy || !workflow || workflow.state !== "active";
    $("#runNow").disabled = !!busy || !workflow || workflow.state !== "active";
  }

  function renderSwitch() {
    const sw = $("#switch"), inp = $("#switchInput"), lbl = $("#switchLabel");
    if (!workflow) { sw.classList.add("disabled"); lbl.textContent = "workflow nenalezen"; $("#runNow").disabled = true; $("#retryRadar").disabled = true; return; }
    sw.classList.remove("disabled"); $("#runNow").disabled = false;
    const on = workflow.state === "active";
    inp.checked = on; lbl.textContent = on ? "Sběr běží automaticky" : "Sběr vypnut";
    $("#runNow").disabled = !on; $("#retryRadar").disabled = !on;
  }
  $("#switchInput").onchange = async (ev) => {
    const on = ev.target.checked;
    try {
      await gh(`${repo()}/actions/workflows/${workflow.id}/${on ? "enable" : "disable"}`, { method: "PUT" });
      workflow.state = on ? "active" : "disabled_manually"; renderSwitch();
      toast(on ? "Sběr zapnut: poběží každé 3 hodiny a v 6:00." : "Sběr vypnut: plánované běhy se zastavily.");
    } catch (e) { ev.target.checked = !on; toast("Nepodařilo se přepnout: " + e.message, 5000); }
  };
  async function dispatchRun(inputs = {}) {
    if (!workflow) return;
    if (workflow.state !== "active") { toast("Nejdřív zapněte sběr, vypnutý workflow nelze spustit."); return; }
    try {
      await gh(`${repo()}/actions/workflows/${workflow.id}/dispatches`, { method: "POST", body: { ref: branch, inputs } });
      pendingSince = Date.now();
      $("#runNow").disabled = true; $("#retryRadar").disabled = true;
      toast("Běh byl zařazen na GitHubu. Výsledky se po dokončení načtou automaticky.", 6000);
      $("#matrixHint").textContent = "Běh čeká ve frontě GitHubu…";
      clearTimeout(pollTimer); pollTimer = setTimeout(loadAll, 15000);
    } catch (e) { toast("Spuštění selhalo: " + e.message, 5000); }
  }
  $("#runNow").onclick = () => dispatchRun();
  $("#retryRadar").onclick = () => {
    const day = $("#radarSelect").value || (summary && summary.batches.at(-1)?.date);
    if (day) dispatchRun({radar_date: day, radar_force: "true"});
  };

  // ---------- společná správa zdrojů ----------
  let sourceDocument = null, sourceSha = null;
  const sourceFields = {name: "sourceName", url: "sourceUrl", lang: "sourceLang", type: "sourceType", region: "sourceRegion", note: "sourceNote", feed: "sourceFeed", listing: "sourceListing", filter: "sourceFilter"};

  async function loadSourceConfig() {
    try {
      const file = await gh(`${repo()}/contents/sources.json?ref=${encodeURIComponent(branch)}`);
      sourceDocument = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(file.content.replace(/\s/g, "")), (c) => c.charCodeAt(0))));
      sourceSha = file.sha;
      renderSourceList();
    } catch (e) { $("#sourceList").textContent = "Seznam zdrojů se nepodařilo načíst: " + e.message; }
  }

  function renderSourceList() {
    if (!sourceDocument) return;
    $("#sourceList").innerHTML = sourceDocument.sources.map((s) => {
      const last = summary?.sources.find((item) => item.id === s.id)?.last;
      const state = s.enabled === false ? "pozastaveno" : !last || (s.updated_at && s.updated_at > last.at) ? "čeká na ověření" : statusLabel(last.status);
      return `<div class="source-row"><div class="source-info"><b>${esc(s.name)}</b><small>${esc(s.url)} · ${esc(s.lang)} · ${esc(s.type)}</small></div><span class="badge">${esc(state)}</span><button class="small" data-edit-source="${s.id}">Upravit</button></div>`;
    }).join("");
    document.querySelectorAll("[data-edit-source]").forEach((btn) => btn.onclick = () => editSource(+btn.dataset.editSource));
  }

  function editSource(id = null) {
    const source = id == null ? {} : sourceDocument.sources.find((s) => s.id === id);
    if (!source) return;
    // Během editace držíme původní SHA; souběžná změna vyvolá konflikt, nikoli přepsání.
    $("#sourceForm").dataset.sha = sourceSha;
    $("#sourceId").value = id == null ? "" : id;
    $("#sourceFormTitle").textContent = id == null ? "Nový zdroj" : "Upravit zdroj";
    for (const [key, field] of Object.entries(sourceFields)) $("#" + field).value = key === "feed" ? source.feeds?.[0]?.url || "" : source[key] || ({lang:"en", type:"médium"}[key] || "");
    $("#sourceEnabled").checked = source.enabled !== false;
    $("#sourceError").textContent = ""; $("#sourceForm").hidden = false;
    $("#sourceForm").scrollIntoView({behavior:"smooth", block:"center"}); $("#sourceName").focus({preventScroll:true});
  }
  $("#addSource").onclick = () => { if (sourceDocument) editSource(); };
  $("#cancelSource").onclick = () => { $("#sourceForm").hidden = true; };
  $("#sourceForm").onsubmit = async (event) => {
    event.preventDefault();
    const button = $("#saveSource"); button.disabled = true; $("#sourceError").textContent = "";
    try {
      const values = Object.fromEntries(Object.entries(sourceFields).map(([key, field]) => [key, $("#" + field).value]));
      values.enabled = $("#sourceEnabled").checked;
      const id = $("#sourceId").value ? +$("#sourceId").value : null;
      if ($("#sourceForm").dataset.sha !== sourceSha) throw new Error("Seznam mezitím upravil někdo další. Zavřete formulář a otevřete zdroj znovu, ať zkontrolujete aktuální hodnoty.");
      const updated = window.QBSourceConfig.updateDocument(sourceDocument, values, id);
      await gh(`${repo()}/contents/sources.json`, {method:"PUT", body:{message: id == null ? "Add editorial source" : "Update editorial source", content: window.QBSourceConfig.encodeDocument(updated), sha: $("#sourceForm").dataset.sha, branch}});
      $("#sourceForm").hidden = true;
      await loadSourceConfig();
      toast("Zdroj uložen pro celou redakci. Ověří se při dalším sběru; můžete ho spustit hned.", 7000);
    } catch (e) {
      $("#sourceError").textContent = e.status === 409 || e.status === 422 ? "Seznam mezitím upravil někdo další. Obnovte data a otevřete formulář znovu." : e.status === 403 ? "Token nemá oprávnění Contents: write pro správu zdrojů." : e.message;
    } finally { button.disabled = false; }
  };

  // ---------- vykreslení ----------
  function srcState(s) {
    if (s.enabled === false) return "none";
    if (!s.last) return "none";
    if (s.last.status === "ok") return s.last.new > 0 || s.total_articles > 0 ? "ok" : "warn";
    if (s.last.status === "empty") return "warn";
    return "bad";
  }

  function renderTiles() {
    const srcs = summary.sources, today = summary.days[0];
    const ok = srcs.filter((s) => srcState(s) === "ok").length, bad = srcs.filter((s) => srcState(s) === "bad").length;
    const todayNew = srcs.reduce((a, s) => a + ((s.days[today] || {}).new || 0), 0);
    const lastBatch = summary.batches[summary.batches.length - 1];
    const lastRun = summary.runs[summary.runs.length - 1];
    $("#tiles").innerHTML = [
      [ok + " / " + srcs.filter((s) => s.enabled !== false).length, "funkčních kanálů sběru"],
      [bad, "zdrojů s chybou"],
      [todayNew, "nových článků dnes"],
      [summary.totals.articles, "článků celkem (14 dní)"],
      [lastBatch ? `${lastBatch.articles}` : "–", lastBatch ? `v dávce ${fmtDay(lastBatch.date)}` : "dávka zatím není"],
      [lastRun ? fmtDT(lastRun.started_at) : "–", "poslední sběr"],
    ].map(([b, s]) => `<div class="tile"><b>${esc(b)}</b><span>${esc(s)}</span></div>`).join("");
  }

  function cellClass(n) { return n === 0 ? "c0" : n < 3 ? "c1" : n < 8 ? "c2" : n < 20 ? "c3" : "c4"; }

  function renderMatrix() {
    const days = summary.days.slice(0, 7).reverse();
    let h = `<thead><tr><th>Zdroj</th><th>Kanál</th><th>Poslední běh</th>${days.map((d) => `<th class="num">${weekday(d)}<br>${fmtDay(d)}</th>`).join("")}<th class="num">Σ</th></tr></thead><tbody>`;
    for (const s of summary.sources) {
      const st = srcState(s);
      const ch = s.channel.type ? CHANNEL[s.channel.type] || s.channel.type : "–";
      const last = s.enabled === false ? "pozastaveno" : s.last ? statusLabel(s.last.status) + (s.last.error && s.last.status !== "ok" && statusLabel(s.last.error) !== statusLabel(s.last.status) ? ` · ${statusLabel(s.last.error)}` : "") : "zatím neběželo";
      h += `<tr class="src" data-id="${s.id}"><td class="name"><span class="dot ${st}"></span>${esc(s.name)}<small>${esc(s.type)} · ${esc(s.lang)}</small></td>`;
      h += `<td><span class="badge">${esc(ch)}</span></td><td class="${st === "bad" ? "" : "muted"}">${esc(last)}</td>`;
      for (const d of days) {
        const c = s.days[d];
        const n = c ? c.new : 0;
        const title = c ? `${c.new} nových, ${c.with_text} s textem, ${c.with_date} s datem, ${c.fresh24} vydaných do 24 h před nalezením${c.failed ? ", " + c.failed + " selhalo" : ""}` : "nic";
        h += `<td class="cell ${cellClass(n)}" title="${esc(title)}">${n || ""}</td>`;
      }
      h += `<td class="cell num"><b>${s.total_articles}</b></td></tr>`;
    }
    $("#matrix").innerHTML = h + "</tbody>";
    document.querySelectorAll("tr.src").forEach((tr) => tr.onclick = () => openSource(+tr.dataset.id));
  }

  function openSource(id) {
    const s = summary.sources.find((x) => x.id === id);
    const ch = s.channel;
    const tried = (ch.tried || []).map((t) => t.kind === "note" ? `<li class="muted">${esc(t.note)}</li>` :
      `<li><span class="badge">${esc(t.kind)}${t.origin ? " · " + esc(t.origin) : ""}</span> ${esc(t.url)} → <b>${esc(statusLabel(t.status))}</b>${t.items != null ? `, položek ${t.items}` : ""}${t.fresh != null ? `, čerstvých ${t.fresh}` : ""}${t.matching != null ? `, odpovídá filtru ${t.matching} z ${t.links}` : ""}</li>`).join("");
    const days = Object.entries(s.days).sort((a, b) => b[0].localeCompare(a[0])).map(([d, c]) => `<tr><td>${fmtDay(d)}</td><td class="num">${c.new}</td><td class="num">${c.with_text}</td><td class="num">${c.with_date}</td><td class="num">${c.fresh24}</td><td class="num">${c.failed}</td></tr>`).join("");
    $("#modalBox").innerHTML = `<button class="close small" id="modalClose">Zavřít</button><h3>${esc(s.name)}</h3>
      <div class="muted">${[s.type, s.region, s.lang].filter(Boolean).map(esc).join(" · ")} · <a class="plain" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.url)}</a></div>
      ${s.note ? `<p class="muted">${esc(s.note)}</p>` : ""}
      <dl>
        <dt>Kanál</dt><dd>${esc(CHANNEL[ch.type] || ch.type || "nenalezen")}${ch.origin ? ` (${esc(ch.origin)})` : ""}${ch.reason ? `, důvod: ${esc(statusLabel(ch.reason))}` : ""}</dd>
        <dt>Adresa kanálu</dt><dd>${ch.url ? `<a class="plain" href="${esc(ch.url)}" target="_blank" rel="noopener">${esc(ch.url)}</a>` : "–"}${ch.urls && ch.urls.length > 1 ? ` (+${ch.urls.length - 1})` : ""}</dd>
        <dt>Filtr</dt><dd>${ch.filter ? `<code>${esc(ch.filter)}</code>` : "žádný"}</dd>
        <dt>Hloubka feedu</dt><dd>${ch.feed_items != null ? `${ch.feed_items} položek, ${ch.feed_dated} s datem` : "–"}</dd>
        <dt>Vstupní stránka</dt><dd>${ch.landing ? `${esc(statusLabel(ch.landing.status))} (${ch.landing.elapsed} s)` : "–"}</dd>
        <dt>Kanál nalezen</dt><dd>${fmtDT(ch.discovered_at)}</dd>
        <dt>Poslední běh</dt><dd>${s.last ? `${fmtDT(s.last.at)}: ${esc(statusLabel(s.last.status))}${s.last.error ? ", " + esc(s.last.error) : ""}, položek ${s.last.items ?? "–"}, po filtru ${s.last.matching ?? "–"}, nových ${s.last.new ?? "–"}, s textem ${s.last.fetched_ok ?? "–"}` : "zatím neběželo"}</dd>
        <dt>Neúspěchy v řadě</dt><dd>${s.consecutive_failures}</dd>
      </dl>
      <h4 style="margin:14px 0 6px">Po dnech</h4>
      <table><thead><tr><th>Den</th><th class="num">nových</th><th class="num">s textem</th><th class="num">s datem</th><th class="num">do 24 h</th><th class="num">selhalo</th></tr></thead><tbody>${days || `<tr><td colspan="6" class="muted">zatím nic</td></tr>`}</tbody></table>
      <h4 style="margin:14px 0 6px">Co se zkoušelo při hledání kanálu</h4>
      <ul style="padding-left:18px;font-size:13.5px">${tried || "<li class='muted'>nic</li>"}</ul>`;
    $("#modal").classList.add("open");
    $("#modalClose").onclick = closeModal;
  }
  function closeModal() { $("#modal").classList.remove("open"); }
  $("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

  function renderBatches() {
    const b = summary.batches.slice().reverse();
    if (!b.length) { $("#batches").innerHTML = `<tr><td class="muted">Dávka se sestaví při prvním běhu po 6:00 ráno (nebo ručně: <code>python -m collector.batch --force</code>).</td></tr>`; return; }
    $("#batches").innerHTML = `<thead><tr><th>Den</th><th class="num">článků</th><th class="num">jen datum bez času</th><th class="num">bez data</th><th>sestaveno</th><th></th></tr></thead><tbody>` +
      b.map((x) => `<tr><td>${fmtDay(x.date)}</td><td class="num">${x.articles}</td><td class="num">${x.date_only}</td><td class="num">${x.undated}</td><td class="muted">${fmtDT(x.generated_at)}</td>
        <td><button class="small" data-dl="${esc(x.markdown)}">Markdown</button> <button class="small" data-dl="${esc(x.json)}">JSON</button></td></tr>`).join("") + "</tbody>";
    bindDownloads();
  }

  function renderRuns() {
    const runs = summary.runs.slice().reverse().slice(0, 16);
    $("#runs").innerHTML = `<thead><tr><th>Start</th><th>Spuštění</th><th class="num">trvání</th><th class="num">nových článků</th><th class="num">zdrojů OK</th><th class="num">s chybou</th></tr></thead><tbody>` +
      runs.map((r) => `<tr><td>${fmtDT(r.started_at)}</td><td class="muted">${esc(r.trigger === "schedule" ? "plán" : r.trigger === "workflow_dispatch" ? "ručně" : r.trigger)}</td><td class="num">${r.duration_s} s</td><td class="num">${r.new}</td><td class="num">${r.sources_ok}</td><td class="num">${r.sources_failed}</td></tr>`).join("") + "</tbody>";
  }

  function setupArticleFilters() {
    const days = Object.keys(summary.articles_index).sort().reverse();
    const ds = $("#daySelect"); const prev = ds.value;
    ds.innerHTML = days.map((d) => `<option value="${d}">${fmtDay(d)} (${summary.articles_index[d]})</option>`).join("") || `<option value="">zatím žádné články</option>`;
    if (days.includes(prev)) ds.value = prev;
    const ss = $("#sourceSelect"); const prevS = ss.value;
    ss.innerHTML = `<option value="">všechny zdroje</option>` + summary.sources.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join("");
    ss.value = prevS;
  }
  ["#daySelect", "#sourceSelect", "#statusSelect"].forEach((id) => $(id).onchange = renderArticles);

  async function renderArticles() {
    const request = ++articleRequest;
    const day = $("#daySelect").value, src = $("#sourceSelect").value, st = $("#statusSelect").value;
    const tbl = $("#articles");
    if (!day) { tbl.innerHTML = ""; return; }
    if (!articlesCache[day]) {
      tbl.innerHTML = `<tr><td class="muted">načítám…</td></tr>`;
      try { articlesCache[day] = JSON.parse(await readFile(`data/articles/${day}.json`)); } catch (e) { tbl.innerHTML = `<tr><td class="muted">nepodařilo se načíst: ${esc(e.message)}</td></tr>`; return; }
    }
    if (request !== articleRequest) return;
    let arts = articlesCache[day].slice().sort((a, b) => b.discovered_at.localeCompare(a.discovered_at));
    if (src) arts = arts.filter((a) => String(a.source_id) === src);
    if (st === "nodate") arts = arts.filter((a) => !a.published_at); else if (st) arts = arts.filter((a) => a.status === st);
    tbl.innerHTML = `<thead><tr><th>Nalezeno</th><th>Zdroj</th><th>Titulek</th><th>Vydáno</th><th class="num">zpoždění</th><th class="num">znaků</th><th>Stav</th></tr></thead><tbody>` +
      arts.map((a, i) => `<tr class="art" data-i="${i}"><td class="muted">${fmtDT(a.discovered_at)}</td><td>${esc(a.source_name)}</td>
        <td class="t"><a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.title || a.url)}</a>${a.text ? ` <button class="small" data-show="${i}">text</button>` : ""}<div id="txt-${i}"></div></td>
        <td>${fmtPub(a)}</td>
        <td class="num" ${a.precision === "day" ? 'title="jen přibližně, zdroj uvádí jen den"' : ""}>${a.lag_hours != null ? (a.precision === "day" ? "≈ " : "") + a.lag_hours + " h" : "–"}</td><td class="num">${a.text_chars || 0}</td>
        <td><span class="dot ${a.status === "ok" ? "ok" : a.status === "no_text" ? "warn" : "bad"}"></span>${esc(ART_STATUS[a.status] || a.status)}${a.error ? ` <span class="muted">${esc(a.error)}</span>` : ""}</td></tr>`).join("") + "</tbody>";
    if (!arts.length) tbl.innerHTML += `<tr><td class="muted">nic neodpovídá filtru</td></tr>`;
    document.querySelectorAll("[data-show]").forEach((btn) => btn.onclick = () => {
      const i = +btn.dataset.show, box = $(`#txt-${i}`);
      if (box.innerHTML) { box.innerHTML = ""; btn.textContent = "text"; return; }
      box.innerHTML = `<pre class="text">${esc(arts[i].text)}</pre>`; btn.textContent = "skrýt";
    });
  }

  // ---------- start ----------
  if (cfg.repo && cfg.token) loadAll(); else showSetup("");
})();
