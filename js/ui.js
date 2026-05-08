/**
 * js/ui.js
 * Shared UI utilities — toast, loader, modals
 */

window.ChatooUI = (() => {

  // ── Toast ──────────────────────────────────────────────────
  function toast(msg, type = "info", duration = 3000) {
    const colors = { success: "#00ff88", error: "#ff4757", warn: "#ffd700", info: "var(--primary)" };
    const icons  = { success: "✓", error: "✕", warn: "⚠", info: "ℹ" };

    const el = document.createElement("div");
    el.style.cssText = `
      position:fixed;top:90px;left:50%;transform:translateX(-50%) translateY(-20px);
      background:rgba(18,18,20,0.95);backdrop-filter:blur(20px);
      border:1px solid ${colors[type]};color:#fff;
      padding:12px 20px;border-radius:30px;font-size:13px;font-weight:600;
      z-index:99999;display:flex;align-items:center;gap:8px;
      box-shadow:0 8px 32px rgba(0,0,0,0.5);
      animation:toastIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275) forwards;
      white-space:nowrap;max-width:90vw;
    `;
    el.innerHTML = `<span style="color:${colors[type]}">${icons[type]}</span> ${msg}`;

    if (!document.getElementById("toast-style")) {
      const s = document.createElement("style");
      s.id = "toast-style";
      s.textContent = `
        @keyframes toastIn { from{opacity:0;transform:translateX(-50%) translateY(-20px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes toastOut { from{opacity:1} to{opacity:0;transform:translateX(-50%) translateY(-20px)} }
      `;
      document.head.appendChild(s);
    }

    document.body.appendChild(el);
    setTimeout(() => {
      el.style.animation = "toastOut 0.3s ease forwards";
      setTimeout(() => el.remove(), 300);
    }, duration);
  }

  // ── Loader ─────────────────────────────────────────────────
  function showLoader(msg = "جاري التحميل...") {
    let el = document.getElementById("chatoo-loader");
    if (!el) {
      el = document.createElement("div");
      el.id = "chatoo-loader";
      el.style.cssText = `
        position:fixed;inset:0;z-index:99998;background:rgba(9,9,11,0.85);
        backdrop-filter:blur(10px);display:flex;flex-direction:column;
        align-items:center;justify-content:center;gap:16px;
      `;
      el.innerHTML = `
        <div style="width:48px;height:48px;border:3px solid rgba(255,215,0,0.15);border-top-color:var(--gold);border-radius:50%;animation:spin 0.8s linear infinite;"></div>
        <div id="loader-msg" style="font-size:14px;opacity:0.7;">${msg}</div>
        <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
      `;
      document.body.appendChild(el);
    } else {
      document.getElementById("loader-msg").textContent = msg;
      el.style.display = "flex";
    }
  }

  function hideLoader() {
    const el = document.getElementById("chatoo-loader");
    if (el) el.style.display = "none";
  }

  // ── Confirm dialog ─────────────────────────────────────────
  function confirm(title, text, onConfirm) {
    if (typeof Swal !== "undefined") {
      Swal.fire({
        title, text,
        background: "#121214", color: "#fff",
        confirmButtonColor: "var(--primary)",
        cancelButtonColor: "#333",
        showCancelButton: true,
        confirmButtonText: "تأكيد",
        cancelButtonText: "إلغاء"
      }).then(r => r.isConfirmed && onConfirm());
    } else {
      if (window.confirm(`${title}\n${text}`)) onConfirm();
    }
  }

  // ── XP animation ──────────────────────────────────────────
  function animateXP(amount) {
    const el = document.createElement("div");
    el.style.cssText = `
      position:fixed;bottom:120px;right:20px;z-index:9000;
      color:var(--gold);font-size:20px;font-weight:900;
      animation:xpFloat 1.5s ease-out forwards;pointer-events:none;
    `;
    el.textContent = `+${amount} XP`;
    if (!document.getElementById("xp-anim-style")) {
      const s = document.createElement("style");
      s.id = "xp-anim-style";
      s.textContent = `@keyframes xpFloat{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-60px)}}`;
      document.head.appendChild(s);
    }
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }

  return { toast, showLoader, hideLoader, confirm, animateXP };
})();
