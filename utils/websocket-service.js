import { WebSocketServer } from "ws";

let wss = null;

function attachConnectionHandlers() {
  wss.on("connection", (ws) => {
    console.log("🔗 New client connected to WebSocket");

    ws.on("close", () => {
      console.log("❌ Client disconnected");
    });
  });
}

export default {
  /**
   * Attach WebSocket to the HTTP server (same port as the API — works behind reverse proxies).
   */
  attachToServer(httpServer, path = "/api/v1/ws") {
    if (wss) return;

    wss = new WebSocketServer({ server: httpServer, path });
    attachConnectionHandlers();
    console.log(`🔗 WebSocket server attached at ${path}`);
  },

  /**
   * Standalone WebSocket port (legacy dev fallback when WEBSOCKET_STANDALONE=true).
   */
  initStandalone() {
    if (wss) return;

    const port = process.env.WEBSOCKET_PORT || 8090;
    wss = new WebSocketServer({ port });
    attachConnectionHandlers();
    console.log(`🔗 WebSocket server listening on port ${port}`);
  },

  broadcast(messageObj) {
    if (!wss) {
      console.warn(`⚠️ WebSocket not initialized; skipped broadcast (${messageObj.type})`);
      return;
    }

    const message = JSON.stringify(messageObj);
    let sent = 0;

    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(message);
        sent++;
      }
    });

    if (sent === 0) {
      console.warn(`⚠️ WebSocket broadcast (${messageObj.type}) had no connected clients`);
    }
  },
};
