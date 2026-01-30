import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { execFile, spawn } from "node:child_process";
import { URL } from "node:url";
import { systemBus, sessionBus, Variant } from "dbus-next";

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

const sendBinary = (res, status, mime, data) => {
  res.writeHead(status, {
    "Content-Type": mime,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(data);
};

const BTCTL = process.env.BLUETOOTHCTL_CMD ?? "bluetoothctl";
const PACTL = process.env.PACTL_CMD ?? "pactl";
const HOTSPOT_SCRIPT = process.env.HOTSPOT_SCRIPT ?? "tools/hotspot/start-hotspot.sh";
const MAX_ARTWORK_BYTES = Number(process.env.MAX_ARTWORK_BYTES ?? 5_000_000);
const artworkCache = new Map();
const webArtworkCache = new Map();
const WEB_ARTWORK_TTL_MS = Number(process.env.WEB_ARTWORK_TTL_MS ?? 6 * 60 * 60 * 1000);

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

const startHotspot = () =>
  new Promise((resolve, reject) => {
    execFile("bash", [HOTSPOT_SCRIPT], { timeout: 20000 }, (err, stdout, stderr) => {
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

const readJsonBody = (req) =>
  new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk.toString();
      if (raw.length > 5_000_000) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
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

const getArtworkUrl = (key) => {
  if (!key) return null;
  const base = process.env.ARTWORK_BASE_URL || `http://${os.hostname()}:5175`;
  return `${base}/media/artwork/${encodeURIComponent(key)}`;
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

const getMediaControlPlayerPath = async (mac) => {
  if (!mac) return "";
  const devicePath = `/org/bluez/hci0/dev_${mac.replace(/:/g, "_")}`;
  try {
    const raw = await runBusctl([
      "get-property",
      "org.bluez",
      devicePath,
      "org.bluez.MediaControl1",
      "Player",
    ]);
    const match = raw.match(/\"([^\"]+)\"/);
    return match ? match[1] : "";
  } catch {
    return "";
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
  const obexPort = Number(normalizeBusctlValue(entries.ObexPort) || 0);

  return {
    title: normalizeBusctlValue(entries.Title),
    album: normalizeBusctlValue(entries.Album),
    artist,
    durationSec: parseBusctlDurationSec(entries.Duration),
    imgHandle: normalizeBusctlValue(entries.ImgHandle) || normalizeBusctlValue(entries.ImageHandle),
    artworkUrl,
    obexPort: Number.isFinite(obexPort) ? obexPort : 0,
  };
};

const extractOfonoPaths = (raw) => {
  if (!raw) return [];
  const matches = Array.from(raw.matchAll(/"(\/ofono\/[^"]+)"/g)).map((match) => match[1]);
  return Array.from(new Set(matches));
};

const getOfonoModemPath = async () => {
  const raw = await runBusctl(["call", "org.ofono", "/", "org.ofono.Manager", "GetModems"]);
  const paths = extractOfonoPaths(raw);
  return paths[0] || "";
};

const getOfonoCallPaths = async (modemPath) => {
  if (!modemPath) return [];
  const raw = await runBusctl(["call", "org.ofono", modemPath, "org.ofono.VoiceCallManager", "GetCalls"]);
  return extractOfonoPaths(raw).filter((path) => path.includes("voicecall"));
};

const dialOfono = async (number) => {
  if (!number) throw new Error("Missing number");
  const modemPath = await getOfonoModemPath();
  if (!modemPath) throw new Error("No Ofono modem available");
  await runBusctl([
    "call",
    "org.ofono",
    modemPath,
    "org.ofono.VoiceCallManager",
    "Dial",
    "ss",
    number,
    "default",
  ]);
};

const answerOfono = async () => {
  const modemPath = await getOfonoModemPath();
  if (!modemPath) throw new Error("No Ofono modem available");
  const calls = await getOfonoCallPaths(modemPath);
  if (!calls.length) throw new Error("No call to answer");
  await runBusctl(["call", "org.ofono", calls[0], "org.ofono.VoiceCall", "Answer"]);
};

const hangupOfono = async () => {
  const modemPath = await getOfonoModemPath();
  if (!modemPath) throw new Error("No Ofono modem available");
  const calls = await getOfonoCallPaths(modemPath);
  if (!calls.length) throw new Error("No call to hang up");
  await runBusctl(["call", "org.ofono", calls[0], "org.ofono.VoiceCall", "Hangup"]);
};

const bluezBus = systemBus();
const logObex = (...args) => {
  console.log("[Bluetooth][OBEX]", ...args);
};

const canUseSessionBus = () => {
  if (process.env.DBUS_SESSION_BUS_ADDRESS) return true;
  return Boolean(process.env.DISPLAY || process.env.WAYLAND_DISPLAY || process.env.XDG_SESSION_TYPE);
};

const buildObexBusCandidates = () => {
  const candidates = [];
  if (canUseSessionBus()) {
    try {
      candidates.push({ name: "session", bus: sessionBus() });
    } catch (err) {
      logObex("Skipping session bus (unavailable)", err?.message ?? err);
    }
  } else {
    logObex("Skipping session bus (no DISPLAY/DBUS_SESSION_BUS_ADDRESS)");
  }
  candidates.push({ name: "system", bus: bluezBus });
  return candidates;
};

const obexBusCandidates = buildObexBusCandidates();
let obexBusInfo = null;
let obexClientPromise = null;
const obexSessions = new Map();
const obexSessionCreations = new Map();

const getObexClientInterface = async () => {
  if (obexClientPromise) return obexClientPromise;
  obexClientPromise = (async () => {
    for (const candidate of obexBusCandidates) {
      try {
        const proxy = await candidate.bus.getProxyObject("org.bluez.obex", "/org/bluez/obex");
        const iface = proxy.getInterface("org.bluez.obex.Client1");
        obexBusInfo = candidate;
        logObex(`Using ${candidate.name} bus for org.bluez.obex`);
        return iface;
      } catch (err) {
        logObex(`Failed to connect to org.bluez.obex on ${candidate.name} bus`, err?.message ?? err);
      }
    }
    logObex("OBEX client unavailable on all buses");
    obexClientPromise = null;
    return null;
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
    const obexBus = obexBusInfo?.bus ?? null;
    if (!client || !obexBus) {
      logObex("OBEX client unavailable; cannot create session");
      return null;
    }
    try {
      const options = new Variant("a{sv}", {
        Target: new Variant("s", "bip-avrcp"),
        PSM: new Variant("q", Number(port)),
      });
      const sessionPath = await client.CreateSession(mac, options);
      const sessionProxy = await obexBus.getProxyObject("org.bluez.obex", sessionPath);
      const imageInterface = sessionProxy.getInterface("org.bluez.obex.Image1");
      const sessionData = {
        path: sessionPath,
        port,
        imageInterface,
        lastHandle: "",
        artworkUrl: null,
        downloadPromise: null,
        mac,
      };
      obexSessions.set(mac, sessionData);
      logObex(`Created OBEX session for ${mac} at ${sessionPath} (PSM ${port})`);
      return sessionData;
    } catch (err) {
      logObex("Failed to create OBEX session", err?.message ?? err);
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

const getMediaPlayerStatus = async (playerPath) => {
  const raw = await getMediaPlayerPropertyRaw(playerPath, "Status");
  return raw.toLowerCase().includes("playing");
};

const callMediaPlayer = async (playerPath, method) => {
  if (!playerPath) throw new Error("No player path available");
  await runBusctl([
    "call",
    "org.bluez",
    playerPath,
    "org.bluez.MediaPlayer1",
    method,
  ]);
};

const playMedia = async (playerPath) => callMediaPlayer(playerPath, "Play");
const pauseMedia = async (playerPath) => callMediaPlayer(playerPath, "Pause");
const nextMedia = async (playerPath) => callMediaPlayer(playerPath, "Next");
const previousMedia = async (playerPath) => callMediaPlayer(playerPath, "Previous");

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

const putArtworkCache = (key, data, mime) => {
  if (!key || !data?.length) return null;
  if (data.length > MAX_ARTWORK_BYTES) {
    return null;
  }
  artworkCache.set(key, { data, mime, ts: Date.now() });
  return getArtworkUrl(key);
};

const readArtworkCache = (key) => {
  if (!key) return null;
  return artworkCache.get(key) ?? null;
};

const buildItunesQuery = (title, artist, album) => {
  const parts = [title, artist, album].map((value) => normalizeBusctlValue(value)).filter(Boolean);
  return parts.join(" ");
};

const getCachedWebArtwork = (key) => {
  if (!key) return null;
  const cached = webArtworkCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.ts > WEB_ARTWORK_TTL_MS) {
    webArtworkCache.delete(key);
    return null;
  }
  return cached.url;
};

const cacheWebArtwork = (key, url) => {
  if (!key || !url) return null;
  webArtworkCache.set(key, { url, ts: Date.now() });
  return url;
};

const fetchItunesArtwork = async (title, artist, album) => {
  const query = buildItunesQuery(title, artist, album);
  if (!query) return null;
  const cacheKey = query.toLowerCase();
  const cached = getCachedWebArtwork(cacheKey);
  if (cached) return cached;
  const url = new URL("https://itunes.apple.com/search");
  url.searchParams.set("term", query);
  url.searchParams.set("media", "music");
  url.searchParams.set("limit", "1");
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) return null;
  const data = await res.json();
  const item = Array.isArray(data?.results) ? data.results[0] : null;
  if (!item?.artworkUrl100) return null;
  const artwork = String(item.artworkUrl100).replace("100x100bb", "600x600bb");
  return cacheWebArtwork(cacheKey, artwork);
};

const withTimeout = async (promise, timeoutMs, label) => {
  if (!timeoutMs) return promise;
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(null), timeoutMs);
  });
  const result = await Promise.race([promise, timeout]);
  if (timer) clearTimeout(timer);
  if (result === null && label) {
    return null;
  }
  return result;
};

const downloadCoverArt = async (session, handle) => {
  if (!session?.imageInterface?.Get) return null;
  const targetFile = path.join(
    os.tmpdir(),
    `digital-dash-cover-${Date.now()}-${Math.random().toString(16).slice(2)}.img`
  );
  try {
    logObex(`Fetching cover art (handle=${handle}) to ${targetFile}`);
    await withTimeout(session.imageInterface.Get(targetFile, handle, {}), 5000, "obex-get");
    const data = await fs.readFile(targetFile);
    if (!data.length) return null;
    const mime = detectImageMime(data);
    const key = `${session.mac}:${handle}`;
    const url = putArtworkCache(key, data, mime);
    return url;
  } catch (err) {
    logObex("Cover art fetch failed", err?.message ?? err);
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

  const playerPath = (await getBluezPlayerPath(connected.mac)) || (await getMediaControlPlayerPath(connected.mac));
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
  try {
    const trackRaw = await runBusctl([
      "get-property",
      "org.bluez",
      playerPath,
      "org.bluez.MediaPlayer1",
      "Track",
    ]);
    const status = await getMediaPlayerStatus(playerPath);
    const track = parseBusctlDict(trackRaw);
    const obexPort = track.obexPort || (await getMediaPlayerObexPort(playerPath));
    if (!track.imgHandle) {
      logObex("No ImgHandle in track metadata", track);
    }
    if (!obexPort) {
      logObex("No ObexPort in track metadata or player properties");
    }
    if (obexPort > 0) {
      session = await ensureObexSession(connected.mac, obexPort);
    } else {
      await removeObexSession(connected.mac);
    }
     let artworkUrl = track.artworkUrl || session?.artworkUrl;
     if (track.imgHandle && session) {
       const fetched = await getArtworkUrlForSession(session, track.imgHandle);
       if (fetched) {
         artworkUrl = fetched;
       }
     }
     if (!artworkUrl && track.imgHandle) {
       const cached = readArtworkCache(`${connected.mac}:${track.imgHandle}`);
       if (cached) {
         artworkUrl = getArtworkUrl(`${connected.mac}:${track.imgHandle}`);
       }
     }
     if (!artworkUrl) {
       const webArtwork = await fetchItunesArtwork(track.title, track.artist, track.album);
       if (webArtwork) {
         artworkUrl = webArtwork;
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
  } catch (err) {
    logObex("Failed to fetch now playing metadata", err?.message ?? err);
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

    if (req.method === "POST" && url.pathname === "/hotspot/start") {
      await startHotspot();
      json(res, 200, { ok: true });
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
      try {
        await startHotspot();
      } catch (err) {
        logObex("Hotspot start failed", err?.message ?? err);
      }
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

    if (req.method === "POST" && url.pathname === "/media/control") {
      const action = url.searchParams.get("action");
      const mac = url.searchParams.get("mac");
      const targetMac = mac || (await getConnectedDevice())?.mac;
      if (!targetMac) {
        json(res, 400, { error: "No connected device" });
        return;
      }
      const playerPath = (await getBluezPlayerPath(targetMac)) || (await getMediaControlPlayerPath(targetMac));
      if (!playerPath) {
        json(res, 400, { error: "No media player" });
        return;
      }
      switch (action) {
        case "play":
          await playMedia(playerPath);
          break;
        case "pause":
          await pauseMedia(playerPath);
          break;
        case "next":
          await nextMedia(playerPath);
          break;
        case "prev":
          await previousMedia(playerPath);
          break;
        case "toggle": {
          const playing = await getMediaPlayerStatus(playerPath);
          if (playing) {
            await pauseMedia(playerPath);
          } else {
            await playMedia(playerPath);
          }
          break;
        }
        default:
          json(res, 400, { error: "Unknown action" });
          return;
      }
      json(res, 200, { ok: true });
      return;
    }

    if (req.method === "POST" && url.pathname === "/call/dial") {
      const number = url.searchParams.get("number");
      if (!number) {
        json(res, 400, { error: "Missing number" });
        return;
      }
      await dialOfono(number);
      json(res, 200, { ok: true });
      return;
    }

    if (req.method === "POST" && url.pathname === "/call/answer") {
      await answerOfono();
      json(res, 200, { ok: true });
      return;
    }

    if (req.method === "POST" && url.pathname === "/call/hangup") {
      await hangupOfono();
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

    if (req.method === "GET" && url.pathname.startsWith("/media/artwork/")) {
      const key = decodeURIComponent(url.pathname.replace("/media/artwork/", ""));
      const cached = readArtworkCache(key);
      if (!cached) {
        json(res, 404, { error: "Artwork not found" });
        return;
      }
      sendBinary(res, 200, cached.mime || "application/octet-stream", cached.data);
      return;
    }

    if (req.method === "POST" && url.pathname === "/media/artwork/upload") {
      const body = await readJsonBody(req);
      const { key, data, mime } = body ?? {};
      if (!key || !data) {
        json(res, 400, { error: "Missing key or data" });
        return;
      }
      const buffer = Buffer.from(String(data), "base64");
      const contentType = typeof mime === "string" && mime ? mime : detectImageMime(buffer);
      const url = putArtworkCache(String(key), buffer, contentType);
      if (!url) {
        json(res, 413, { error: "Artwork too large" });
        return;
      }
      json(res, 200, { ok: true, artworkUrl: url });
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
