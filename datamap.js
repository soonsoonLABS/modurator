// ===== 솔루션 데이터맵 인포그래픽 =====
const API_BASE = location.hostname.endsWith("github.io") ? "https://modu.soonsoon.ai" : "";
const $ = (s) => document.querySelector(s);
const esc = (t) => (t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const num = (n) => Number(n || 0).toLocaleString();

// 백엔드 미연동/오프라인 대비 폴백 데이터 (실제 집계 기준)
const FALLBACK = {
  total_solutions: 407, total_orgs: 283, verified: 219, unverified: 186,
  categories: [
    { key: "marketing_content", label: "마케팅/콘텐츠 제작", count: 140, avg_like: 7.6, verified: 69 },
    { key: "data_infra", label: "데이터/인프라", count: 76, avg_like: 3.9, verified: 39 },
    { key: "strategy_research", label: "전략/리서치", count: 62, avg_like: 122.1, verified: 31 },
    { key: "document_knowledge", label: "문서/지식관리", count: 45, avg_like: 6.3, verified: 32 },
    { key: "backoffice_finance", label: "경영/백오피스", count: 24, avg_like: 10.5, verified: 7 },
    { key: "dev_nocode", label: "개발/노코드", count: 24, avg_like: 33.4, verified: 17 },
    { key: "customer_chat", label: "고객응대/챗봇", count: 18, avg_like: 7.0, verified: 13 },
    { key: "commerce_sales", label: "커머스/세일즈", count: 10, avg_like: 5.2, verified: 4 },
    { key: "legal_ip_security", label: "법률/IP/보안", count: 6, avg_like: 21.3, verified: 5 },
    { key: "education_training", label: "교육/훈련 콘텐츠", count: 2, avg_like: 1.0, verified: 2 },
  ],
  tiers: [
    { tier: "unverified", count: 186 }, { tier: "strong", count: 123 },
    { tier: "usable", count: 71 }, { tier: "review", count: 23 }, { tier: "weak", count: 4 },
  ],
  top_liked: [
    { name: "handydocs (핸디독스)", org: "주식회사 핸디컴퍼니", like_count: 3670, category: "전략/리서치" },
    { name: "모달리(Modaly)", org: "모달리 주식회사", like_count: 2662, category: "전략/리서치" },
    { name: "Foundry", org: "세리온", like_count: 356, category: "전략/리서치" },
    { name: "K스타터팩", org: "담다랩스", like_count: 245, category: "전략/리서치" },
    { name: "BBANANA.ai (빠나나에이아이)", org: "빠나나 AI", like_count: 239, category: "마케팅/콘텐츠 제작" },
    { name: "피터보이스", org: "피터보이스", like_count: 234, category: "개발/노코드" },
  ],
  eval_summary: { average_score: 90.5, scenario_count: 54 },
};

const TIER_INFO = {
  strong: { label: "검증됨 (strong)", color: "#1a9960" },
  usable: { label: "추천 (usable)", color: "var(--laccent)" },
  weak: { label: "비교 후보 (weak)", color: "#c67a00" },
  review: { label: "검토 필요 (review)", color: "#c67a00" },
  unverified: { label: "등록설명 기준 (미검증)", color: "var(--ltxt-3)" },
};

// 고민 → 분야 동선 (창업 단계 순)
const JOURNEY = [
  { step: "STEP 1 · 검증", q: "내 아이디어, 시장에서 통할까?", cat: "strategy_research", label: "전략/리서치" },
  { step: "STEP 2 · 기획", q: "사업계획서·IR이 막막해요", cat: "strategy_research", label: "전략/리서치" },
  { step: "STEP 3 · 제작", q: "코딩 없이 제품을 만들고 싶어요", cat: "dev_nocode", label: "개발/노코드" },
  { step: "STEP 4 · 홍보", q: "광고·상세페이지를 빠르게", cat: "marketing_content", label: "마케팅/콘텐츠 제작" },
  { step: "STEP 5 · 운영", q: "세금·회계를 자동화하고 싶어요", cat: "backoffice_finance", label: "경영/백오피스" },
  { step: "STEP 6 · 고객", q: "고객 문의를 챗봇으로 받고 싶어요", cat: "customer_chat", label: "고객응대/챗봇" },
];

function gotoBrowse(cat) {
  location.href = `/?cat=${encodeURIComponent(cat)}#browse`;
}

// 분야별 고정 색상 (지형도/사분면 공통) — 그라데이션 2색
const CAT_COLORS = {
  marketing_content: ["#4f8bff", "#2b5fd8"],
  data_infra: ["#36b6e8", "#1f7fc4"],
  strategy_research: ["#46e0ff", "#2ba6d8"],
  document_knowledge: ["#7d8cf0", "#5158d0"],
  backoffice_finance: ["#3fe0a8", "#1fa87c"],
  dev_nocode: ["#9a7cff", "#6a45e0"],
  customer_chat: ["#36d6c4", "#1f9e92"],
  commerce_sales: ["#ffb454", "#e0832b"],
  legal_ip_security: ["#e070c0", "#b8459a"],
  education_training: ["#9aa6cc", "#6f7ba8"],
};
function catGrad(key, i) {
  return CAT_COLORS[key] || [`hsl(${210 + i * 18},75%,64%)`, `hsl(${210 + i * 18},70%,48%)`];
}
function catColor(key, i) {
  return catGrad(key, i)[0];
}

// ===== Squarified Treemap =====
function squarify(items, x, y, w, h) {
  const total = items.reduce((s, it) => s + it.value, 0);
  const scaled = items.map((it) => ({ ...it, area: (it.value / total) * (w * h) }));
  const rects = [];
  layout(scaled, x, y, w, h, rects);
  return rects;
}
function worst(row, length) {
  const s = row.reduce((a, r) => a + r.area, 0);
  if (!s || !length) return Infinity;
  const mx = Math.max(...row.map((r) => r.area));
  const mn = Math.min(...row.map((r) => r.area));
  return Math.max((length * length * mx) / (s * s), (s * s) / (length * length * mn));
}
function layout(children, x, y, w, h, rects) {
  let row = [];
  let length = Math.min(w, h);
  let i = 0;
  while (i < children.length) {
    const c = children[i];
    const newRow = row.concat([c]);
    if (row.length && worst(row, length) < worst(newRow, length)) {
      placeRow(row, x, y, w, h, rects);
      const s = row.reduce((a, r) => a + r.area, 0);
      if (w >= h) { const dx = s / h; x += dx; w -= dx; }
      else { const dy = s / w; y += dy; h -= dy; }
      row = []; length = Math.min(w, h);
    } else { row = newRow; i++; }
  }
  if (row.length) placeRow(row, x, y, w, h, rects);
}
function placeRow(row, x, y, w, h, rects) {
  const s = row.reduce((a, r) => a + r.area, 0);
  if (w >= h) {
    const dx = h ? s / h : 0; let cy = y;
    row.forEach((r) => { const dh = dx ? r.area / dx : 0; rects.push({ ...r, x, y: cy, w: dx, h: dh }); cy += dh; });
  } else {
    const dy = w ? s / w : 0; let cx = x;
    row.forEach((r) => { const dw = dy ? r.area / dy : 0; rects.push({ ...r, x: cx, y, w: dw, h: dy }); cx += dw; });
  }
}

function renderTreemap(cats, total) {
  const W = 1000, H = 540, GAP = 5;
  const items = [...cats].sort((a, b) => b.count - a.count).map((c) => ({ ...c, value: c.count }));
  const rects = squarify(items, 0, 0, W, H);
  const el = $("#treemap");
  el.setAttribute("viewBox", `0 0 ${W} ${H}`);

  // 그라데이션 + 광택 defs
  const defs = rects.map((r, i) => {
    const [c1, c2] = catGrad(r.key, i);
    return `<linearGradient id="tg${i}" x1="0" y1="0" x2="0.5" y2="1">
      <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
    </linearGradient>`;
  }).join("");

  const tiles = rects.map((r, i) => {
    const share = ((r.count / total) * 100).toFixed(1);
    const w = Math.max(0, r.w - GAP), h = Math.max(0, r.h - GAP);
    const big = w > 130 && h > 70;
    const mid = w > 76 && h > 44;
    const label = big
      ? `<text x="${r.x + 16}" y="${r.y + 32}" class="tm-lbl">${esc(r.label)}</text>
         <text x="${r.x + 16}" y="${r.y + 66}" class="tm-big">${r.count}</text>
         <text x="${r.x + 16}" y="${r.y + 86}" class="tm-sub">${share}% · 평균 ♥${(r.avg_like||0).toFixed(0)}</text>`
      : mid
      ? `<text x="${r.x + w/2}" y="${r.y + h/2 - 3}" class="tm-mlbl" text-anchor="middle">${esc(r.label)}</text>
         <text x="${r.x + w/2}" y="${r.y + h/2 + 17}" class="tm-mnum" text-anchor="middle">${r.count}</text>`
      : `<text x="${r.x + w/2}" y="${r.y + h/2 + 4}" class="tm-snum" text-anchor="middle">${r.count}</text>`;
    return `<g class="tm-tile" data-cat="${esc(r.key)}" style="--d:${i*0.06}s">
      <rect x="${r.x}" y="${r.y}" width="${w}" height="${h}" rx="12" fill="url(#tg${i})"/>
      <rect x="${r.x}" y="${r.y}" width="${w}" height="${h}" rx="12" fill="url(#tmGloss)" opacity="0.5"/>
      <rect x="${r.x+0.75}" y="${r.y+0.75}" width="${w-1.5}" height="${h-1.5}" rx="11" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="1"/>
      ${label}</g>`;
  }).join("");

  el.innerHTML = `<defs>
      ${defs}
      <linearGradient id="tmGloss" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity="0.22"/>
        <stop offset="0.5" stop-color="#fff" stop-opacity="0"/>
      </linearGradient>
      <filter id="tmShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#000" flood-opacity="0.35"/>
      </filter>
    </defs>
    <g filter="url(#tmShadow)">${tiles}</g>`;
  el.querySelectorAll(".tm-tile").forEach((g) =>
    g.addEventListener("click", () => gotoBrowse(g.dataset.cat))
  );
}

// ===== 수요·공급 사분면 맵 =====
function renderQuadrant(cats, total) {
  const W = 1000, H = 560, P = 64;
  const iw = W - P * 2, ih = H - P * 2;
  const maxSupply = Math.max(...cats.map((c) => c.count));
  const maxDemand = Math.max(...cats.map((c) => c.avg_like || 0));
  const avgSupply = cats.reduce((s, c) => s + c.count, 0) / cats.length;
  const avgDemand = cats.reduce((s, c) => s + (c.avg_like || 0), 0) / cats.length;
  const sx = (v) => P + (v / maxSupply) * iw;
  const sy = (v) => P + ih - (Math.sqrt(v) / Math.sqrt(maxDemand)) * ih;
  const el = $("#quadrant");
  el.setAttribute("viewBox", `0 0 ${W} ${H}`);
  const midX = sx(avgSupply), midY = sy(avgDemand);

  // 격자선
  let grid = "";
  for (let gx = 0; gx <= 5; gx++) {
    const xx = P + (iw / 5) * gx;
    grid += `<line x1="${xx}" y1="${P}" x2="${xx}" y2="${P+ih}" stroke="var(--lline)" opacity="0.55"/>`;
  }
  for (let gy = 0; gy <= 5; gy++) {
    const yy = P + (ih / 5) * gy;
    grid += `<line x1="${P}" y1="${yy}" x2="${P+iw}" y2="${yy}" stroke="var(--lline)" opacity="0.55"/>`;
  }

  const defs = cats.map((c, i) => {
    const [c1, c2] = catGrad(c.key, i);
    return `<radialGradient id="qg${i}" cx="0.35" cy="0.3" r="0.8">
      <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
    </radialGradient>`;
  }).join("");

  const bubbles = cats.map((c, i) => {
    const cx = sx(c.count), cy = sy(c.avg_like || 0);
    const rad = 12 + Math.sqrt(c.count) * 3.0;
    return `<g class="qd-bub" data-cat="${esc(c.key)}" style="--d:${i*0.06}s">
      <circle cx="${cx}" cy="${cy}" r="${rad}" fill="url(#qg${i})" fill-opacity="0.9" stroke="#fff" stroke-opacity="0.25" stroke-width="1.5" filter="url(#qdGlow)"/>
      <text x="${cx}" y="${cy - rad - 7}" class="qd-lbl" text-anchor="middle">${esc(c.label)}</text>
      <text x="${cx}" y="${cy + 4}" class="qd-bn" text-anchor="middle">${c.count}</text>
    </g>`;
  }).join("");

  el.innerHTML = `<defs>
      ${defs}
      <filter id="qdGlow" x="-60%" y="-60%" width="220%" height="220%">
        <feDropShadow dx="0" dy="3" stdDeviation="7" flood-color="#3f7bff" flood-opacity="0.4"/>
      </filter>
    </defs>
    <!-- 사분면 배경 -->
    <rect x="${P}" y="${P}" width="${midX-P}" height="${midY-P}" fill="rgba(56,214,255,.06)" rx="4"/>
    <rect x="${midX}" y="${midY}" width="${P+iw-midX}" height="${P+ih-midY}" fill="rgba(255,122,107,.06)" rx="4"/>
    ${grid}
    <!-- 평균선 -->
    <line x1="${midX}" y1="${P}" x2="${midX}" y2="${P+ih}" stroke="var(--lline-2)" stroke-dasharray="5 5"/>
    <line x1="${P}" y1="${midY}" x2="${P+iw}" y2="${midY}" stroke="var(--lline-2)" stroke-dasharray="5 5"/>
    <!-- 사분면 라벨 -->
    <text x="${P+14}" y="${P+24}" class="qd-zone blue">블루오션 · 공급↓ 수요↑</text>
    <text x="${P+iw-12}" y="${P+24}" class="qd-zone" text-anchor="end">경쟁 치열 · 공급↑ 수요↑</text>
    <text x="${P+14}" y="${P+ih-12}" class="qd-zone dim">틈새 · 공급↓ 수요↓</text>
    <text x="${P+iw-12}" y="${P+ih-12}" class="qd-zone red" text-anchor="end">레드오션 · 공급↑ 수요↓</text>
    <!-- 축 -->
    <text x="${P+iw/2}" y="${H-18}" class="qd-axis" text-anchor="middle">공급 (솔루션 수) →</text>
    <text x="22" y="${P+ih/2}" class="qd-axis" text-anchor="middle" transform="rotate(-90 22 ${P+ih/2})">수요 (평균 관심도) →</text>
    ${bubbles}`;
  el.querySelectorAll(".qd-bub").forEach((g) =>
    g.addEventListener("click", () => gotoBrowse(g.dataset.cat))
  );
}

function render(d) {
  const total = d.total_solutions;
  $("#kSol").textContent = num(total);
  $("#kOrg").textContent = num(d.total_orgs);

  // 핵심 수치
  const strong = (d.tiers.find((t) => t.tier === "strong") || {}).count || 0;
  const usable = (d.tiers.find((t) => t.tier === "usable") || {}).count || 0;
  const verPct = Math.round((d.verified / total) * 100);
  $("#keystats").innerHTML = [
    [num(total), "AI 솔루션"],
    [num(d.total_orgs), "공급 기업"],
    [d.categories.length + "개", "분석 분야"],
    [verPct + "%", "홈페이지 검증"],
  ].map(([v, l]) => `<div class="dm-keystat"><b>${v}</b><span>${l}</span></div>`).join("");

  // 포스터: 트리맵 지형도 + 사분면 맵
  renderTreemap(d.categories, total);
  renderQuadrant(d.categories, total);

  // 1. 분야 분포
  const maxC = Math.max(...d.categories.map((c) => c.count));
  $("#dist").innerHTML = d.categories.map((c, i) => {
    const share = ((c.count / total) * 100).toFixed(1);
    return `<div class="dist-row ${i === 0 ? "top" : ""}">
      <div class="dist-label">${esc(c.label)}</div>
      <div class="dist-bar"><div class="dist-fill" data-w="${(c.count / maxC) * 100}"></div></div>
      <div class="dist-val">${c.count}<span>· ${share}%</span></div>
    </div>`;
  }).join("");

  // 2. 수요-공급 갭
  const maxSupply = Math.max(...d.categories.map((c) => c.count));
  const maxDemand = Math.max(...d.categories.map((c) => c.avg_like || 0));
  const gapSorted = [...d.categories].sort((a, b) => (b.avg_like || 0) - (a.avg_like || 0));
  $("#gap").innerHTML = gapSorted.map((c) => `
    <div class="gap-row">
      <div class="gap-label">${esc(c.label)}</div>
      <div class="gap-side supply">
        <div class="gap-track supply"><i data-w="${(c.count / maxSupply) * 100}"></i></div>
        <span class="gap-n r">${c.count}개</span>
      </div>
      <div class="gap-side demand">
        <div class="gap-track demand"><i data-w="${((c.avg_like || 0) / maxDemand) * 100}"></i></div>
        <span class="gap-n">♥${(c.avg_like || 0).toFixed(0)}</span>
      </div>
    </div>`).join("");

  // 3. 신뢰도 도넛 + 등급
  $("#verPct").textContent = verPct + "%";
  drawDonut(d.verified, d.unverified, total);
  $("#tiers").innerHTML = d.tiers.map((t) => {
    const info = TIER_INFO[t.tier] || { label: t.tier, color: "var(--laccent)" };
    const p = Math.round((t.count / total) * 100);
    return `<div class="tier-row">
      <div class="tier-top"><span class="tl">${esc(info.label)}</span><span class="tn">${t.count}개 · ${p}%</span></div>
      <div class="tier-track"><i data-w="${p}" style="background:${info.color}"></i></div>
    </div>`;
  }).join("");

  // 4. 기회 영역
  const avgDemand = d.categories.reduce((s, c) => s + (c.avg_like || 0), 0) / d.categories.length;
  const sat = [...d.categories].sort((a, b) => b.count - a.count).slice(0, 3);
  // 기회: 공급 적고(하위) 수요 평균 이상
  const gap = [...d.categories]
    .filter((c) => c.count <= 30 && (c.avg_like || 0) >= 10)
    .sort((a, b) => (b.avg_like || 0) - (a.avg_like || 0))
    .slice(0, 3);
  $("#oppoSat").innerHTML = sat.map((c) => `
    <div class="oppo-item">
      <div><div class="on">${esc(c.label)}</div><div class="om">관심도 평균 ♥${(c.avg_like || 0).toFixed(0)}</div></div>
      <div class="ov"><b>${c.count}개</b>공급</div>
    </div>`).join("");
  $("#oppoGap").innerHTML = (gap.length ? gap : [...d.categories].sort((a,b)=>a.count-b.count).slice(0,3)).map((c) => `
    <div class="oppo-item">
      <div><div class="on">${esc(c.label)}</div><div class="om">관심도 평균 ♥${(c.avg_like || 0).toFixed(0)}</div></div>
      <div class="ov"><b>${c.count}개</b>공급</div>
    </div>`).join("");

  // 5. 여정
  $("#journey").innerHTML = JOURNEY.map((j) => `
    <div class="jrny" data-cat="${esc(j.cat)}">
      <div class="step">${esc(j.step)}</div>
      <div class="q">${esc(j.q)}</div>
      <div class="to">→ <b>${esc(j.label)}</b> 분야 보기</div>
      <span class="arrow">→</span>
    </div>`).join("");
  document.querySelectorAll(".jrny").forEach((el) =>
    el.addEventListener("click", () => gotoBrowse(el.dataset.cat))
  );

  // 애니메이션 시작
  requestAnimationFrame(() => setTimeout(animateBars, 100));
  observeReveal();
  loadMinePopular();
}

// 모두레이터 자체 인기 (플랫폼 이벤트 기반)
async function loadMinePopular() {
  const el = document.querySelector("#minePopular");
  try {
    const r = await fetch(API_BASE + "/api/popular?limit=6");
    const d = await r.json();
    if (!d.has_data || !d.items.length) {
      el.innerHTML = `<div class="mine-empty">
        <div class="mine-empty-icon">📡</div>
        <b>사용 데이터를 모으는 중이에요</b>
        <span>모두레이터에서 솔루션을 살펴볼수록 이 순위가 채워집니다.
        현재까지 ${num(d.total_events || 0)}건의 활동이 기록됐어요.</span>
      </div>`;
      return;
    }
    const maxScore = Math.max(...d.items.map((x) => x.score || 0), 1);
    el.innerHTML = d.items.map((t, i) => `
      <div class="mine-row">
        <div class="mine-rank">${i + 1}</div>
        <div class="mine-main">
          <div class="mine-name">${esc(t.name)}</div>
          <div class="mine-org">${esc(t.org || "")}${t.category ? " · " + esc(t.category) : ""}${
            t.rating_avg ? ` · <span class="mine-rating">★ ${Number(t.rating_avg).toFixed(1)}</span>` : ""
          }</div>
          <div class="mine-bar"><i style="width:${(t.score / maxScore) * 100}%"></i></div>
        </div>
        <div class="mine-score"><b>${num(t.score)}</b><span>관심 점수</span></div>
      </div>`).join("");
  } catch {
    el.innerHTML = `<div class="mine-empty"><span>인기 데이터를 불러오지 못했어요.</span></div>`;
  }
}

function drawDonut(verified, unverified, total) {
  const svg = $("#donut");
  const R = 80, C = 2 * Math.PI * R, cx = 100, cy = 100;
  const verLen = (verified / total) * C;
  svg.innerHTML = `
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="var(--lbg-2)" stroke-width="26" />
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="url(#g)" stroke-width="26"
      stroke-linecap="round" stroke-dasharray="0 ${C}" id="donutArc">
    </circle>
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="var(--laccent)"/><stop offset="1" stop-color="var(--laccent)"/>
    </linearGradient></defs>`;
  setTimeout(() => {
    const arc = $("#donutArc");
    arc.style.transition = "stroke-dasharray 1.3s cubic-bezier(.2,.8,.2,1)";
    arc.setAttribute("stroke-dasharray", `${verLen} ${C}`);
  }, 300);
}

function animateBars() {
  document.querySelectorAll("[data-w]").forEach((el) => {
    el.style.width = el.dataset.w + "%";
  });
}

function observeReveal() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("in"); });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
}

// 로드
(async () => {
  let data = FALLBACK;
  try {
    const r = await fetch(API_BASE + "/api/datamap");
    if (r.ok) {
      const j = await r.json();
      if (j && j.categories && j.categories.length) data = j;
    }
  } catch {}
  render(data);
})();
