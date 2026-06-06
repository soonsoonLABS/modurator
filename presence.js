// 모두레이터 공용 presence 배지 + heartbeat
(function () {
  const API_BASE = location.hostname.endsWith("github.io") ? "https://modu.soonsoon.ai" : "";
  const SESSION_KEY = "modu_sid";
  const HEARTBEAT_MS = 45000;
  const PRESENCE_MS = 30000;

  function sessionId() {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  }

  function api(path, opts) {
    return fetch(API_BASE + path, opts);
  }

  function ensureBadge() {
    const topbar = document.querySelector(".topbar");
    if (!topbar) return null;
    let badge = topbar.querySelector(".presence-badge");
    if (badge) return badge;
    badge = document.createElement("span");
    badge.className = "presence-badge";
    badge.hidden = true;
    badge.setAttribute("aria-live", "polite");
    badge.innerHTML = `<span class="presence-dot" aria-hidden="true"></span><span class="presence-text"></span>`;
    const nav = topbar.querySelector(".nav-links");
    topbar.insertBefore(badge, nav || null);
    return badge;
  }

  function updateBadge(online) {
    const badge = ensureBadge();
    if (!badge) return;
    const n = Number(online || 0);
    if (n <= 0) {
      badge.hidden = true;
      return;
    }
    badge.hidden = false;
    const text = badge.querySelector(".presence-text");
    if (text) text.textContent = `지금 ${n.toLocaleString()}명 보는 중`;
    window.dispatchEvent(new Event("modu:presence-layout"));
  }

  async function heartbeat() {
    try {
      await api("/api/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId() }),
        keepalive: true,
      });
    } catch {}
  }

  async function refreshPresence() {
    try {
      const res = await api("/api/presence");
      if (!res.ok) return;
      const data = await res.json();
      updateBadge(data.online);
    } catch {}
  }

  function start() {
    ensureBadge();
    heartbeat().finally(refreshPresence);
    setInterval(heartbeat, HEARTBEAT_MS);
    setInterval(refreshPresence, PRESENCE_MS);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
