import http from "node:http";
import { execFile, spawn } from "node:child_process";
import { URL } from "node:url";

const PORT = Number(process.env.BLUETOOTH_WS_PORT ?? 5175);
const SCAN_TIMEOUT_MS = 20000;
const SCAN_TIMEOUT_SEC = Math.ceil(SCAN_TIMEOUT_MS / 1000);

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

const runBtctl = (args, timeoutMs = 10000) => {
  return new Promise((resolve, reject) => {
    execFile(BTCTL, args, { timeout: timeoutMs }, (err, stdout, stderr) => {
      if (err) {
        const details = `${stderr || ""}${stdout || ""}`.trim();
        reject(new Error(details || err.message));
        return;
      }
      resolve(stdout.toString());
    });
  });
};

const runBtctlBatch = (commands, timeoutMs = 20000) =>
  new Promise((resolve, reject) => {
    const child = spawn(BTCTL, [], { stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    let err = "";

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("bluetoothctl timed out"));
    }, timeoutMs);

    child.stdout.on("data", (data) => {
      out += data.toString();
    });
    child.stderr.on("data", (data) => {
      err += data.toString();
    });

    child.on("exit", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(out);
        return;
      }
      reject(new Error((err || out || `bluetoothctl exited ${code}`).trim()));
    });

    commands.forEach((cmd) => child.stdin.write(`${cmd}\n`));
    child.stdin.end();
  });

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
let scanProcess = null;
const pairSessions = new Map();

const startScan = async () => {
  if (scanTimer) return;
  if (!scanProcess) {
    const child = spawn(BTCTL, ["--timeout", String(SCAN_TIMEOUT_SEC), "scan", "on"], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
    scanProcess = child;
    scanProcess.on("exit", () => {
      scanProcess = null;
    });
  }
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
  if (scanProcess) {
    scanProcess = null;
  }
  await runBtctl(["scan", "off"]);
};

const startPairSession = (mac) => {
  const id = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const child = spawn(BTCTL, [], { stdio: ["pipe", "pipe", "pipe"] });
  const session = {
    id,
    mac,
    state: "pairing",
    passkey: null,
    error: null,
    child,
  };
  pairSessions.set(id, session);

  const handleLine = (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const passkeyMatch = trimmed.match(/passkey\s+([0-9]+)/i);
    if (passkeyMatch) {
      session.passkey = passkeyMatch[1];
      session.state = "confirm";
      return;
    }
    if (/pairing successful/i.test(trimmed)) {
      session.state = "paired";
      return;
    }
    if (/failed to pair|authentication canceled|authentication failed/i.test(trimmed)) {
      session.state = "failed";
      session.error = trimmed;
      return;
    }
  };

  child.stdout.on("data", (data) => {
    data
      .toString()
      .split("\n")
      .forEach(handleLine);
  });
  child.stderr.on("data", (data) => {
    data
      .toString()
      .split("\n")
      .forEach(handleLine);
  });

  child.on("exit", () => {
    if (session.state === "pairing") {
      session.state = "failed";
      session.error = session.error ?? "bluetoothctl exited";
    }
  });

  const send = (cmd) => child.stdin.write(`${cmd}\n`);
  send("agent on");
  send("default-agent");
  send("pairable on");
  send("discoverable on");
  send(`pair ${mac}`);

  return session;
};

const confirmPairSession = (id, accept) => {
  const session = pairSessions.get(id);
  if (!session) return null;
  try {
    session.child.stdin.write(`${accept ? "yes" : "no"}\n`);
  } catch {
    session.state = "failed";
    session.error = session.error ?? "Failed to respond to agent";
  }
  return session;
};

const finalizePairSession = async (session) => {
  if (!session || session.state !== "paired") return;
  try {
    await runBtctl(["trust", session.mac], 8000);
  } catch {
    // ignore trust failures
  }
  try {
    await runBtctl(["connect", session.mac], 10000);
  } catch {
    // ignore connect failures
  }
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
      const session = startPairSession(mac);
      json(res, 200, { ok: true, sessionId: session.id, state: session.state, passkey: session.passkey });
      return;
    }

    if (req.method === "GET" && url.pathname === "/pair/status") {
      const id = url.searchParams.get("id");
      if (!id) {
        json(res, 400, { error: "Missing id" });
        return;
      }
      const session = pairSessions.get(id);
      if (!session) {
        json(res, 404, { error: "Session not found" });
        return;
      }
      if (session.state === "paired") {
        await finalizePairSession(session);
      }
      json(res, 200, {
        id: session.id,
        mac: session.mac,
        state: session.state,
        passkey: session.passkey,
        error: session.error,
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/pair/confirm") {
      const id = url.searchParams.get("id");
      const accept = url.searchParams.get("accept") === "yes";
      if (!id) {
        json(res, 400, { error: "Missing id" });
        return;
      }
      const session = confirmPairSession(id, accept);
      if (!session) {
        json(res, 404, { error: "Session not found" });
        return;
      }
      json(res, 200, {
        id: session.id,
        mac: session.mac,
        state: session.state,
        passkey: session.passkey,
        error: session.error,
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/connect") {
      const mac = url.searchParams.get("mac");
      if (!mac) {
        json(res, 400, { error: "Missing mac" });
        return;
      }
      await runBtctlBatch([
        "agent on",
        "default-agent",
        `connect ${mac}`,
      ]);
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
