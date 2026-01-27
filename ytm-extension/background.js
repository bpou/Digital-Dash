const WS_URL = "ws://localhost:5174";

let ws = null;
let pendingPayload = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_DELAY = 30000;

const connect = () => {
  // Don't create a new connection if one is already connecting or open
  if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
    return;
  }

  try {
    ws = new WebSocket(WS_URL);
  } catch (err) {
    console.log("[YTM Background] Failed to create WebSocket:", err);
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    console.log("[YTM Background] Connected to server");
    reconnectAttempts = 0;
    if (pendingPayload) {
      sendPayload(pendingPayload);
      pendingPayload = null;
    }
  };

  ws.onclose = () => {
    console.log("[YTM Background] Disconnected, will retry...");
    ws = null;
    scheduleReconnect();
  };

  ws.onerror = (err) => {
    console.log("[YTM Background] WebSocket error:", err);
    // onclose will be called after onerror, so reconnect is handled there
  };
};

const scheduleReconnect = () => {
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY);
  reconnectAttempts++;
  console.log(`[YTM Background] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
  setTimeout(connect, delay);
};

const sendPayload = (payload) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(payload));
      console.log("[YTM Background] Sent payload");
    } catch (err) {
      console.log("[YTM Background] Error sending payload:", err);
      pendingPayload = payload;
    }
  } else {
    pendingPayload = payload;
    console.log("[YTM Background] Queued payload (not connected)");
    connect();
  }
};

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "YTM_NOW_PLAYING") {
    sendPayload(message.payload);
  }
});

// Initial connection
connect();
