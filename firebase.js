// ===== Firebase Analytics (GA4) 공용 초기화 =====
// 모든 페이지에서 <script type="module" src="/static/firebase.js"></script> 로 로드.
// 모듈 번들 없이 CDN ESM import 사용.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAnalytics, logEvent } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyDiCSERrcTbbK70gzebm0W8O8zkK_iB9Us",
  authDomain: "modurator-12094.firebaseapp.com",
  projectId: "modurator-12094",
  storageBucket: "modurator-12094.firebasestorage.app",
  messagingSenderId: "451323763245",
  appId: "1:451323763245:web:c5b11591033376922f76a4",
  measurementId: "G-5P2Z2HHFTZ",
};

let analytics = null;
try {
  const app = initializeApp(firebaseConfig);
  analytics = getAnalytics(app);
} catch (e) {
  console.warn("Firebase init skipped:", e);
}

// 다른 일반 스크립트(app.js 등)에서 호출할 수 있도록 전역 헬퍼 노출
window.gaTrack = function (eventName, params) {
  try {
    if (analytics) logEvent(analytics, eventName, params || {});
  } catch {}
};
