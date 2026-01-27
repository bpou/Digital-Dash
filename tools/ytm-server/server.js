import http from "node:http";
import { WebSocketServer } from "ws";

const PORT = 5174;

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("YTM Server is running");
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  }
});

const wss = new WebSocketServer({ server });

wss.on("connection", (socket) => {
  console.log("[YTM Server] Client connected");
  socket.on("message", (raw) => {
    console.log(`[YTM Server] Message received: ${raw.toString().slice(0, 120)}`);
    console.log(`[YTM Server] Broadcasting to ${wss.clients.size} clients`);
    wss.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(raw);
      }
    });
  });

  socket.on("close", () => {
    console.log("[YTM Server] Client disconnected");
  });
});

server.listen(PORT, () => {
  console.log(`[YTM Server] Server started on port ${PORT}`);
});
