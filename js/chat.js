/**
 * js/chat.js
 * Real-time chat — Firestore listeners
 */

window.ChatooChat = (() => {
  let unsubscribe = null;
  let currentRoom = null;
  let mediaRecorder = null;
  let audioChunks = [];

  function open(venueName) {
    currentRoom = venueName.replace(/\s+/g, "_").toLowerCase();
    document.getElementById("chat-venue-name").textContent = venueName;
    document.getElementById("modal-chat").classList.add("active");
    listenMessages();
  }

  function close() {
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    document.getElementById("modal-chat").classList.remove("active");
  }

  function listenMessages() {
    if (!FirebaseService) return;
    const flow = document.getElementById("chat-flow");
    if (unsubscribe) unsubscribe();

    unsubscribe = FirebaseService.watchMessages(currentRoom, msgs => {
      flow.innerHTML = "";
      msgs.forEach(m => renderMessage(m, flow));
      flow.scrollTop = flow.scrollHeight;
    });
  }

  function renderMessage(m, container) {
    const uid = localStorage.getItem("chatoo_uid");
    const isMe = m.uid === uid;
    const div = document.createElement("div");

    if (m.type === "image") {
      div.className = `msg ${isMe ? "me" : "them"}`;
      div.innerHTML = `<img src="${m.url}" style="max-width:100%;border-radius:12px;display:block;" loading="lazy">`;
    } else if (m.type === "audio") {
      div.className = `msg ${isMe ? "me" : "them"}`;
      div.innerHTML = `<audio controls src="${m.url}" style="width:180px;height:36px;"></audio>`;
    } else {
      div.className = `msg ${isMe ? "me" : "them"}`;
      div.innerHTML = `
        ${!isMe ? `<div style="font-size:10px;opacity:0.5;margin-bottom:4px;">@${m.username || "—"}</div>` : ""}
        <div>${escapeHtml(m.text || "")}</div>
        <div style="font-size:9px;opacity:0.3;margin-top:4px;text-align:${isMe?"right":"left"}">${formatTime(m.ts)}</div>
      `;
    }
    container.appendChild(div);
  }

  async function sendMessage() {
    const input = document.getElementById("chat-input");
    const text = input.value.trim();
    if (!text || !currentRoom) return;

    const uid = localStorage.getItem("chatoo_uid");
    const username = localStorage.getItem("chatoo_pi_username") || "voyager";

    input.value = "";
    await FirebaseService.sendMessage(currentRoom, { uid, username, text, type: "text" });

    // Award XP
    if (uid) {
      FirebaseService.addXP(uid, CHATOO_CONFIG.xp.sendMessage, "message_sent");
      ChatooUI.animateXP(CHATOO_CONFIG.xp.sendMessage);
    }
  }

  async function handleFileUpload(input) {
    const file = input.files[0];
    if (!file || !currentRoom) return;
    const uid = localStorage.getItem("chatoo_uid");
    if (!uid) return ChatooUI.toast("سجل دخولك أولاً", "warn");

    ChatooUI.showLoader("جاري رفع الصورة...");
    try {
      const url = await FirebaseService.uploadImage(uid, file, pct => {
        document.getElementById("loader-msg").textContent = `رفع الصورة... ${pct}%`;
      });
      await FirebaseService.sendMessage(currentRoom, { uid, url, type: "image" });
      FirebaseService.addXP(uid, CHATOO_CONFIG.xp.sendImage, "image_sent");
      ChatooUI.animateXP(CHATOO_CONFIG.xp.sendImage);
    } catch (e) {
      ChatooUI.toast("فشل رفع الصورة", "error");
    } finally {
      ChatooUI.hideLoader();
      input.value = "";
    }
  }

  async function toggleVoiceNote() {
    const mic = document.getElementById("mic-icon");
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
        mediaRecorder.onstop = async () => {
          const blob = new Blob(audioChunks, { type: "audio/webm" });
          const file = new File([blob], `voice_${Date.now()}.webm`);
          const uid = localStorage.getItem("chatoo_uid");
          if (uid && currentRoom) {
            ChatooUI.showLoader("إرسال الرسالة الصوتية...");
            const url = await FirebaseService.uploadImage(uid, file, () => {});
            await FirebaseService.sendMessage(currentRoom, { uid, url, type: "audio" });
            FirebaseService.addXP(uid, CHATOO_CONFIG.xp.voiceNote, "voice_note");
            ChatooUI.hideLoader();
          }
          stream.getTracks().forEach(t => t.stop());
        };
        mediaRecorder.start();
        if (mic) { mic.textContent = "⏹"; mic.style.color = "var(--accent)"; }
        ChatooUI.toast("تسجيل... اضغط للإيقاف", "warn");
      } catch {
        ChatooUI.toast("تعذر الوصول للميكروفون", "error");
      }
    } else {
      mediaRecorder.stop();
      if (mic) { mic.textContent = "🎤"; mic.style.color = ""; }
    }
  }

  function sendOnEnter(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function escapeHtml(s) {
    return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  function formatTime(ts) {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" });
  }

  return { open, close, sendMessage, handleFileUpload, toggleVoiceNote, sendOnEnter };
})();
