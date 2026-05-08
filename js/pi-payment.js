/**
 * js/pi-payment.js
 * Pi Network Payment Flow — Testnet
 * Server verification via Netlify Function
 */

window.PiPayment = (() => {

  async function pay({ amount, memo, metadata = {}, onSuccess, onError }) {
    if (!window.Pi) return ChatooUI.toast("Pi Browser مطلوب", "warn");
    if (!PiAuth.isLoggedIn()) return ChatooUI.toast("سجل دخولك أولاً", "warn");

    const callbacks = {
      onReadyForServerApproval: async (paymentId) => {
        try {
          const res = await fetch("/api/pi-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId, action: "approve" })
          });
          if (!res.ok) throw new Error("Approval failed");
          console.log("[Pi] Payment approved:", paymentId);
        } catch (e) {
          console.error("[Pi] Approval error:", e);
          onError && onError(e);
        }
      },

      onReadyForServerCompletion: async (paymentId, txid) => {
        try {
          const res = await fetch("/api/pi-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId, txid, action: "complete" })
          });
          const data = await res.json();

          // Save to Firestore
          const uid = localStorage.getItem("chatoo_uid");
          if (uid) {
            await FirebaseService.savePiTransaction(uid, {
              paymentId, txid, amount, memo, status: "completed",
              metadata
            });
            // Award XP for purchase
            await FirebaseService.addXP(uid, CHATOO_CONFIG.xp.checkIn * amount, "pi_payment");
          }

          ChatooUI.toast(`تم الدفع ✅ ${amount} π`, "success");
          onSuccess && onSuccess({ paymentId, txid, data });

        } catch (e) {
          console.error("[Pi] Completion error:", e);
          onError && onError(e);
        }
      },

      onCancel: (paymentId) => {
        console.log("[Pi] Payment cancelled:", paymentId);
        ChatooUI.toast("تم إلغاء الدفع", "warn");
      },

      onError: (error, payment) => {
        console.error("[Pi] Payment error:", error, payment);
        ChatooUI.toast("خطأ في الدفع: " + error.message, "error");
        onError && onError(error);
      }
    };

    try {
      const payment = await Pi.createPayment({ amount, memo, metadata }, callbacks);
      return payment;
    } catch (e) {
      ChatooUI.toast("فشل إنشاء الدفع", "error");
      onError && onError(e);
    }
  }

  // ── Quick send Pi to user ─────────────────────────────────
  function renderTransferModal() {
    const modal = document.getElementById("modal-pi-transfer");
    if (modal) { modal.classList.add("active"); return; }

    const el = document.createElement("div");
    el.id = "modal-pi-transfer";
    el.className = "view-modal active";
    el.innerHTML = `
      <div style="height:100%;display:flex;flex-direction:column;background:var(--dark);">
        <div style="padding:24px 20px;background:rgba(0,0,0,0.6);display:flex;justify-content:space-between;align-items:center;">
          <h2 style="margin:0;">💸 تحويل Pi</h2>
          <button class="back-button" onclick="document.getElementById('modal-pi-transfer').classList.remove('active')">✕</button>
        </div>
        <div style="padding:24px;flex:1;overflow-y:auto;">
          <div style="background:var(--surface);border-radius:20px;padding:20px;margin-bottom:20px;border:1px solid rgba(255,215,0,0.15);">
            <p style="opacity:0.6;font-size:12px;margin:0 0 6px;">رصيدك المقدر</p>
            <div id="transfer-balance" style="font-size:32px;font-weight:900;color:var(--gold);">— π</div>
            <div id="transfer-usd" style="font-size:13px;opacity:0.5;margin-top:4px;">≈ $0.00</div>
          </div>

          <div style="display:flex;flex-direction:column;gap:14px;">
            <div>
              <label style="font-size:12px;opacity:0.6;display:block;margin-bottom:6px;">المستلم (اسم مستخدم Pi)</label>
              <input id="transfer-to" type="text" placeholder="@username" style="width:100%;background:var(--surface);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:14px 16px;color:#fff;font-size:15px;direction:ltr;">
            </div>
            <div>
              <label style="font-size:12px;opacity:0.6;display:block;margin-bottom:6px;">المبلغ (π)</label>
              <input id="transfer-amount" type="number" step="0.01" min="0.01" placeholder="0.01" style="width:100%;background:var(--surface);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:14px 16px;color:#fff;font-size:15px;direction:ltr;">
            </div>
            <div>
              <label style="font-size:12px;opacity:0.6;display:block;margin-bottom:6px;">ملاحظة (اختياري)</label>
              <input id="transfer-memo" type="text" placeholder="تحويل من Chatoo..." style="width:100%;background:var(--surface);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:14px 16px;color:#fff;font-size:15px;">
            </div>
            <button onclick="PiPayment.executeTransfer()" style="width:100%;background:linear-gradient(90deg,var(--gold),#ff8c00);border:none;color:#000;padding:16px;border-radius:16px;font-weight:900;font-size:16px;cursor:pointer;margin-top:8px;">
              إرسال π
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(el);
    loadBalance();
  }

  async function loadBalance() {
    try {
      const res = await fetch("/api/pi-price");
      const data = await res.json();
      const balEl = document.getElementById("transfer-balance");
      const usdEl = document.getElementById("transfer-usd");
      if (balEl) balEl.textContent = "— π (Testnet)";
      if (usdEl) usdEl.textContent = `1 π ≈ $${data.usd?.toFixed(4) || "—"}`;
    } catch {}
  }

  async function executeTransfer() {
    const to     = document.getElementById("transfer-to")?.value?.trim();
    const amount = parseFloat(document.getElementById("transfer-amount")?.value);
    const memo   = document.getElementById("transfer-memo")?.value?.trim() || "Chatoo Transfer";

    if (!to)            return ChatooUI.toast("أدخل اسم المستلم", "warn");
    if (!amount || amount < 0.01) return ChatooUI.toast("أدخل مبلغاً صحيحاً (min 0.01π)", "warn");

    await pay({
      amount, memo,
      metadata: { to, source: "chatoo_transfer" },
      onSuccess: () => {
        document.getElementById("modal-pi-transfer")?.classList.remove("active");
        document.getElementById("transfer-to").value = "";
        document.getElementById("transfer-amount").value = "";
      }
    });
  }

  return { pay, renderTransferModal, executeTransfer };
})();
