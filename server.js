const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();

// optional kleine Route zum Testen im Browser
app.get("/", (req, res) => {
  res.send("✅ Lobby Signaling Server läuft!");
});

// Server erstellen (Hoster mapped 3000 → 443)
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Lobbys speichern
let hosts = {}; // {id: {ws, name, port, password, pw_value}}

wss.on("connection", (ws) => {
  let id = Math.random().toString(36).substring(2, 9);

  ws.on("message", (msg) => {
    let data = {};
    try {
      data = JSON.parse(msg);
    } catch (e) {
      console.error("Ungültige Nachricht", msg);
      return;
    }

    // 🏠 Host erstellt Lobby
    if (data.type === "host") {
      hosts[id] = {
        ws,
        name: data.name,
        port: data.port,
        password: data.password,
        pw_value: data.pw_value || ""
      };
      console.log(`Neue Lobby: ${data.name} (${id}) Port ${data.port}`);
      broadcast();
    }

    // 🎮 Client will joinen
    if (data.type === "join" && hosts[data.host]) {
      let host = hosts[data.host];
      let success = true;

      if (host.password && host.pw_value !== data.pw_value) {
        success = false;
      }

      ws.send(JSON.stringify({
        type: "join_result",
        success,
        lobby: host.name
      }));
    }
  });

  ws.on("close", () => {
    if (hosts[id]) {
      console.log(`Lobby geschlossen: ${hosts[id].name} (${id})`);
      delete hosts[id];
      broadcast();
    }
  });

  // 🔊 An alle Clients aktuelle Lobbyliste senden
  function broadcast() {
    let list = Object.keys(hosts).map((hid) => ({
      id: hid,
      name: hosts[hid].name,
      port: hosts[hid].port,
      password: hosts[hid].password
    }));
    wss.clients.forEach((c) => {
      if (c.readyState === WebSocket.OPEN) {
        c.send(JSON.stringify({ type: "list", hosts: list }));
      }
    });
  }
});

// Server starten (Port 3000, Hoster mapped auf 443)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🌍 Lobby Server läuft auf Port ${PORT}`);
});
