# 🚀 Chatoo Ultra Pro — Web3 Edition
> Built by **Kamikaz007** | Pi Network Testnet | Firebase + Netlify

---

## 📁 هيكلة المشروع

```
chatoo/
├── index.html                  ← الصفحة الرئيسية
├── config.js                   ← إعدادات الapp
├── netlify.toml                ← إعدادات Netlify
├── .gitignore                  ← حماية الأسرار
├── .env.example                ← نموذج المتغيرات
│
├── js/
│   ├── ui.js                   ← Toast، Loader، مساعدات UI
│   ├── firebase-service.js     ← كل عمليات Firestore
│   ├── pi-auth.js              ← تسجيل دخول Pi Network
│   ├── pi-payment.js           ← نظام الدفع بـ Pi
│   ├── pi-wallet.js            ← المحفظة + سعر Pi الحقيقي
│   ├── chat.js                 ← الدردشة الحية
│   └── map.js                  ← خريطة Leaflet
│
├── netlify/
│   └── functions/
│       ├── pi-payment.js       ← Server: تحقق من دفعات Pi
│       └── pi-price.js         ← Server: جلب سعر Pi الحقيقي
│
└── video/
    └── background.mp4          ← فيديو الخلفية (أضفه يدوياً)
```

---

## ⚙️ إعداد Netlify (Environment Variables)

اذهب إلى: **Netlify → Site Settings → Environment Variables**

أضف هذه المتغيرات:

| المتغير | القيمة |
|---------|--------|
| `FIREBASE_API_KEY` | `AIzaSyD9L74WN6V_4lOrIoaQPPtyi_SO-LLtayA` |
| `FIREBASE_AUTH_DOMAIN` | `chatoo-4566f.firebaseapp.com` |
| `FIREBASE_PROJECT_ID` | `chatoo-4566f` |
| `FIREBASE_STORAGE_BUCKET` | `chatoo-4566f.firebasestorage.app` |
| `FIREBASE_MESSAGING_SENDER_ID` | `724118831864` |
| `FIREBASE_APP_ID` | `1:724118831864:web:2cca10fa8d290d4288f10d` |
| `PI_API_KEY` | مفتاح Pi من Developer Portal |
| `PI_SANDBOX` | `true` |

---

## 🔥 إعداد Firebase

1. اذهب إلى [Firebase Console](https://console.firebase.google.com)
2. المشروع: **chatoo-4566f**
3. فعّل هذه الخدمات:

### Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth == null || request.auth.uid == uid;
    }
    match /rooms/{room}/messages/{msg} {
      allow read, write: if true;
    }
    match /venues/{venue} {
      allow read: if true;
      allow write: if false;
    }
    match /transactions/{tx} {
      allow read, write: if true;
    }
  }
}
```

### Storage Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{uid}/images/{file} {
      allow read: if true;
      allow write: if resource == null && request.resource.size < 5 * 1024 * 1024;
    }
  }
}
```

---

## 🔵 إعداد Pi Network

1. اذهب إلى [Pi Developer Portal](https://developers.minepi.com)
2. أنشئ app جديد
3. أضف domain موقعك على Netlify
4. انسخ API Key → ضعه في Netlify env vars

---

## 🚀 رفع على GitHub + Netlify

```bash
# في مجلد المشروع
git init
git add .
git commit -m "🚀 Chatoo Ultra Pro v3.0.0"
git remote add origin https://github.com/USERNAME/chatoo-ultra-pro.git
git push -u origin main
```

ثم اربط GitHub بـ Netlify → سيتم النشر تلقائياً.

---

## ✅ Features

- 🗺️ **خريطة حية** — Leaflet + Firestore venues
- 💬 **دردشة حية** — Firestore real-time
- 🔵 **Pi Auth** — تسجيل دخول حقيقي
- 💸 **Pi Payment** — دفع حقيقي على Testnet
- 💳 **محفظة** — سعر Pi الحقيقي من CoinGecko
- 🔒 **Netlify Functions** — API key آمن على السيرفر
- 🎁 **متجر XP + Pi**
- 📸 **رفع صور** — Firebase Storage
- 🎤 **رسائل صوتية**
