/**
 * js/firebase-service.js
 * Central Firebase service — Firestore + Storage
 */

window.FirebaseService = (() => {
  let db = null, storage = null, ready = false;

  function init() {
    if (ready) return true;
    try {
      if (!firebase.apps.length) firebase.initializeApp(CHATOO_CONFIG.firebase);
      db = firebase.firestore();
      storage = firebase.storage();
      db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
      ready = true;
      console.log("🔥 Firebase → chatoo-4566f ✓");
      return true;
    } catch (e) {
      console.error("[Firebase]", e.message);
      return false;
    }
  }

  // ── Users ──────────────────────────────────────────────────
  async function saveUser(uid, data) {
    if (!db) return;
    return db.collection("users").doc(uid).set({ ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
  }

  async function getUser(uid) {
    if (!db) return null;
    const snap = await db.collection("users").doc(uid).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  }

  function watchUser(uid, cb) {
    if (!db) return () => {};
    return db.collection("users").doc(uid).onSnapshot(snap => {
      if (snap.exists) cb({ id: snap.id, ...snap.data() });
    });
  }

  // ── XP ────────────────────────────────────────────────────
  async function addXP(uid, amount, reason) {
    if (!db) return;
    const ref = db.collection("users").doc(uid);
    return db.runTransaction(async tx => {
      const doc = await tx.get(ref);
      const current = doc.exists ? (doc.data().xp || 0) : 0;
      tx.set(ref, {
        xp: current + amount,
        xpLog: firebase.firestore.FieldValue.arrayUnion({ amount, reason, ts: Date.now() })
      }, { merge: true });
      return current + amount;
    });
  }

  // ── Chat Messages ─────────────────────────────────────────
  async function sendMessage(roomId, msg) {
    if (!db) return;
    return db.collection("rooms").doc(roomId).collection("messages").add({
      ...msg,
      ts: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  function watchMessages(roomId, cb) {
    if (!db) return () => {};
    return db.collection("rooms").doc(roomId).collection("messages")
      .orderBy("ts", "asc").limitToLast(60)
      .onSnapshot(snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }

  // ── Venues ────────────────────────────────────────────────
  async function getVenues(lat, lon, radiusKm = 50) {
    if (!db) return [];
    const snap = await db.collection("venues").limit(30).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async function saveVenue(data) {
    if (!db) return;
    return db.collection("venues").add({ ...data, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
  }

  // ── Transactions ──────────────────────────────────────────
  async function savePiTransaction(uid, tx) {
    if (!db) return;
    return db.collection("transactions").add({
      uid, ...tx,
      ts: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  async function getUserTransactions(uid) {
    if (!db) return [];
    const snap = await db.collection("transactions")
      .where("uid", "==", uid).orderBy("ts", "desc").limit(20).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  // ── File Upload ───────────────────────────────────────────
  async function uploadImage(uid, file, onProgress) {
    if (!storage) return null;
    const ref = storage.ref(`users/${uid}/images/${Date.now()}_${file.name}`);
    const task = ref.put(file);
    return new Promise((res, rej) => {
      task.on("state_changed",
        snap => onProgress && onProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
        rej,
        async () => { const url = await ref.getDownloadURL(); res(url); }
      );
    });
  }

  // ── Daily Reward ──────────────────────────────────────────
  async function canClaimDaily(uid) {
    if (!db) return false;
    const doc = await db.collection("users").doc(uid).get();
    if (!doc.exists) return true;
    const last = doc.data().lastDailyReward;
    if (!last) return true;
    const diff = Date.now() - last.toDate().getTime();
    return diff > 86400000; // 24h
  }

  async function claimDailyReward(uid) {
    if (!db) return 0;
    const can = await canClaimDaily(uid);
    if (!can) return -1; // already claimed
    const newXP = await addXP(uid, CHATOO_CONFIG.xp.dailyLogin, "daily_reward");
    await db.collection("users").doc(uid).set(
      { lastDailyReward: firebase.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
    return CHATOO_CONFIG.xp.dailyLogin;
  }

  return { init, saveUser, getUser, watchUser, addXP, sendMessage, watchMessages, getVenues, saveVenue, savePiTransaction, getUserTransactions, uploadImage, canClaimDaily, claimDailyReward };
})();
