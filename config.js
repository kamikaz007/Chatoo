/**
 * config.js — CHATOO ULTRA PRO
 * Firebase config is injected by Netlify at build time.
 * No secrets are hardcoded here.
 * Built by: Kamikaz007
 */

const CHATOO_CONFIG = {

  // Injected by Netlify build from Environment Variables
  firebase: {
    apiKey:            typeof __FIREBASE_API_KEY__            !== "undefined" ? __FIREBASE_API_KEY__            : "AIzaSyD9L74WN6V_4lOrIoaQPPtyi_SO-LLtayA",
    authDomain:        typeof __FIREBASE_AUTH_DOMAIN__        !== "undefined" ? __FIREBASE_AUTH_DOMAIN__        : "chatoo-4566f.firebaseapp.com",
    projectId:         typeof __FIREBASE_PROJECT_ID__         !== "undefined" ? __FIREBASE_PROJECT_ID__         : "chatoo-4566f",
    storageBucket:     typeof __FIREBASE_STORAGE_BUCKET__     !== "undefined" ? __FIREBASE_STORAGE_BUCKET__     : "chatoo-4566f.firebasestorage.app",
    messagingSenderId: typeof __FIREBASE_MESSAGING_SENDER_ID__ !== "undefined" ? __FIREBASE_MESSAGING_SENDER_ID__ : "724118831864",
    appId:             typeof __FIREBASE_APP_ID__             !== "undefined" ? __FIREBASE_APP_ID__             : "1:724118831864:web:2cca10fa8d290d4288f10d"
  },

  pi: {
    sandbox: true,
    scopes: ["username", "payments", "wallet_address"]
  },

  map: {
    defaultCenter: [36.8065, 10.1815],
    defaultZoom: 13,
    darkTileLayer:   "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    satelliteLayer:  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
  },

  xp: {
    sendMessage: 5,
    sendImage:   10,
    dailyLogin:  50,
    checkIn:     25,
    referral:    200,
    voiceNote:   8
  },

  // New: Achievements & Titles
  achievements: {
    nightOwl: {
      id: "nightOwl",
      title: "بومة الليل",
      desc: "أرسل رسالة بعد منتصف الليل",
      xp: 50,
      icon: "🦉"
    },
    explorer: {
      id: "explorer",
      title: "مستكشف",
      desc: "زر 3 أماكن مختلفة",
      xp: 40,
      icon: "🧭"
    },
    socialButterfly: {
      id: "socialButterfly",
      title: "فراشة اجتماعية",
      desc: "أرسل 100 رسالة",
      xp: 100,
      icon: "🦋"
    },
    checkInKing: {
      id: "checkInKing",
      title: "ملك الحضور",
      desc: "سجل حضورك 10 مرات",
      xp: 80,
      icon: "👑"
    }
  },

  // Floating venue bubbles config
  floatingBubbles: {
    maxBubbles: 8,
    animationDurationRange: [15, 25] // seconds
  }
};

Object.freeze(CHATOO_CONFIG);
