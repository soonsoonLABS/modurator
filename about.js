// 기술 소개 페이지
const API_BASE = location.hostname.endsWith("github.io") ? "https://modu.soonsoon.ai" : "";
const $ = (s) => document.querySelector(s);
const num = (n) => Number(n || 0).toLocaleString();

// 1. 파이프라인 (실제 구현 기준)
const PIPE = [
  { n: "STEP 1", h: "수집", p: "모두의창업 공개 API에서 솔루션·기업 데이터를 수집. 암호화 응답을 해석해 정규화했습니다.", t: "407 솔루션 · 283 기업" },
  { n: "STEP 2", h: "구조화", p: "SQLite로 정규화하고 전문검색(FTS5) 인덱스를 구축. 키워드·가격·카테고리를 분리 저장.", t: "FTS5 전문검색" },
  { n: "STEP 3", h: "분류·검증", p: "10종 추천 카테고리로 재분류하고, 홈페이지를 실제 브라우저로 열어 신뢰도를 측정.", t: "10 카테고리 · 5단계 신뢰등급" },
  { n: "STEP 4", h: "추천", p: "다중 신호 검색 + 의도 분석 + 가드레일을 거쳐 SAM AI가 자연어로 안내.", t: "SAM 기반 대화 추천" },
];

// 2. 분석/검증 기법 (검증된 방식 언급)
const TECH = [
  { g: "Information Retrieval", h: "BM25 전문검색", p: "검색 표준 랭킹 알고리즘 BM25(SQLite FTS5)로 질의-문서 관련도를 1차 산출합니다." },
  { g: "Query Understanding", h: "의도 분석 라우팅", p: "질의를 검색·되묻기·복합의도로 분기. 모호한 질문은 추천을 강요하지 않고 먼저 좁힙니다." },
  { g: "Hybrid Ranking", h: "다중 신호 가중 합산", p: "전문검색 + 키워드 + 의도태그 + 검증등급 + 관심도를 가중 합산해 순위를 정합니다." },
  { g: "Trust & Safety", h: "가드레일 3층", p: "검색·입력·출력 단계의 규칙층으로 범위 밖 질문과 알려진 오답을 차단합니다." },
  { g: "Verification", h: "브라우저 실측 검증", p: "Headless 브라우저로 홈페이지 첫 화면을 렌더링해 등록 설명과의 일치도를 점수화합니다." },
  { g: "Evaluation", h: "자연어 스트레스 테스트", p: "오타·은어·복합질의 등 현실적 질의 세트로 추천 만족도와 분류 정확도를 정량 측정합니다." },
];

// 4. 품질 지표 (폴백 + 실데이터)
const METRIC_FALLBACK = [
  ["90.5", "자연어 검색 만족도 / 100"],
  ["90.7%", "카테고리 분류 정확도"],
  ["54", "스트레스 테스트 시나리오"],
  ["46%", "정직하게 공개한 미검증 비율"],
];

function render() {
  $("#pipe").innerHTML = PIPE.map((s) => `
    <div class="pipe-step">
      <div class="pn">${s.n}</div><h3>${s.h}</h3><p>${s.p}</p><div class="pt">${s.t}</div>
    </div>`).join("");

  $("#tech").innerHTML = TECH.map((t) => `
    <div class="tech-card"><div class="tg">${t.g}</div><h3>${t.h}</h3><p>${t.p}</p></div>`).join("");

  $("#verify").innerHTML = `
    <div class="verify-card">
      <div class="verify-big"><b id="vScore">54%</b><span>홈페이지 직접 검증 완료</span></div>
      <p style="font-size:13.5px;color:var(--txt-2);line-height:1.6;margin-top:8px">
        URL이 있는 솔루션은 실제 브라우저로 열어 첫 화면을 확인했습니다.
        URL이 없는 솔루션은 <b style="color:var(--txt)">'등록 설명 기준'</b>으로 솔직하게 구분합니다.</p>
    </div>
    <div class="verify-card">
      <h3>검증 시 확인 항목</h3>
      <div class="verify-list">
        ${["서비스·기업 정체성이 첫 화면에 보이는가","무엇을 하는 서비스인지 이해되는가","등록 설명과 실제 페이지가 일치하는가","시작·데모·가격 등 이용 경로가 있는가","제품 이미지·영상 등 시각 근거가 있는가"]
          .map((v) => `<div class="verify-item"><span class="vk">✓</span><span>${v}</span></div>`).join("")}
      </div>
    </div>`;

  loadMetrics();
}

async function loadMetrics() {
  let metrics = METRIC_FALLBACK.slice();
  try {
    const dm = await (await fetch(API_BASE + "/api/datamap")).json();
    const verPct = Math.round((dm.verified / dm.total_solutions) * 100);
    $("#vScore").textContent = verPct + "%";
    const ev = dm.eval_summary || {};
    metrics = [
      [String(ev.average_score || "90.5"), "자연어 검색 만족도 / 100"],
      [num(dm.total_solutions), "분류·검증한 솔루션"],
      [String(ev.scenario_count || 54), "스트레스 테스트 시나리오"],
      [(100 - verPct) + "%", "정직하게 공개한 미검증 비율"],
    ];
  } catch {}
  // 라이브 사용 지표 추가 시도
  try {
    const ins = await (await fetch(API_BASE + "/api/insights")).json();
    if (ins.total_searches > 0) {
      metrics.push([num(ins.total_searches), "누적 검색 질의"]);
      if (ins.refine_rate != null) metrics.push([ins.refine_rate + "%", "재검색률(개선 추적)"]);
    }
  } catch {}
  $("#metrics").innerHTML = metrics.map(([v, l]) =>
    `<div class="metric-card"><b>${v}</b><span>${l}</span></div>`).join("");
}

function observeReveal() {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) e.target.classList.add("in"); }), { threshold: 0.1 });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
}

render();
observeReveal();
