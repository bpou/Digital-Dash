import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { execFile, spawn } from "node:child_process";
import { URL } from "node:url";
import { systemBus } from "dbus-next";

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
const PACTL = process.env.PACTL_CMD ?? "pactl";

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

const runBusctl = (args, timeoutMs = 8000) =>
  new Promise((resolve, reject) => {
    execFile("busctl", ["--system", ...args], { timeout: timeoutMs }, (err, stdout, stderr) => {
      if (err) {
        const details = `${stderr || ""}${stdout || ""}`.trim();
        reject(new Error(details || err.message));
        return;
      }
      resolve(stdout.toString());
    });
  });

const runPactl = (args, timeoutMs = 8000) =>
  new Promise((resolve, reject) => {
    execFile(PACTL, args, { timeout: timeoutMs }, (err, stdout, stderr) => {
      if (err) {
        const details = `${stderr || ""}${stdout || ""}`.trim();
        reject(new Error(details || err.message));
        return;
      }
      resolve(stdout.toString());
    });
  });

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

const getConnectedDevice = async () => {
  const devices = await listDevices();
  return devices.find((d) => d.connected) ?? null;
};

const getBluezPlayerPath = async (mac) => {
  const devicePath = `/org/bluez/hci0/dev_${mac.replace(/:/g, "_")}`;
  const playerPath = `${devicePath}/player0`;
  try {
    await runBusctl(["introspect", "org.bluez", playerPath]);
    return playerPath;
  } catch {
    return null;
  }
};

const tokenizeBusctl = (raw) => {
  const tokens = [];
  let current = "";
  let inQuotes = false;
  const flush = () => {
    if (!current) return;
    tokens.push(current);
    current = "";
  };
  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i];
    if (char === '"') {
      if (inQuotes) {
        flush();
        inQuotes = false;
      } else {
        flush();
        inQuotes = true;
      }
      continue;
    }
    if (!inQuotes && /\s/.test(char)) {
      flush();
      continue;
    }
    current += char;
  }
  flush();
  return tokens;
};

const normalizeBusctlValue = (value) => {
  if (value === undefined || value === null) return "";
  const text = String(value).trim();
  if (!text || text === "-" || /^none$/i.test(text) || /^null$/i.test(text)) {
    return "";
  }
  return text;
};

const parseBusctlDurationSec = (value) => {
  const duration = Number(value);
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  if (duration > 10_000_000) {
    return Math.round(duration / 1_000_000);
  }
  if (duration > 10_000) {
    return Math.round(duration / 1000);
  }
  return Math.round(duration);
};

const parseBusctlDict = (raw) => {
  const tokens = tokenizeBusctl(raw);
  const entries = {};
  const types = new Set(["s", "o", "u", "t", "q", "i", "n", "y", "b", "as"]);
  for (let i = 0; i < tokens.length - 1; ) {
    const key = tokens[i];
    const type = tokens[i + 1];
    if (!types.has(type)) {
      i += 1;
      continue;
    }
    i += 2;
    if (type === "as") {
      const count = Number(tokens[i]);
      i += 1;
      const values = [];
      const total = Number.isFinite(count) ? count : 0;
      for (let j = 0; j < total && i < tokens.length; j += 1, i += 1) {
        values.push(tokens[i]);
      }
      entries[key] = values;
      continue;
    }
    entries[key] = tokens[i];
    i += 1;
  }

  const rawArtist = entries.Artist;
  const artist = Array.isArray(rawArtist)
    ? rawArtist.map((value) => normalizeBusctlValue(value)).filter(Boolean).join(", ")
    : normalizeBusctlValue(rawArtist);
  const artworkUrl =
    normalizeBusctlValue(entries.Artwork) ||
    normalizeBusctlValue(entries.Image) ||
    normalizeBusctlValue(entries.Cover) ||
    normalizeBusctlValue(entries.Icon);

  return {
    title: normalizeBusctlValue(entries.Title),
    album: normalizeBusctlValue(entries.Album),
    artist,
    durationSec: parseBusctlDurationSec(entries.Duration),
    imgHandle: normalizeBusctlValue(entries.ImgHandle) || normalizeBusctlValue(entries.ImageHandle),
    artworkUrl,
  };
};

const bus = systemBus();
let obexClientPromise = null;
const obexSessions = new Map();
const obexSessionCreations = new Map();

const getObexClientInterface = async () => {
  if (obexClientPromise) return obexClientPromise;
  obexClientPromise = (async () => {
    try {
      const proxy = await bus.getProxyObject("org.bluez.obex", "/org/bluez/obex");
      return proxy.getInterface("org.bluez.obex.Client1");
    } catch {
      obexClientPromise = null;
      return null;
    }
  })();
  return obexClientPromise;
};

const removeObexSession = async (mac) => {
  if (!mac) return;
  const session = obexSessions.get(mac);
  if (!session) return;
  obexSessions.delete(mac);
  obexSessionCreations.delete(mac);
  const client = await getObexClientInterface();
  if (!client) return;
  try {
    await client.RemoveSession(session.path);
  } catch {
    // ignore cleanup errors
  }
};

const cleanupObexSessions = async (keepMac) => {
  const tasks = [];
  for (const mac of Array.from(obexSessions.keys())) {
    if (keepMac && mac === keepMac) continue;
    tasks.push(removeObexSession(mac));
  }
  await Promise.all(tasks);
};

const ensureObexSession = async (mac, port) => {
  if (!mac || !port) {
    await removeObexSession(mac);
    return null;
  }
  const existing = obexSessions.get(mac);
  if (existing && existing.port === port) {
    return existing;
  }
  if (obexSessionCreations.has(mac)) {
    return obexSessionCreations.get(mac);
  }
  const creation = (async () => {
    await removeObexSession(mac);
    const client = await getObexClientInterface();
    if (!client) return null;
    try {
      const sessionPath = await client.CreateSession(mac, { Target: "bip-avrcp", PSM: Number(port) });
      const sessionProxy = await bus.getProxyObject("org.bluez.obex", sessionPath);
      const imageInterface = sessionProxy.getInterface("org.bluez.obex.Image1");
      const sessionData = {
        path: sessionPath,
        port,
        imageInterface,
        lastHandle: "",
        artworkUrl: null,
        downloadPromise: null,
      };
      obexSessions.set(mac, sessionData);
      return sessionData;
    } catch {
      return null;
    }
  })();
  obexSessionCreations.set(mac, creation);
  try {
    return await creation;
  } finally {
    obexSessionCreations.delete(mac);
  }
};

const getMediaPlayerPropertyRaw = async (playerPath, property) => {
  try {
    const raw = await runBusctl([
      "get-property",
      "org.bluez",
      playerPath,
      "org.bluez.MediaPlayer1",
      property,
    ]);
    return raw.trim();
  } catch {
    return "";
  }
};

const getMediaPlayerObexPort = async (playerPath) => {
  const raw = await getMediaPlayerPropertyRaw(playerPath, "ObexPort");
  const match = raw.match(/\b(\d+)\b/);
  if (!match) return 0;
  const port = Number(match[1]);
  return Number.isFinite(port) ? port : 0;
};

const detectImageMime = (buffer) => {
  if (!buffer || !buffer.length) return "application/octet-stream";
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  if (buffer.length >= 6) {
    const header = buffer.slice(0, 6).toString("ascii");
    if (header === "GIF89a" || header === "GIF87a") {
      return "image/gif";
    }
  }
  if (buffer.length >= 2 && buffer[0] === 0x42 && buffer[1] === 0x4d) {
    return "image/bmp";
  }
  return "application/octet-stream";
};

const downloadCoverArt = async (session, handle) => {
  if (!session?.imageInterface?.Get) return null;
  const targetFile = path.join(
    os.tmpdir(),
    `digital-dash-cover-${Date.now()}-${Math.random().toString(16).slice(2)}.img`
  );
  try {
    await session.imageInterface.Get(targetFile, handle, {});
    const data = await fs.readFile(targetFile);
    if (!data.length) return null;
    const mime = detectImageMime(data);
    return `data:${mime};base64,${data.toString("base64")}`;
  } catch {
    return null;
  } finally {
    await fs.unlink(targetFile).catch(() => {});
  }
};

const getArtworkUrlForSession = async (session, handle) => {
  if (!session || !handle) return null;
  if (session.lastHandle === handle && session.artworkUrl) {
    return session.artworkUrl;
  }
  if (session.downloadPromise) {
    return session.downloadPromise;
  }
  const promise = (async () => {
    const url = await downloadCoverArt(session, handle);
    if (url) {
      session.artworkUrl = url;
      session.lastHandle = handle;
    }
    return url;
  })();
  session.downloadPromise = promise;
  try {
    return await promise;
  } finally {
    session.downloadPromise = null;
  }
};
const getNowPlaying = async () => {
  const connected = await getConnectedDevice();
  if (!connected) {
    await cleanupObexSessions(null);
    return { connected: false };
  }

  await cleanupObexSessions(connected.mac);

  const playerPath = await getBluezPlayerPath(connected.mac);
  if (!playerPath) {
    await removeObexSession(connected.mac);
    return {
      connected: true,
      title: connected.name || connected.alias || "Bluetooth",
      artist: "Bluetooth Audio",
      album: "",
      durationSec: 0,
      positionSec: 0,
      isPlaying: true,
    };
  }

  let session = null;
  const obexPort = await getMediaPlayerObexPort(playerPath);
  if (obexPort > 0) {
    session = await ensureObexSession(connected.mac, obexPort);
  } else {
    await removeObexSession(connected.mac);
  }

  try {
    const trackRaw = await runBusctl([
      "get-property",
      "org.bluez",
      playerPath,
      "org.bluez.MediaPlayer1",
      "Track",
    ]);
    const statusRaw = await runBusctl([
      "get-property",
      "org.bluez",
      playerPath,
      "org.bluez.MediaPlayer1",
      "Status",
    ]);
    const status = statusRaw.toLowerCase().includes("playing");
    const track = parseBusctlDict(trackRaw);
    let artworkUrl = track.artworkUrl || session?.artworkUrl;
    if (track.imgHandle && session) {
      const fetched = await getArtworkUrlForSession(session, track.imgHandle);
      if (fetched) {
        artworkUrl = fetched;
      }
    }
    return {
      connected: true,
      title: track.title || connected.name || connected.alias || "Bluetooth",
      artist: track.artist || "Bluetooth Audio",
      album: track.album || "",
      durationSec: track.durationSec || 0,
      positionSec: 0,
      isPlaying: status,
      artworkUrl,
    };
  } catch {
    return {
      connected: true,
      title: connected.name || connected.alias || "Bluetooth",
      artist: "Bluetooth Audio",
      album: "",
      durationSec: 0,
      positionSec: 0,
      isPlaying: true,
      artworkUrl: session?.artworkUrl ?? undefined,
    };
  }
};

const findBluezSink = async (mac) => {
  const sinksRaw = await runPactl(["list", "short", "sinks"]);
  const target = `bluez_sink.${mac.replace(/:/g, "_")}`.toLowerCase();
  const line = sinksRaw
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.toLowerCase().includes(target));
  if (!line) return null;
  const parts = line.split(/\s+/);
  return parts[1] || null;
};

const setDefaultSink = async (sinkName) => {
  await runPactl(["set-default-sink", sinkName]);
  const inputsRaw = await runPactl(["list", "short", "sink-inputs"]);
  const ids = inputsRaw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split(/\s+/)[0])
    .filter(Boolean);
  for (const id of ids) {
    await runPactl(["move-sink-input", id, sinkName]);
  }
};

const ensureBluetoothAudio = async (mac) => {
  const sinkName = await findBluezSink(mac);
  if (!sinkName) {
    throw new Error("Bluetooth sink not available yet");
  }
  await setDefaultSink(sinkName);
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

    if (req.method === "GET" && url.pathname === "/media/now-playing") {
      const nowPlaying = await getNowPlaying();
      json(res, 200, nowPlaying);
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
      try {
        await ensureBluetoothAudio(mac);
      } catch {
        // ignore audio routing failures
      }
      json(res, 200, { ok: true });
      return;
    }

    if (req.method === "POST" && url.pathname === "/audio/use") {
      const mac = url.searchParams.get("mac");
      const device = mac ? { mac } : await getConnectedDevice();
      if (!device?.mac) {
        json(res, 400, { error: "No connected device" });
        return;
      }
      await ensureBluetoothAudio(device.mac);
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
