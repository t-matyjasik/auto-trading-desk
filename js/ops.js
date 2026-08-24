/**
 * Auto Trading — prosty one-pager
 * Equity / PnL / win% / pozycje otwarte. Zero fake PnL. Publikacja OFF.
 */
(function () {
  "use strict";
  const $ = (s) => document.querySelector(s);

  const state = {
    status: null,
    research: [],
    orders: [],
    activity: [],
    summary: "",
    mode: "static",
  };

  function fmtMoney(n) {
    const v = Number(n);
    if (Number.isNaN(v)) return "—";
    return (
      v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
      " USD"
    );
  }

  function fmtPct(n) {
    const v = Number(n);
    if (Number.isNaN(v)) return "—";
    return (v >= 0 ? "+" : "") + v.toFixed(2) + "%";
  }

  function fmtTime(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("pl-PL", {
      timeZone: "Europe/Warsaw",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function statusBadge(status) {
    const s = String(status || "—");
    const u = s.toUpperCase();
    let cls = "badge";
    if (u.includes("BLOCK")) cls += " blocked";
    else if (u.includes("OPEN") || u === "FILLED") cls += " open";
    else if (u.includes("WAIT") || u.includes("PEND") || u.includes("STANDBY")) cls += " wait";
    return '<span class="' + cls + '">' + escapeHtml(s) + "</span>";
  }

  function setPillText(el, text) {
    if (!el) return;
    const span = el.querySelector(".pill-text");
    if (span) span.textContent = text;
    else el.textContent = text;
  }

  async function tryFetch(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("json")) return res.json();
    return res.text();
  }

  function defaultStatus() {
    return {
      project: "Auto Trading",
      desk: "Auto Trading",
      phase: { label: "—", live_orders: false, note: "" },
      okx: { label: "—", executor: "—", live_trading: false },
      paper: {
        start_usd: 1000,
        equity_usd: 1000,
        pnl_usd: 0,
        pnl_pct: 0,
        note: "",
      },
      performance: {
        open_positions: [],
        closed_trades: 0,
        wins: 0,
        losses: 0,
        win_rate_pct: null,
        realized_pnl_usd: 0,
        unrealized_pnl_usd: 0,
      },
      agents: [],
    };
  }

  function perf(s) {
    return (
      s.performance || {
        open_positions: [],
        closed_trades: 0,
        wins: 0,
        losses: 0,
        win_rate_pct: null,
        realized_pnl_usd: Number(s.paper?.pnl_usd || 0),
        unrealized_pnl_usd: 0,
      }
    );
  }

  async function loadAll() {
    try {
      state.status = await tryFetch("./data/status.json");
    } catch (_) {
      state.status = defaultStatus();
    }

    try {
      const api = await tryFetch("/api/files");
      state.research = api.research || [];
      state.orders = api.orders || [];
      state.activity = api.activity || [];
      state.mode = "api";
    } catch (_) {
      try {
        const f = await tryFetch("./data/files.json");
        state.research = f.research || [];
        state.orders = f.orders || [];
        state.activity = f.activity || [];
        state.mode = "static";
      } catch (__) {
        state.research = [];
        state.orders = [];
        state.activity = [];
        state.mode = "file";
      }
    }
    // activity.json fallback merge
    if (!state.activity.length) {
      try {
        const act = await tryFetch("./data/activity.json");
        state.activity = act.items || [];
      } catch (_) {}
    }

    try {
      state.summary = await tryFetch("./data/daily_summary.md");
    } catch (_) {
      state.summary = "(brak daily_summary.md)";
    }

    render();
  }


  function fmtFunding(v) {
    if (v == null || v === "") return null;
    const n = Number(v);
    if (Number.isNaN(n)) return String(v);
    // OKX funding often as fraction (0.0001 = 0.01%)
    const pct = Math.abs(n) < 0.01 ? n * 100 : n;
    return (pct >= 0 ? "+" : "") + pct.toFixed(2) + "%";
  }

  function setStrategyTone(el, status) {
    if (!el) return;
    el.classList.remove("tone-on", "tone-off", "tone-watch", "tone-trend");
    const u = String(status || "").toUpperCase();
    if (u.includes("BLOCK") || u.includes("GATE")) el.classList.add("tone-block");
    else if (u.includes("ON_WATCH") || u.includes("WATCH")) el.classList.add("tone-watch");
    else if (u === "TREND" || u.includes("ACTIVE") || (u === "ON")) el.classList.add("tone-on");
    else if (u.includes("OFF") || u.includes("UNKNOWN") || u.includes("STANDBY")) el.classList.add("tone-off");
    else if (u.includes("TREND")) el.classList.add("tone-trend");
  }

  function renderStrategy(s) {
    const st = s.strategy || null;
    const nameEl = $("#strategy-name");
    if (!nameEl) return;
    if (!st) {
      nameEl.textContent = "—";
      $("#chip-strategy-status").textContent = "OFF";
      $("#strategy-regime").textContent = "—";
      $("#strategy-funding").textContent = "—";
      $("#strategy-tc").textContent = "—";
      $("#strategy-mr").textContent = "—";
      $("#strategy-note").textContent = "";
      return;
    }
    nameEl.textContent = st.name || "TC-PULL + MR-FADE";
    const chip = $("#chip-strategy-status");
    chip.textContent = st.status || "STANDBY";
    setStrategyTone(chip, st.status);

    const regime = st.regime || {};
    const funding = st.funding || {};
    const setup = st.setup || {};
    const tc = setup.tc_pull || {};
    const mr = setup.mr_fade || {};

    const regimeEl = $("#strategy-regime");
    regimeEl.textContent = regime.label || "UNKNOWN";
    setStrategyTone(regimeEl, regime.label);
    $("#strategy-regime-hint").textContent =
      (regime.bias ? "bias " + regime.bias : "") +
      (regime.detail ? (regime.bias ? " · " : "") + regime.detail : "") ||
      regime.source ||
      "brak danych";

    const fundPct = fmtFunding(funding.value);
    const fundEl = $("#strategy-funding");
    fundEl.textContent = fundPct
      ? (funding.label || "OK") + " · " + fundPct
      : funding.label || "UNKNOWN";
    setStrategyTone(fundEl, funding.label === "OK" ? "ON" : funding.label);
    $("#strategy-funding-hint").textContent =
      funding.detail || funding.source || "brak danych";

    const tcEl = $("#strategy-tc");
    tcEl.textContent = tc.status || "STANDBY";
    setStrategyTone(tcEl, tc.status);
    $("#strategy-tc-hint").textContent =
      [tc.signal, tc.detail].filter(Boolean).join(" · ") || "—";

    const mrEl = $("#strategy-mr");
    mrEl.textContent = mr.status || "STANDBY";
    setStrategyTone(mrEl, mr.status);
    $("#strategy-mr-hint").textContent =
      [mr.signal, mr.detail].filter(Boolean).join(" · ") || "—";

    $("#strategy-note").textContent = st.note || "";

    const news = st.news_gate || {};
    const zones = st.pullback_zones || {};
    const fit = st.live_fit || {};
    const newsEl = $("#strategy-news");
    if (newsEl) {
      const until = news.until ? " do " + String(news.until).replace("T", " ").slice(0, 16) : "";
      newsEl.textContent = (news.label || "—") + until;
      setStrategyTone(newsEl, news.label || "");
    }
    const zEl = $("#strategy-zones");
    if (zEl) {
      const parts = ["BTC", "ETH", "SOL"]
        .map((k) => (zones[k] ? k + " " + zones[k] : null))
        .filter(Boolean);
      zEl.textContent = parts.length ? parts.join(" · ") : "—";
    }
    const fEl = $("#strategy-livefit");
    if (fEl) {
      const parts = ["BTC", "ETH", "SOL"]
        .map((k) => (fit[k] ? k + ":" + fit[k] : null))
        .filter(Boolean);
      fEl.textContent = parts.length ? parts.join(" · ") : "—";
    }
  }

  function render() {
    const s = state.status || defaultStatus();
    const p = perf(s);
    const open = Array.isArray(p.open_positions) ? p.open_positions : [];
    const equity = Number(s.paper?.equity_usd ?? 1000);
    const start = Number(s.paper?.start_usd ?? 1000);
    const pnl = Number(
      s.paper?.pnl_usd ?? Number(p.realized_pnl_usd || 0) + Number(p.unrealized_pnl_usd || 0)
    );
    const pnlPct = Number(s.paper?.pnl_pct ?? (start ? (pnl / start) * 100 : 0));
    const wins = Number(p.wins || 0);
    const losses = Number(p.losses || 0);
    const closed = Number(p.closed_trades || wins + losses);
    const winRate =
      p.win_rate_pct == null
        ? closed > 0
          ? (wins / closed) * 100
          : null
        : Number(p.win_rate_pct);

    $("#brand-sub").textContent = "OKX · lokalnie · publikacja OFF";
    renderStrategy(s);
    setPillText($("#chip-phase"), s.phase?.label || "—");
    setPillText($("#chip-okx"), s.okx?.label || s.okx?.mode || "OKX");
    $("#chip-updated").textContent = fmtTime(s.updated_at);
    $("#chip-live-lock").textContent =
      "live: " + (s.phase?.live_orders || s.okx?.live_trading ? "ON" : "OFF");

    $("#kpi-equity").textContent = fmtMoney(equity);
    $("#kpi-equity-hint").textContent = "start " + fmtMoney(start);

    const pnlEl = $("#kpi-pnl");
    pnlEl.textContent =
      (pnl >= 0 ? "+" : "") + fmtMoney(pnl).replace(" USD", "") + " · " + fmtPct(pnlPct);
    pnlEl.className = "kpi-value " + (pnl > 0 ? "pos" : pnl < 0 ? "neg" : "");
    $("#kpi-pnl-hint").textContent =
      "realized " +
      fmtMoney(p.realized_pnl_usd) +
      " · uPnL " +
      fmtMoney(p.unrealized_pnl_usd);

    const winEl = $("#kpi-win");
    if (winRate == null || closed === 0) {
      winEl.textContent = "—";
      winEl.className = "kpi-value";
      $("#kpi-win-hint").textContent = "brak zamkniętych trade’ów";
    } else {
      winEl.textContent = winRate.toFixed(1) + "%";
      winEl.className = "kpi-value " + (winRate >= 50 ? "pos" : "neg");
      $("#kpi-win-hint").textContent = wins + "W / " + losses + "L · " + closed + " closed";
    }

    $("#kpi-open").textContent = String(open.length);
    $("#kpi-open-hint").textContent = s.phase?.live_orders
      ? "live orders ON"
      : "live orders OFF · waiting funds";
    $("#chip-open-count").textContent = String(open.length);

    const tb = $("#tbody-open");
    if (!open.length) {
      tb.innerHTML =
        '<tr class="empty-row"><td colspan="8">Brak otwartych pozycji · waiting funds / zero fillów</td></tr>';
    } else {
      tb.innerHTML = open
        .map((o) => {
          const upnl = Number(o.upnl_usd || 0);
          return (
            "<tr>" +
            "<td class=\"mono\">" +
            escapeHtml(o.instId || o.symbol || "—") +
            "</td>" +
            "<td>" +
            escapeHtml(o.side || "—") +
            "</td>" +
            "<td class=\"mono\">" +
            escapeHtml(String(o.size ?? "—")) +
            "</td>" +
            "<td class=\"mono\">" +
            escapeHtml(String(o.entry ?? "—")) +
            "</td>" +
            "<td class=\"mono\">" +
            escapeHtml(String(o.mark ?? "—")) +
            "</td>" +
            "<td class=\"" +
            (upnl > 0 ? "pos" : upnl < 0 ? "neg" : "") +
            " mono\">" +
            escapeHtml(fmtMoney(upnl)) +
            "</td>" +
            "<td class=\"mono\">" +
            escapeHtml((o.sl ?? "—") + " / " + (o.tp ?? "—")) +
            "</td>" +
            "<td>" +
            statusBadge(o.status || "OPEN") +
            "</td>" +
            "</tr>"
          );
        })
        .join("");
    }

    $("#stat-realized").textContent = fmtMoney(p.realized_pnl_usd);
    $("#stat-unrealized").textContent = fmtMoney(p.unrealized_pnl_usd);
    $("#stat-closed").textContent = String(closed);
    $("#stat-wl").textContent = wins + "W / " + losses + "L";
    $("#stat-start").textContent = fmtMoney(start);
    $("#stat-note").textContent = s.paper?.note || s.phase?.note || "—";

    $("#sys-phase").textContent = s.phase?.label || "—";
    $("#sys-okx").textContent = s.okx?.label || s.okx?.mode || "—";
    $("#sys-executor").textContent = s.okx?.executor || "—";
    $("#sys-live").textContent = s.okx?.live_trading ? "tak" : "nie";

    const agents = s.agents || [];
    $("#agents").innerHTML = agents
      .map((a) => {
        const st = String(a.status || "").toUpperCase();
        let cls = "off";
        if (st === "ACTIVE" || st === "ONLINE") cls = "on";
        else if (st.includes("WAIT") || st.includes("WARN")) cls = "wait";
        return (
          '<span class="agent ' +
          cls +
          '">' +
          escapeHtml(a.name || a.id) +
          " · " +
          escapeHtml(st) +
          "</span>"
        );
      })
      .join("");

    // Feed decyzji
    const feed = $("#activity-feed");
    const acts = state.activity || [];
    $("#chip-activity-count").textContent = String(acts.length);
    if (feed) {
      if (!acts.length) {
        feed.innerHTML = '<div class="empty">Brak decyzji Orkiestratora</div>';
      } else {
        feed.innerHTML = acts
          .slice(0, 40)
          .map((a) => {
            const action = String(a.action || "NOTE").toUpperCase();
            const ctx = a.context
              ? Object.entries(a.context)
                  .map(([k, v]) => k + "=" + v)
                  .join(" · ")
              : "";
            return (
              '<div class="feed-item">' +
              '<div class="feed-top">' +
              '<span class="feed-actor">' +
              escapeHtml(a.actor || "Orkiestrator") +
              "</span>" +
              statusBadge(action) +
              (a.reason_code
                ? '<span class="badge">' + escapeHtml(a.reason_code) + "</span>"
                : "") +
              (a.instrument
                ? '<span class="mono">' + escapeHtml(a.instrument) + "</span>"
                : "") +
              '<span class="feed-time">' +
              escapeHtml(fmtTime(a.ts) || String(a.ts || "—")) +
              "</span></div>" +
              '<div class="feed-reason">' +
              escapeHtml(a.reason || "—") +
              "</div>" +
              (ctx ? '<div class="feed-context">' + escapeHtml(ctx) + "</div>" : "") +
              "</div>"
            );
          })
          .join("");
      }
    }

    $("#chip-orders-count").textContent = String(state.orders.length);
    const ot = $("#tbody-orders");
    if (!state.orders.length) {
      ot.innerHTML = '<tr class="empty-row"><td colspan="8">Brak logów zleceń</td></tr>';
    } else {
      ot.innerHTML = state.orders
        .map((o) => {
          const action = o.action || (String(o.status || "").toUpperCase().includes("BLOCK") ? "skipped" : "—");
          return (
            "<tr>" +
            '<td class="mono">' +
            escapeHtml(fmtTime(o.mtime) || "—") +
            "</td>" +
            "<td>" +
            statusBadge(String(action).toUpperCase()) +
            "</td>" +
            '<td class="mono">' +
            escapeHtml(o.instId || "—") +
            "</td>" +
            "<td>" +
            escapeHtml(o.side || "—") +
            "</td>" +
            "<td>" +
            statusBadge(o.status || "—") +
            "</td>" +
            '<td class="wrap">' +
            escapeHtml(o.teza || o.comment_pl || "—") +
            "</td>" +
            '<td class="wrap">' +
            escapeHtml(o.risk || "—") +
            "</td>" +
            '<td class="wrap">' +
            escapeHtml(o.invalidacja || "—") +
            "</td>" +
            "</tr>"
          );
        })
        .join("");
    }

    $("#chip-research-count").textContent = String(state.research.length);
    const rl = $("#list-research");
    if (!state.research.length) {
      rl.innerHTML = '<li class="empty">Brak research</li>';
    } else {
      rl.innerHTML = state.research
        .slice()
        .reverse()
        .map((r) => {
          const title = r.title || r.name || r.path || "brief";
          return (
            "<li><strong>" +
            escapeHtml(title) +
            '</strong><span class="meta">' +
            escapeHtml((r.kind || "") + " · " + fmtTime(r.mtime)) +
            "</span></li>"
          );
        })
        .join("");
    }

    $("#daily-summary").textContent = state.summary || "";
    $("#foot-mode").textContent = "źródło: " + state.mode + " · refresh ~12s";
  }

  async function boot() {
    $("#btn-refresh")?.addEventListener("click", () => loadAll());
    await loadAll();
    setInterval(loadAll, 12000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
