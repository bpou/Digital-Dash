import http from "node:http";
import { execFile } from "node:child_process";
import { URL } from "node:url";

const PORT = Number(process.env.BLUETOOTH_WS_PORT ?? 5175);
const SCAN_TIMEOUT_MS = 20000;

const json = (res, status, body) => {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(body));
};

const BTCTL = process.env.BLUETOOTHCTL_CMD ?? "bluetoothctl";

const runBtctl = (args) => {
  return new Promise((resolve, reject) => {
    execFile(BTCTL, args, { timeout: 10000 }, (err, stdout, stderr) => {
      if (err) {
        const details = `${stderr || ""}${stdout || ""}`.trim();
        reject(new Error(details || err.message));
        return;
      }
      resolve(stdout.toString());
    });
  });
};

const parseDevices = (output) => {
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      // format: "Device AA:BB:CC:DD:EE:FF Name"
      const match = line.match(/^Device\s+([0-9A-F:]{17})\s+(.+)$/i);
      if (!match) return null;
      return { mac: match[1], name: match[2] };
    })
    .filter(Boolean);
};

const parseInfo = (mac, output) => {
  const lines = output.split("\n");
  const get = (key) => {
    const line = lines.find((l) => l.trim().startsWith(`${key}:`));
    if (!line) return "";
    return line.split(":").slice(1).join(":").trim();
  };

  return {
    mac,
    name: get("Name"),
    alias: get("Alias"),
    connected: get("Connected") === "yes",
    paired: get("Paired") === "yes",
    trusted: get("Trusted") === "yes",
    blocked: get("Blocked") === "yes",
    rssi: get("RSSI") ? Number(get("RSSI")) : null,
  };
};

const listDevices = async () => {
  const knownRaw = await runBtctl(["devices"]);
  let pairedRaw = "";
  try {
    pairedRaw = await runBtctl(["paired-devices"]);
  } catch {
    pairedRaw = "";
  }
  const known = parseDevices(knownRaw);
  const paired = new Set(parseDevices(pairedRaw).map((d) => d.mac));

  const details = [];
  for (const device of known) {
    try {
      const info = await runBtctl(["info", device.mac]);
      const parsed = parseInfo(device.mac, info);
      details.push({
        ...parsed,
        name: parsed.name || device.name,
        paired: paired.has(device.mac) || parsed.paired,
      });
    } catch {
      details.push({
        mac: device.mac,
        name: device.name,
        alias: device.name,
        connected: false,
        paired: paired.has(device.mac),
        trusted: false,
        blocked: false,
        rssi: null,
      });
    }
  }

  return details;
};

let scanTimer = null;

const startScan = async () => {
  if (scanTimer) return;
  await runBtctl(["scan", "on"]);
  scanTimer = setTimeout(async () => {
    try {
      await runBtctl(["scan", "off"]);
    } catch {
      // ignore
    }
    scanTimer = null;
  }, SCAN_TIMEOUT_MS);
};

const stopScan = async () => {
  if (scanTimer) {
    clearTimeout(scanTimer);
    scanTimer = null;
  }
  await runBtctl(["scan", "off"]);
};

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    json(res, 404, { error: "Not Found" });
    return;
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (req.method === "GET" && url.pathname === "/devices") {
      const devices = await listDevices();
      json(res, 200, { devices });
      return;
    }

    if (req.method === "POST" && url.pathname === "/scan/start") {
      await startScan();
      json(res, 200, { ok: true });
      return;
    }

    if (req.method === "POST" && url.pathname === "/scan/stop") {
      await stopScan();
      json(res, 200, { ok: true });
      return;
    }

    if (req.method === "POST" && url.pathname === "/pair") {
      const mac = url.searchParams.get("mac");
      if (!mac) {
        json(res, 400, { error: "Missing mac" });
        return;
      }
      await runBtctl(["pair", mac]);
      await runBtctl(["trust", mac]);
      json(res, 200, { ok: true });
      return;
    }

    if (req.method === "POST" && url.pathname === "/connect") {
      const mac = url.searchParams.get("mac");
      if (!mac) {
        json(res, 400, { error: "Missing mac" });
        return;
      }
      await runBtctl(["connect", mac]);
      json(res, 200, { ok: true });
      return;
    }

    if (req.method === "POST" && url.pathname === "/disconnect") {
      const mac = url.searchParams.get("mac");
      if (!mac) {
        json(res, 400, { error: "Missing mac" });
        return;
      }
      await runBtctl(["disconnect", mac]);
      json(res, 200, { ok: true });
      return;
    }

    if (req.method === "POST" && url.pathname === "/remove") {
      const mac = url.searchParams.get("mac");
      if (!mac) {
        json(res, 400, { error: "Missing mac" });
        return;
      }
      await runBtctl(["remove", mac]);
      json(res, 200, { ok: true });
      return;
    }

    json(res, 404, { error: "Not Found" });
  } catch (err) {
    json(res, 500, { error: err instanceof Error ? err.message : "Unknown error" });
  }
});

server.listen(PORT, () => {
  console.log(`[Bluetooth] Service listening on http://localhost:${PORT}`);
});
