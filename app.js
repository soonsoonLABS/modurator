// ===== 모두레이터 프론트엔드 =====
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// API 베이스: GitHub Pages 등 외부 호스팅이면 원격 백엔드, 로컬이면 상대경로.
const API_BASE =
  location.hostname.endsWith("github.io")
    ? "https://modu.soonsoon.ai"
    : "";
// 모든 API 호출은 이 헬퍼를 통해 (API_BASE 자동 적용)
const api = (path, opts) => fetch(API_BASE + path, opts);

// GA4 이벤트 (firebase.js가 window.gaTrack 노출; 없으면 무시)
const ga = (name, params) => { try { if (window.gaTrack) window.gaTrack(name, params); } catch {} };

// 플랫폼 자체 사용 이벤트 로깅 (자체 인기 랭킹용) — 실패해도 무시
function track(eventType, solutionId, saiCategory) {
  try {
    api("/api/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: eventType, solution_id: solutionId || null, sai_category: saiCategory || null }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

// 세션 ID (검색 묶음 추적 — 재검색=불만족 추론용)
const SESSION_ID = (() => {
  let s = sessionStorage.getItem("modu_sid");
  if (!s) { s = "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); sessionStorage.setItem("modu_sid", s); }
  return s;
})();

// 답변 피드백 (좋아요/싫어요)
function sendFeedback(query, rating) {
  try {
    api("/api/feedback", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: SESSION_ID, query, rating }), keepalive: true,
    }).catch(() => {});
  } catch {}
}

const TIER_LABEL = {
  strong: "검증됨",
  usable: "추천",
  unverified: "등록설명 기준",
  review: "비교 후보",
  weak: "비교 후보",
};
const RATING_LABELS = [
  ["accuracy", "설명과 실제가 동일해요"],
  ["homepage", "홈페이지가 설명이 충분해요"],
  ["pricing", "과금 체계가 이해하기 편해요"],
  ["usefulness", "실제로 도움이 됐어요"],
  ["onboarding", "시작하기 쉬워요"],
];

function esc(t) {
  return (t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function attr(t) {
  return esc(t).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function fmt(t) {
  return esc(t).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}
function num(n) {
  return Number(n || 0).toLocaleString();
}
function pct(part, whole) {
  if (!whole) return "0%";
  return Math.round((Number(part || 0) / Number(whole)) * 100) + "%";
}
function ratingValue(v) {
  const n = Number(v || 0);
  return n ? n.toFixed(1) : "";
}
function ratingMeta(summary) {
  if (!summary || !summary.overall_avg) return "";
  return `<span class="rating-meta" id="modalRatingMeta">★ ${ratingValue(summary.overall_avg)} (${num(summary.total_votes || 0)})</span>`;
}
function ratingSection(d) {
  const summary = d.ratings_summary || {};
  const current = summary.overall_avg
    ? `<div class="rating-current" id="ratingCurrent">현재 평균 <b>★ ${ratingValue(summary.overall_avg)}</b><span>${num(summary.total_votes || 0)}명 평가</span></div>`
    : `<div class="rating-current empty" id="ratingCurrent">아직 항목별 평가가 없어요</div>`;
  const rows = RATING_LABELS.map(([key, label]) => {
    const avg = summary[key]?.avg ? `평균 ${ratingValue(summary[key].avg)}` : "";
    const stars = [1, 2, 3, 4, 5]
      .map((score) => `<button type="button" data-score="${score}" aria-label="${attr(label)} ${score}점">★</button>`)
      .join("");
    return `<div class="rating-row">
      <div class="rating-label"><span>${esc(label)}</span>${avg ? `<em>${esc(avg)}</em>` : ""}</div>
      <div class="rating-stars" data-criterion="${key}">${stars}</div>
    </div>`;
  }).join("");
  return `<div class="modal-sec rating-panel" id="ratingPanel">
    <h4>이 솔루션 평가하기</h4>
    ${current}
    <div class="rating-grid">${rows}</div>
    <div class="rating-actions">
      <button class="btn-ghost rating-submit" id="ratingSubmit" type="button">평가 제출</button>
      <span class="rating-status" id="ratingStatus"></span>
    </div>
  </div>`;
}

// ---------- 뷰 라우팅 ----------
function go(view) {
  $$(".view").forEach((v) => v.classList.remove("active"));
  $("#view-" + view).classList.add("active");
  $$(".nav-link").forEach((n) => n.classList.toggle("active", n.dataset.go === view));
  // 채팅 모드일 때만 페이지를 뷰포트에 고정 (입력창이 스크롤로 밀리지 않게)
  document.body.classList.toggle("chat-mode", view === "chat");
  window.scrollTo(0, 0);
  if (view === "browse" && !browseLoaded) loadBrowse();
}
$$("[data-go]").forEach((el) => el.addEventListener("click", () => go(el.dataset.go)));

// ---------- 솔루션 카드 렌더 ----------
function fitColor(pct) {
  if (pct >= 90) return "var(--green)";
  if (pct >= 82) return "var(--cyan)";
  return "var(--blue-2)";
}
function solutionCard(c, opts = {}) {
  const el = document.createElement("article");
  el.className = "scard" + (c.recommended ? " rec" : "");
  if (opts.delay) el.style.animationDelay = opts.delay + "s";
  const tier = c.recommendation_tier;
  const tierBadge = tier ? `<span class="tier ${tier}">${TIER_LABEL[tier] || tier}</span>` : "";
  const cat = c.sai_category ? `<span class="chip-cat">${esc(c.sai_category)}</span>` : "";
  const tags = (c.task_tags || []).slice(0, 1).map((t) => `<span class="chip-tag">${esc(t)}</span>`).join("");
  // 매칭 점수 링 (대화 추천에서만 fit 존재)
  let ring = "";
  if (typeof c.fit === "number") {
    const col = fitColor(c.fit);
    ring = `<div class="fit-ring" style="background:conic-gradient(${col} ${c.fit * 3.6}deg, var(--panel-3) 0)">
              <div style="position:absolute;inset:4px;border-radius:50%;background:var(--panel);display:grid;place-items:center">
                <span class="pct" style="color:${col}">${c.fit}</span>
              </div>
              <span class="lbl">매칭</span>
            </div>`;
  }
  el.innerHTML = `
    ${ring}
    <div class="scard-main">
      <div class="scard-top">
        <div class="scard-name">${esc(c.name)}</div>
        ${c.like_count ? `<div class="scard-like">♥ ${c.like_count.toLocaleString()}</div>` : ""}
      </div>
      <div class="scard-org">${esc(c.org || "")}</div>
      <div class="scard-sum">${esc(c.summary || "")}</div>
      <div class="scard-foot">${cat}${tags}${tierBadge}</div>
    </div>`;
  el.addEventListener("click", () => openModal(c.id));
  track("impression", c.id, c.sai_category);
  return el;
}

// ---------- 홈: 통계 + 카테고리 + 인기 ----------
async function loadHome() {
  try {
    const s = await (await api("/api/stats")).json();
    $("#solCount").textContent = s.total_solutions;
    $("#tSol").textContent = s.total_solutions;
    $("#tOrg").textContent = s.total_orgs;
  } catch {}

  loadReport();

  try {
    const { categories } = await (await api("/api/categories")).json();
    const grid = $("#catGrid");
    grid.innerHTML = "";
    categories.forEach((cat, i) => {
      const el = document.createElement("div");
      el.className = "cat-card";
      el.style.animationDelay = i * 0.04 + "s";
      el.innerHTML = `
        <div class="ct-count">${cat.count}</div>
        <div class="ct-label">${esc(cat.label)}</div>
        <div class="ct-sub">개 솔루션</div>`;
      el.addEventListener("click", () => {
        go("browse");
        setTimeout(() => filterByCat(cat.key, el.querySelector(".ct-label").textContent), 60);
      });
      grid.appendChild(el);
    });
  } catch {}

  try {
    const { items } = await (await api("/api/solutions?sort=like&limit=6")).json();
    const grid = $("#popularGrid");
    grid.innerHTML = "";
    items.forEach((c, i) => grid.appendChild(solutionCard(c, { delay: i * 0.05 })));
  } catch {}
}

async function loadReport() {
  try {
    const r = await (await api("/api/report")).json();
    const s = r.summary || {};
    const total = s.total_solutions || 0;
    $("#reportStatus").textContent = `평가 ${r.eval_summary?.average_score || "-"}점`;
    $("#tVer").textContent = num(s.verified_homepage || 0);
    $("#reportMetrics").innerHTML = [
      ["등록 솔루션", num(total)],
      ["공급 기업", num(s.total_orgs)],
      ["홈페이지 확인", `${num(s.verified_homepage)} · ${pct(s.verified_homepage, total)}`],
      ["홈페이지 없음", `${num(s.missing_website)} · ${pct(s.missing_website, total)}`],
      ["평균 검증점수", s.avg_browser_score ? `${s.avg_browser_score}점` : "-"],
      ["요약 누락", num(s.missing_summary)],
    ]
      .map(([label, value]) => `<div class="report-metric"><b>${esc(value)}</b><span>${esc(label)}</span></div>`)
      .join("");

    renderReportBars("#reportCategories", (r.categories || []).slice(0, 8), total, "개");
    renderReportBars(
      "#reportTiers",
      (r.tiers || []).map((t) => ({ ...t, name: TIER_LABEL[t.name] || t.name })),
      total,
      "개"
    );

    const weakest = (r.eval_summary?.weakest || []).slice(0, 3);
    $("#reportEval").innerHTML = `
      <div class="eval-score">
        <b>${esc(String(r.eval_summary?.average_score || "-"))}</b>
        <span>${esc(String(r.eval_summary?.scenario_count || 0))}개 자연어 시나리오</span>
      </div>
      <div class="eval-weak">
        ${weakest
          .map(
            (w) => `
              <div class="weak-row">
                <span>${esc(w.query || "")}</span>
                <b>${esc(String(w.score || 0))}점</b>
              </div>`
          )
          .join("")}
      </div>`;
  } catch {
    $("#reportStatus").textContent = "분석 불러오기 실패";
  }
}

function renderReportBars(selector, rows, total, unit) {
  const max = Math.max(...rows.map((r) => Number(r.count || 0)), 1);
  $(selector).innerHTML = rows
    .map((r) => {
      const width = Math.max(6, Math.round((Number(r.count || 0) / max) * 100));
      const score = r.avg_score ? ` · ${r.avg_score}점` : "";
      return `
        <div class="report-bar">
          <div class="bar-top"><span>${esc(r.name)}</span><b>${num(r.count)}${unit}${score}</b></div>
          <div class="bar-track"><i style="width:${width}%"></i></div>
        </div>`;
    })
    .join("");
}

// ---------- 대화 ----------
let history = [];
let busy = false;

function addUser(text) {
  const d = document.createElement("div");
  d.className = "msg user";
  d.textContent = text;
  $("#thread").appendChild(d);
  scrollThread();
}
function addTyping() {
  const d = document.createElement("div");
  d.className = "msg sai";
  d.innerHTML = `<span class="bot-dot">🤖</span><div class="bubble"><div class="typing"><span></span><span></span><span></span></div></div>`;
  $("#thread").appendChild(d);
  scrollThread();
  return d;
}
function scrollThread() {
  const t = $("#thread");
  t.scrollTop = t.scrollHeight;
}
function fillSai(node, data) {
  let chips = "";
  if (data.meta && data.meta.query_action === "clarify" && (data.meta.intent_labels || []).length) {
    const original = data.meta.original_query || "";
    chips =
      `<div class="intent-chips">` +
      data.meta.intent_labels
        .map((l) => {
          const next = original ? `${original} ${l} 쪽으로 좁혀서 추천해줘` : `${l} 쪽으로 추천해줘`;
          return `<button data-intent-query="${attr(next)}">${esc(l)}</button>`;
        })
        .join("") +
      `</div>`;
  }
  node.innerHTML = `<span class="bot-dot">🤖</span><div class="bubble"><div class="body">${fmt(data.reply)}</div>${chips}${fbHtml(data)}</div>`;
  node.querySelectorAll("[data-intent-query]").forEach((b) =>
    b.addEventListener("click", () => send(b.dataset.intentQuery))
  );
  // 피드백 버튼 바인딩
  const fb = node.querySelector(".fb");
  if (fb) {
    fb.querySelectorAll("button").forEach((btn) =>
      btn.addEventListener("click", () => {
        sendFeedback(data.meta.original_query || "", btn.dataset.fb);
        ga("answer_feedback", { rating: btn.dataset.fb });
        fb.innerHTML = `<span class="fb-done">피드백 감사합니다 🙏</span>`;
      })
    );
  }
  scrollThread();
}

// 추천 답변에만 좋아요/싫어요 노출 (clarify엔 미노출)
function fbHtml(data) {
  if (data.meta && data.meta.query_action === "clarify") return "";
  if (!data.reply || data.reply.length < 10) return "";
  return `<div class="fb">
    <span class="fb-q">이 답변이 도움이 됐나요?</span>
    <button data-fb="up" aria-label="좋아요">👍</button>
    <button data-fb="down" aria-label="싫어요">👎</button>
  </div>`;
}
function renderRec(cards, groups = []) {
  const list = $("#recList");
  if (groups && groups.length) {
    $("#recHint").textContent = `${groups.length}개 분야`;
    list.innerHTML = "";
    groups.forEach((group) => {
      const sec = document.createElement("section");
      sec.className = "rec-group";
      sec.innerHTML = `
        <div class="rec-group-title">
          <span>${esc(group.label || group.category || "추천 묶음")}</span>
          <b>${(group.cards || []).length}개</b>
        </div>
        <div class="rec-group-list"></div>`;
      const slot = sec.querySelector(".rec-group-list");
      (group.cards || []).forEach((c, i) => slot.appendChild(solutionCard(c, { delay: i * 0.04 })));
      list.appendChild(sec);
    });
    return;
  }
  if (!cards || !cards.length) {
    $("#recHint").textContent = "이번 답변에는 카드가 없어요";
    list.innerHTML = `<div class="rec-empty">이 질문에 맞는 솔루션 카드가 없어요.<br />조금 더 구체적으로 물어보면 찾아드릴게요.</div>`;
    return;
  }
  $("#recHint").textContent = `${cards.length}개 제안`;
  list.innerHTML = "";
  cards.forEach((c, i) => list.appendChild(solutionCard(c, { delay: i * 0.06 })));
}

async function send(text) {
  if (busy || !text.trim()) return;
  busy = true;
  ga("search", { search_term: text.slice(0, 100) });
  go("chat");
  addUser(text);
  history.push({ role: "user", content: text });
  const typing = addTyping();
  try {
    const res = await api("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, history: history.slice(0, -1), session_id: SESSION_ID }),
    });
    const data = await res.json();
    data.meta = data.meta || {};
    data.meta.original_query = text;
    fillSai(typing, data);
    history.push({ role: "assistant", content: data.reply });
    renderRec(data.cards, data.groups);
  } catch {
    fillSai(typing, { reply: "연결에 문제가 생겼어요. 잠시 후 다시 시도해 주세요." });
  } finally {
    busy = false;
  }
}

// ---------- 탐색 ----------
let browseLoaded = false;
let curCat = "";
let curSort = "like";

async function loadBrowse() {
  browseLoaded = true;
  // 데이터 신선도 배지
  try {
    const m = await (await api("/api/meta")).json();
    const el = $("#dataMeta");
    if (el && m.built_at) {
      el.innerHTML = `<span class="dm-badge">📦 데이터 ${esc(m.version || "")}</span>
        <span>모두의창업에서 <b>${esc(m.built_at)}</b> 수집 · 솔루션 ${num(m.solutions)}개 · 기업 ${num(m.organizations)}개</span>`;
    }
  } catch {}
  // 필터 칩 구성
  try {
    const { categories } = await (await api("/api/categories")).json();
    const filters = $("#filters");
    const sortSel = filters.querySelector(".sort-sel");
    categories.forEach((cat) => {
      const b = document.createElement("button");
      b.className = "filter-chip";
      b.dataset.cat = cat.key;
      b.textContent = `${cat.label} (${cat.count})`;
      b.addEventListener("click", () => filterByCat(cat.key, cat.label));
      filters.insertBefore(b, sortSel);
    });
  } catch {}
  fetchBrowse();
}

function filterByCat(key, label) {
  curCat = key;
  $$(".filter-chip").forEach((c) => c.classList.toggle("active", c.dataset.cat === key));
  fetchBrowse();
}

async function fetchBrowse() {
  const grid = $("#browseGrid");
  grid.innerHTML = `<div class="rec-empty" style="grid-column:1/-1">불러오는 중…</div>`;
  const params = new URLSearchParams({ sort: curSort, limit: "60" });
  if (curCat) params.set("sai_category", curCat);
  try {
    const { items } = await (await api("/api/solutions?" + params)).json();
    grid.innerHTML = "";
    if (!items.length) {
      grid.innerHTML = `<div class="rec-empty" style="grid-column:1/-1">해당 분야 솔루션이 없어요.</div>`;
      return;
    }
    items.forEach((c, i) => grid.appendChild(solutionCard(c, { delay: Math.min(i * 0.02, 0.4) })));
  } catch {
    grid.innerHTML = `<div class="rec-empty" style="grid-column:1/-1">불러오기 실패</div>`;
  }
}

$("#filters").querySelector('[data-cat=""]').addEventListener("click", () => filterByCat("", "전체"));
$("#sortSel").addEventListener("change", (e) => {
  curSort = e.target.value;
  fetchBrowse();
});

function paintStars(group, score) {
  group.querySelectorAll("button").forEach((btn) => {
    btn.classList.toggle("active", Number(btn.dataset.score) <= score);
  });
}

function updateRatingSummary(summary) {
  const current = $("#ratingCurrent");
  if (current) {
    current.classList.remove("empty");
    if (summary && summary.overall_avg) {
      current.innerHTML = `현재 평균 <b>★ ${ratingValue(summary.overall_avg)}</b><span>${num(summary.total_votes || 0)}명 평가</span>`;
    }
  }
  if (summary && summary.overall_avg) {
    let meta = $("#modalRatingMeta");
    const metaWrap = document.querySelector(".modal-meta");
    if (!meta && metaWrap) {
      meta = document.createElement("span");
      meta.className = "rating-meta";
      meta.id = "modalRatingMeta";
      metaWrap.appendChild(meta);
    }
    if (meta) meta.textContent = `★ ${ratingValue(summary.overall_avg)} (${num(summary.total_votes || 0)})`;
  }
  RATING_LABELS.forEach(([key]) => {
    const row = document.querySelector(`.rating-stars[data-criterion="${key}"]`)?.closest(".rating-row");
    const avg = summary?.[key]?.avg;
    const label = row?.querySelector(".rating-label");
    if (label && avg) {
      let em = label.querySelector("em");
      if (!em) {
        em = document.createElement("em");
        label.appendChild(em);
      }
      em.textContent = `평균 ${ratingValue(avg)}`;
    }
  });
}

function bindRatingForm(d) {
  const panel = $("#ratingPanel");
  if (!panel) return;
  const selected = {};
  panel.querySelectorAll(".rating-stars").forEach((group) => {
    group.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const score = Number(btn.dataset.score);
        selected[group.dataset.criterion] = score;
        paintStars(group, score);
      });
    });
  });
  const status = $("#ratingStatus");
  const submit = $("#ratingSubmit");
  submit.addEventListener("click", async () => {
    if (Object.keys(selected).length < RATING_LABELS.length) {
      status.textContent = "5개 항목을 모두 선택해 주세요.";
      return;
    }
    const overall = RATING_LABELS.reduce((sum, [key]) => sum + selected[key], 0) / RATING_LABELS.length;
    submit.disabled = true;
    status.textContent = "저장 중…";
    try {
      const res = await api("/api/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ solution_id: d.id, session_id: SESSION_ID, ratings: selected }),
      });
      const saved = await res.json();
      if (!saved.ok) {
        status.textContent = "평가를 저장하지 못했어요.";
        submit.disabled = false;
        return;
      }
      ga("solution_rating", { item_id: d.id, overall: Number(overall.toFixed(1)) });
      const fresh = await (await api("/api/solution/" + d.id)).json();
      updateRatingSummary(fresh.ratings_summary || {});
      status.textContent = "평가 감사합니다.";
    } catch {
      status.textContent = "연결에 문제가 생겼어요.";
      submit.disabled = false;
    }
  });
}

// ---------- 상세 모달 ----------
async function openModal(id) {
  const bg = $("#modalBg");
  const m = $("#modal");
  m.innerHTML = `<div style="padding:60px;text-align:center;color:var(--txt-3)">불러오는 중…</div>`;
  bg.classList.add("open");
  document.body.style.overflow = "hidden";
  try {
    const d = await (await api("/api/solution/" + id)).json();
    track("view", id, d.sai_category);
    ga("view_solution", { item_id: id, item_name: d.name, item_category: d.sai_category });
    const tier = d.recommendation_tier;
    const tierBadge = tier ? `<span class="tier ${tier}">${TIER_LABEL[tier] || tier}</span>` : "";
    const cat = d.sai_category ? `<span class="chip-cat">${esc(d.sai_category)}</span>` : "";
    const ratingBadge = ratingMeta(d.ratings_summary);
    const verifyNote =
      tier === "unverified"
        ? `<span style="font-size:12px;color:var(--txt-3)">· 홈페이지 미검증, 등록 설명 기준</span>`
        : tier && d.browser_score
        ? `<span style="font-size:12px;color:var(--txt-3)">· 홈페이지 검증 ${d.browser_score}점</span>`
        : "";
    const tags = [...(d.task_tags || []), ...(d.problem_tags || [])]
      .slice(0, 6)
      .map((t) => `<span class="chip-tag">${esc(t)}</span>`)
      .join("");
    const prices = (d.prices || []).length
      ? `<div class="modal-sec"><h4>가격</h4>${d.prices
          .map(
            (p) =>
              `<div class="price-row"><span class="pl">${esc(p.label || p.payment_type)}</span><span class="pp">${
                p.price ? p.price.toLocaleString() + "원" : "문의"
              }</span></div>`
          )
          .join("")}</div>`
      : "";
    const free = (d.free_services || []).length
      ? `<div class="modal-sec"><h4>무료 플랜</h4>${d.free_services
          .map((f) => `<div class="price-row"><span class="pl">${esc(f.plan)}</span></div>`)
          .join("")}</div>`
      : "";
    const siblings = (d.org_siblings || []).length
      ? `<div class="modal-sec"><h4>${esc(d.org)}의 다른 솔루션</h4>
          <div class="modal-tags">${d.org_siblings
            .map((s) => `<span class="sibling" data-sib="${s.id}">${esc(s.name)}</span>`)
            .join("")}</div></div>`
      : "";
    const site = d.website
      ? `<a class="btn-primary" href="${esc(d.website)}" target="_blank" rel="noopener">사이트 방문 →</a>`
      : "";
    m.innerHTML = `
      <div class="modal-head">
        <button class="modal-close" id="modalClose">✕</button>
        <div class="modal-name">${esc(d.name)}</div>
        <div class="modal-org">${esc(d.org || "")}</div>
        <div class="modal-meta">${cat}${tierBadge}${ratingBadge}${verifyNote}${
      d.like_count ? `<span class="scard-like">♥ ${d.like_count.toLocaleString()}</span>` : ""
    }</div>
      </div>
      <div class="modal-body">
        <div class="modal-sec"><div class="modal-desc">${esc(d.description || d.summary || "")}</div></div>
        ${tags ? `<div class="modal-sec"><h4>이런 일에 좋아요</h4><div class="modal-tags">${tags}</div></div>` : ""}
        ${prices}${free}${siblings}${ratingSection(d)}
        <div class="modal-cta">${site}<button class="btn-ghost" id="askAboutBtn">이 솔루션 모두레이터에게 묻기</button></div>
      </div>`;
    $("#modalClose").addEventListener("click", closeModal);
    bindRatingForm(d);
    const siteLink = m.querySelector(".modal-cta a.btn-primary");
    if (siteLink) siteLink.addEventListener("click", () => { track("click", id, d.sai_category); ga("solution_site_click", { item_id: id, item_name: d.name }); });
    const ask = $("#askAboutBtn");
    if (ask)
      ask.addEventListener("click", () => {
        closeModal();
        send(`${d.name} 어떤 솔루션이야? 나한테 맞을까?`);
      });
    m.querySelectorAll("[data-sib]").forEach((s) =>
      s.addEventListener("click", () => openModal(parseInt(s.dataset.sib)))
    );
  } catch {
    m.innerHTML = `<div style="padding:60px;text-align:center;color:var(--txt-3)">정보를 불러오지 못했어요. <button class="modal-close" id="modalClose" style="position:static">✕</button></div>`;
    $("#modalClose").addEventListener("click", closeModal);
  }
}
function closeModal() {
  $("#modalBg").classList.remove("open");
  document.body.style.overflow = "";
}
$("#modalBg").addEventListener("click", (e) => {
  if (e.target === $("#modalBg")) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

// ---------- 이벤트 바인딩 ----------
$("#heroForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const v = $("#heroInput").value;
  $("#heroInput").value = "";
  send(v);
});
$$(".suggest button").forEach((b) => b.addEventListener("click", () => send(b.textContent)));
$("#composer").addEventListener("submit", (e) => {
  e.preventDefault();
  const v = $("#chatInput").value;
  $("#chatInput").value = "";
  send(v);
});
$("#resetBtn").addEventListener("click", () => {
  history = [];
  $("#thread").innerHTML = "";
  $("#recList").innerHTML = `<div class="rec-empty">왼쪽에 고민을 입력하면<br />여기에 맞춤 솔루션이 표시됩니다.</div>`;
  $("#recHint").textContent = "대화에 따라 솔루션이 나타나요";
});

// 실제 상단바 높이를 CSS 변수로 반영 (채팅 레이아웃 높이 계산 정확도)
function syncTopbarHeight() {
  const tb = document.querySelector(".topbar");
  if (tb) document.documentElement.style.setProperty("--topbar-h", tb.offsetHeight + "px");
}
syncTopbarHeight();
window.addEventListener("resize", syncTopbarHeight);
window.addEventListener("modu:presence-layout", syncTopbarHeight);

// ---------- 시작 ----------
loadHome();

// URL 해시/쿼리로 초기 뷰 결정 (데이터맵·기술소개 페이지에서 넘어올 때)
function routeFromUrl() {
  const params = new URLSearchParams(location.search);
  const cat = params.get("cat");
  const hash = (location.hash || "").replace("#", "");
  if (hash === "browse" || cat) {
    go("browse");
    if (cat) setTimeout(() => filterByCat(cat, cat), 120);
  } else if (hash === "chat") {
    go("chat");
  } else {
    go("home");
  }
}
routeFromUrl();
window.addEventListener("hashchange", routeFromUrl);
