const STORAGE_KEY = "ai_chat_messages_v1";
const AUTH_KEY = "renard_auth";

const API_BASE = "https://api.renard.live/api";
const FLUSH_INTERVAL = 15 * 60 * 1000; // 15 minutes

console.log("[Renard] Background worker started");

/* -------------------- MESSAGE HANDLING -------------------- */

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "AUTH_LOGIN") {
    chrome.tabs.create({
      url: "https://renard.live/extension-login?source=extension",
    });
    return;
  }

  if (msg.type === "AUTH_LOGOUT") {
    chrome.storage.local.remove(AUTH_KEY, notifyAuth);
    return;
  }

  if (msg.type === "AUTH_STATUS") {
    chrome.storage.local.get(AUTH_KEY, (res) => {
      sendResponse({ authenticated: !!res[AUTH_KEY] });
    });
    return true;
  }

  if (msg.type === "NEW_MESSAGES") {
    storeMessages(msg, sendResponse);
    return true;
  }

  if (msg.type === "GET_STORED") {
    chrome.storage.local.get(STORAGE_KEY, (res) => {
      sendResponse({ data: res[STORAGE_KEY] || [] });
    });
    return true;
  }
});

/* -------------------- AUTH HANDSHAKE -------------------- */

chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
  if (msg.type === "AUTH_SUCCESS" && msg.token) {
    chrome.storage.local.set(
      {
        [AUTH_KEY]: {
          token: msg.token,
          user: msg.user,
          loggedInAt: Date.now(),
        },
      },
      () => {
        notifyAuth();
        chrome.action.openPopup?.();
        sendResponse({ ok: true });
      }
    );
  }

  return true;
});

function notifyAuth() {
  chrome.runtime.sendMessage({
    type: "AUTH_UPDATED",
    authenticated: true,
  });
}

/* -------------------- STORAGE -------------------- */

function storeMessages(msg, sendResponse) {
  chrome.storage.local.get(STORAGE_KEY, (res) => {
    const arr = res[STORAGE_KEY] || [];

    arr.push({
      site: msg.site,
      timestamp: Date.now(),
      messages: msg.messages,
    });

    chrome.storage.local.set({ [STORAGE_KEY]: arr }, () => {
      chrome.runtime.sendMessage({ type: "STORAGE_UPDATED" });
      sendResponse({ ok: true });
    });
  });
}

/* -------------------- FLUSH PIPELINE -------------------- */

async function flushToServer() {
  chrome.storage.local.get([STORAGE_KEY, AUTH_KEY], async (res) => {
    const auth = res[AUTH_KEY];
    const entries = res[STORAGE_KEY] || [];

    if (!auth || !auth.token) {
      console.log("[Renard] Not authenticated, skipping flush");
      return;
    }

    if (entries.length === 0) {
      console.log("[Renard] No data to flush");
      return;
    }

    // 🔁 Transform extension data → backend schema
    const messages = [];

    for (const entry of entries) {
      for (const m of entry.messages) {
        messages.push({
          activityType: "chat",
          content: m.text,
          metadata: {
            source: "browser-extension",
            site: entry.site,
            role: m.role,
            capturedAt: entry.timestamp,
          },
        });
      }
    }

    if (messages.length === 0) return;

    console.log(`[Renard] Flushing ${messages.length} messages`);

    try {
      const res = await fetch(`${API_BASE}/messages/batch`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      // ✅ Clear only after successful upload
      chrome.storage.local.set({ [STORAGE_KEY]: [] }, () => {
        console.log("[Renard] Flush successful, local buffer cleared");
        chrome.runtime.sendMessage({ type: "STORAGE_UPDATED" });
      });
    } catch (err) {
      console.error("[Renard] Flush failed, will retry", err);
    }
  });
}

/* -------------------- SCHEDULER -------------------- */

setInterval(flushToServer, FLUSH_INTERVAL);

// Also flush when extension starts
flushToServer();
