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
  async function getVenues() {
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

  // ── Achievements & Titles ─────────────────────────────────
  async function unlockAchievement(uid, achievementId) {
    if (!db) return false;
    const ref = db.collection("users").doc(uid);
    const userDoc = await ref.get();
    if (!userDoc.exists) return false;

    const userData = userDoc.data();
    const achievements = userData.achievements || {};
    if (achievements[achievementId]) return false; // Already unlocked

    const achievement = CHATOO_CONFIG.achievements[achievementId];
    if (!achievement) return false;

    const updatedAchievements = { ...achievements, [achievementId]: true };
    const titles = userData.titles || [];
    if (!titles.includes(achievement.title)) {
      titles.push(achievement.title);
    }

    await ref.set({
      achievements: updatedAchievements,
      titles: titles
    }, { merge: true });

    // Award XP
    await addXP(uid, achievement.xp, `achievement_${achievementId}`);

    return { title: achievement.title, xp: achievement.xp };
  }

  async function getAchievements(uid) {
    if (!db) return {};
    const doc = await db.collection("users").doc(uid).get();
    return doc.exists ? (doc.data().achievements || {}) : {};
  }

  async function getTitles(uid) {
    if (!db) return [];
    const doc = await db.collection("users").doc(uid).get();
    return doc.exists ? (doc.data().titles || []) : [];
  }

  // ── Venue Visits ──────────────────────────────────────────
  async function checkInVenue(uid, venueName) {
    if (!db) return false;
    const ref = db.collection("users").doc(uid);
    const userDoc = await ref.get();
    if (!userDoc.exists) return false;

    const userData = userDoc.data();
    const visited = userData.visitedVenues || [];
    if (visited.includes(venueName)) return false; // Already visited

    const newVisited = [...visited, venueName];
    await ref.set({ visitedVenues: newVisited }, { merge: true });

    // Award XP for check-in
    await addXP(uid, CHATOO_CONFIG.xp.checkIn, `checkin_${venueName}`);

    // Check explorer achievement (3 unique venues)
    if (newVisited.length >= 3) {
      await unlockAchievement(uid, "explorer");
    }

    // Check check-in king (10 check-ins)
    const totalCheckins = (userData.totalCheckins || 0) + 1;
    await ref.set({ totalCheckins }, { merge: true });
    if (totalCheckins >= 10) {
      await unlockAchievement(uid, "checkInKing");
    }

    return true;
  }

  async function getVisitedVenues(uid) {
    if (!db) return [];
    const doc = await db.collection("users").doc(uid).get();
    return doc.exists ? (doc.data().visitedVenues || []) : [];
  }

  // ── Message Count (for socialButterfly) ───────────────────
  async function incrementMessageCount(uid) {
    if (!db) return;
    const ref = db.collection("users").doc(uid);
    const userDoc = await ref.get();
    if (!userDoc.exists) return;

    const count = (userDoc.data().messageCount || 0) + 1;
    await ref.set({ messageCount: count }, { merge: true });

    if (count >= 100) {
      await unlockAchievement(uid, "socialButterfly");
    }
  }

  return { init, saveUser, getUser, watchUser, addXP, sendMessage, watchMessages, getVenues, saveVenue, savePiTransaction, getUserTransactions, uploadImage, canClaimDaily, claimDailyReward, unlockAchievement, getAchievements, getTitles, checkInVenue, getVisitedVenues, incrementMessageCount };
})();
