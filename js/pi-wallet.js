/**
 * js/pi-wallet.js
 * Pi Wallet — Real price from Netlify Function (CoinGecko)
 */

window.PiWallet = (() => {

  let priceData = null;
  let refreshInterval = null;

  async function fetchPrice() {
    try {
      const res = await fetch("/api/pi-price");
      priceData = await res.json();
      return priceData;
    } catch {
      return { usd: 0, eur: 0, change24h: 0 };
    }
  }

  function formatChange(val) {
    const v = parseFloat(val || 0).toFixed(2);
    const up = val >= 0;
    return `<span style="color:${up ? "#00ff88" : "#ff4757"}">${up ? "▲" : "▼"} ${Math.abs(v)}%</span>`;
  }

  async function open() {
    const existing = document.getElementById("modal-wallet");
    if (existing) { existing.classList.add("active"); refreshUI(); return; }

    const uid = localStorage.getItem("chatoo_uid");
    const username = localStorage.getItem("chatoo_pi_username") || "—";

    const el = document.createElement("div");
    el.id = "modal-wallet";
    el.className = "view-modal active";
    el.innerHTML = `
      <div style="height:100%;display:flex;flex-direction:column;background:#0a0a10;">

        <!-- Header -->
        <div style="padding:28px 20px 20px;background:linear-gradient(180deg,rgba(130,87,229,0.2),transparent);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
            <h2 style="margin:0;font-size:22px;">💳 المحفظة</h2>
            <button class="back-button" onclick="PiWallet.close()">✕</button>
          </div>

          <!-- Main balance card -->
          <div style="background:linear-gradient(135deg,#1a0a3e,#0f0f2e,#1a1a0e);border-radius:24px;padding:28px;border:1px solid rgba(255,215,0,0.2);position:relative;overflow:hidden;">
            <div style="position:absolute;top:-30px;right:-30px;width:120px;height:120px;background:rgba(130,87,229,0.1);border-radius:50%;"></div>
            <div style="position:absolute;bottom:-20px;left:-20px;width:80px;height:80px;background:rgba(255,215,0,0.05);border-radius:50%;"></div>

            <div style="position:relative;">
              <p style="opacity:0.5;font-size:12px;margin:0 0 4px;letter-spacing:1px;">TESTNET BALANCE</p>
              <div style="font-size:48px;font-weight:900;color:var(--gold);letter-spacing:-1px;" id="wallet-balance-pi">— π</div>
              <div style="font-size:15px;opacity:0.6;margin-top:4px;" id="wallet-balance-usd">جاري التحميل...</div>
              <div style="margin-top:16px;font-size:12px;" id="wallet-change">—</div>
            </div>

            <!-- Address -->
            <div style="margin-top:20px;background:rgba(0,0,0,0.3);border-radius:12px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;">
              <span id="wallet-address-short" style="font-size:11px;opacity:0.6;font-family:monospace;letter-spacing:0.5px;">—</span>
              <button onclick="PiWallet.copyAddress()" style="background:none;border:none;color:var(--gold);cursor:pointer;font-size:14px;">📋</button>
            </div>
          </div>
        </div>

        <!-- Scrollable content -->
        <div style="flex:1;overflow-y:auto;padding:0 20px 24px;">

          <!-- Price chart area -->
          <div style="background:var(--surface);border-radius:20px;padding:20px;margin-bottom:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
              <b>سعر Pi الحالي</b>
              <button onclick="PiWallet.refreshPrice()" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#fff;padding:6px 12px;border-radius:20px;font-size:11px;cursor:pointer;">🔄 تحديث</button>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;" id="wallet-price-grid">
              <div style="background:rgba(255,215,0,0.06);border-radius:14px;padding:14px;text-align:center;">
                <p style="margin:0;font-size:10px;opacity:0.5;">USD</p>
                <p id="wprice-usd" style="margin:4px 0 0;font-size:20px;font-weight:900;color:var(--gold);">$—</p>
              </div>
              <div style="background:rgba(130,87,229,0.06);border-radius:14px;padding:14px;text-align:center;">
                <p style="margin:0;font-size:10px;opacity:0.5;">EUR</p>
                <p id="wprice-eur" style="margin:4px 0 0;font-size:20px;font-weight:900;color:var(--primary);">€—</p>
              </div>
              <div style="background:rgba(0,255,136,0.05);border-radius:14px;padding:14px;text-align:center;grid-column:span 2;">
                <p style="margin:0;font-size:10px;opacity:0.5;">24h تغير</p>
                <p id="wprice-change" style="margin:4px 0 0;font-size:18px;font-weight:700;">—</p>
              </div>
            </div>
            <p style="margin:12px 0 0;font-size:10px;opacity:0.3;text-align:center;" id="wallet-price-ts">—</p>
          </div>

          <!-- Actions -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
            <button onclick="PiPayment.renderTransferModal()" style="background:linear-gradient(135deg,var(--primary),#5d3bb3);border:none;color:#fff;padding:16px;border-radius:16px;font-weight:800;cursor:pointer;font-size:14px;">
              💸 إرسال π
            </button>
            <button onclick="PiWallet.showReceive()" style="background:linear-gradient(135deg,#1a3e1a,#0f2e0f);border:1px solid rgba(0,255,136,0.2);color:#00ff88;padding:16px;border-radius:16px;font-weight:800;cursor:pointer;font-size:14px;">
              📥 استقبال
            </button>
          </div>

          <!-- Transaction History -->
          <div style="background:var(--surface);border-radius:20px;padding:20px;">
            <h3 style="margin:0 0 16px;font-size:15px;">📜 سجل المعاملات</h3>
            <div id="wallet-tx-list">
              <div style="text-align:center;padding:20px;opacity:0.3;font-size:13px;">لا توجد معاملات بعد</div>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(el);

    refreshUI();
    loadTransactions();

    // Auto-refresh price every 60s
    refreshInterval = setInterval(refreshPrice, 60000);
  }

  async function refreshUI() {
    const price = await fetchPrice();
    const username = localStorage.getItem("chatoo_pi_username") || "—";

    // Update price displays
    const usdEl    = document.getElementById("wprice-usd");
    const eurEl    = document.getElementById("wprice-eur");
    const chgEl    = document.getElementById("wprice-change");
    const tsEl     = document.getElementById("wallet-price-ts");
    const balUsd   = document.getElementById("wallet-balance-usd");
    const walletChg = document.getElementById("wallet-change");

    if (usdEl)   usdEl.textContent    = price.usd  ? `$${price.usd.toFixed(4)}`  : "$—";
    if (eurEl)   eurEl.textContent    = price.eur  ? `€${price.eur.toFixed(4)}`  : "€—";
    if (chgEl)   chgEl.innerHTML      = formatChange(price.change24h);
    if (tsEl)    tsEl.textContent     = price.timestamp ? "آخر تحديث: " + new Date(price.timestamp).toLocaleTimeString("ar") : "";
    if (balUsd)  balUsd.textContent   = price.usd ? `≈ $${(price.usd * 0).toFixed(2)} (Testnet)` : "Testnet — بدون قيمة حقيقية";
    if (walletChg) walletChg.innerHTML = formatChange(price.change24h);

    // Balance — testnet has no real balance endpoint, show placeholder
    const balEl = document.getElementById("wallet-balance-pi");
    if (balEl) balEl.textContent = "∞ π (Testnet)";

    // Address
    const addrEl = document.getElementById("wallet-address-short");
    if (addrEl) {
      const addr = localStorage.getItem("chatoo_wallet_address") || "—";
      addrEl.textContent = addr !== "—" ? addr.slice(0,6) + "..." + addr.slice(-6) : `@${username}`;
    }
  }

  async function refreshPrice() {
    ChatooUI.toast("جاري تحديث السعر...", "info");
    await refreshUI();
  }

  async function loadTransactions() {
    const uid = localStorage.getItem("chatoo_uid");
    if (!uid) return;
    const list = document.getElementById("wallet-tx-list");
    if (!list) return;

    try {
      const txs = await FirebaseService.getUserTransactions(uid);
      if (!txs.length) return;
      list.innerHTML = txs.map(tx => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
          <div>
            <div style="font-size:13px;font-weight:600;">${tx.memo || "تحويل"}</div>
            <div style="font-size:10px;opacity:0.4;">${tx.ts?.toDate ? tx.ts.toDate().toLocaleDateString("ar") : "—"}</div>
          </div>
          <div style="color:var(--gold);font-weight:700;">${tx.amount} π</div>
        </div>
      `).join("");
    } catch (e) {
      console.warn("[Wallet] TX load error:", e);
    }
  }

  function copyAddress() {
    const addr = localStorage.getItem("chatoo_wallet_address") || localStorage.getItem("chatoo_pi_username") || "—";
    navigator.clipboard.writeText(addr).then(() => ChatooUI.toast("تم نسخ العنوان ✓", "success"));
  }

  function showReceive() {
    const username = localStorage.getItem("chatoo_pi_username") || "—";
    ChatooUI.toast(`أعطِ هذا الاسم: @${username}`, "info");
  }

  function close() {
    if (refreshInterval) clearInterval(refreshInterval);
    const el = document.getElementById("modal-wallet");
    if (el) el.classList.remove("active");
  }

  return { open, close, refreshPrice, copyAddress, showReceive };
})();
