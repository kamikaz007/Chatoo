/**
 * js/pi-auth.js
 * Pi Network Authentication — Testnet
 */

window.PiAuth = (() => {
  let piUser = null;

  async function init() {
    if (!window.Pi) { console.warn("[PiAuth] Pi SDK not loaded"); return false; }
    try {
      Pi.init({ version: "2.0", sandbox: CHATOO_CONFIG.pi.sandbox });
      console.log("🔵 Pi SDK initialized (sandbox:", CHATOO_CONFIG.pi.sandbox, ")");
      return true;
    } catch (e) {
      console.error("[PiAuth] init error:", e);
      return false;
    }
  }

  async function authenticate() {
    if (!window.Pi) {
      ChatooUI.toast("Pi Browser مطلوب لتسجيل الدخول", "warn");
      return null;
    }
    try {
      ChatooUI.showLoader("جاري الاتصال بـ Pi Network...");
      const auth = await Pi.authenticate(CHATOO_CONFIG.pi.scopes, onIncompletePayment);
      piUser = auth.user;
      const uid = `pi_${piUser.uid}`;

      // Save to Firestore
      await FirebaseService.saveUser(uid, {
        uid,
        piUid:       piUser.uid,
        username:    piUser.username,
        displayName: piUser.username,
        avatar:      `https://minepi.com/api/v2/users/${piUser.username}/avatar`,
        walletAddress: auth.user.wallet_address || null,
        loginAt:     firebase.firestore.FieldValue.serverTimestamp()
      });

      localStorage.setItem("chatoo_uid", uid);
      localStorage.setItem("chatoo_pi_username", piUser.username);

      ChatooUI.hideLoader();
      ChatooUI.toast(`مرحباً ${piUser.username} 🎉`, "success");
      updateHeaderUI(piUser);
      return { uid, piUser };

    } catch (e) {
      ChatooUI.hideLoader();
      ChatooUI.toast("فشل تسجيل الدخول: " + e.message, "error");
      return null;
    }
  }

  async function onIncompletePayment(payment) {
    console.warn("[PiAuth] Incomplete payment found:", payment.identifier);
    try {
      await fetch("/api/pi-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: payment.identifier, action: "complete", txid: payment.transaction?.txid })
      });
    } catch (e) {
      console.error("[PiAuth] Failed to complete incomplete payment:", e);
    }
  }

  function updateHeaderUI(user) {
    const signInBtn = document.getElementById("btn-pi-signin");
    const profileSection = document.getElementById("header-profile-section");
    const avatarImg = document.getElementById("header-avatar-img");
    const rankLabel = document.getElementById("rank-label");

    if (signInBtn)     signInBtn.style.display = "none";
    if (profileSection) profileSection.style.display = "flex";
    if (avatarImg)     avatarImg.src = `https://minepi.com/api/v2/users/${user.username}/avatar`;
    if (rankLabel)     rankLabel.textContent = user.username.toUpperCase();
  }

  function getCurrentUser() { return piUser; }
  function isLoggedIn() { return !!piUser; }

  return { init, authenticate, getCurrentUser, isLoggedIn };
})();
