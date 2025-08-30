// server.js
const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });
let hosts = {}; // {id: {ws, name, port, password, pw_value}}

wss.on("connection", (ws) => {
  let id = Math.random().toString(36).substring(2, 9);

  ws.on("message", (msg) => {
    let data = JSON.parse(msg);

    if (data.type === "host") {
      hosts[id] = {
        ws,
        name: data.name,
        port: data.port,
        password: data.password,
        pw_value: data.pw_value || ""
      };
      broadcast();
    }

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
    delete hosts[id];
    broadcast();
  });

  function broadcast() {
    let list = Object.keys(hosts).map((hid) => ({
      id: hid,
      name: hosts[hid].name,
      port: hosts[hid].port,
      password: hosts[hid].password
    }));
    wss.clients.forEach((c) =>
      c.send(JSON.stringify({ type: "list", hosts: list }))
    );
  }
});

console.log("Server läuft auf ws://localhost:8080");
