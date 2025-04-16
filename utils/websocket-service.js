import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: process.env.WEBSOCKET_PORT || 8090 });

wss.on("connection", (ws) => {
  console.log("🔗 New client connected to WebSocket");

  ws.on("close", () => {
    console.log("❌ Client disconnected");
  });
});

export default {
  broadcast: (messageObj) => {
    const message = JSON.stringify(messageObj);
    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(message);
      }
    });
  },
};
