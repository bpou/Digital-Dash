import fs from "fs";
import path from "path";
import mqtt from "mqtt";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";
import type { VehicleState } from "../../src/shared/vehicleTypes";

const MQTT_URL = process.env.MQTT_URL ?? "mqtt://localhost:1883";
const WS_PORT = Number(process.env.VEHICLE_WS_PORT ?? 8765);
const EVENT_LOG_SIZE = 100;
const BLINK_ON_MS = 330;
const BLINK_OFF_MS = 330;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATE_PATH = path.join(__dirname, "state.json");

const defaultGps: VehicleState["gps"] = {
  lat: 59.3293,
  lng: 18.0686,
  heading: 0,
  speedKmh: 0,
  speedMps: 0,
};

const defaultState: VehicleState = {
  turn: { mode: "off", left: false, right: false },
  engine: { rpm: 0 },
  vehicle: { speedKmh: 0 },
  fuel: { percent: 0 },
  temp: { oilC: 0, coolantC: 0 },
  electrical: { batteryV: 0 },
  climate: { tempSetC: 21, fan: 0, ac: false, recirc: false, defrost: false, auto: false },
  audio: {
    volume: 0,
    muted: false,
    source: "bt",
    nowPlaying: {
      title: "",
      artist: "",
      durationSec: 0,
      positionSec: 0,
      isPlaying: false,
    },
  },
  car: {
    lights: false,
    hazards: false,
    locked: true,
  },
  ambient: {
    color: "#7EE3FF",
    brightness: 65,
  },
  gps: defaultGps,
};

let state: VehicleState = { ...defaultState };
let blinkMode = "off" as VehicleState["turn"]["mode"];
let blinkPhaseOn = false;
let blinkTimer: NodeJS.Timeout | null = null;
let blinkStartMs = 0;
let lastBlinkLeft = false;
let lastBlinkRight = false;
let lastModeUpdateMs = 0;

const eventLog: Array<{ topic: string; payload: string; ts: number }> = [];

const readPersistedHazards = () => {
  try {
    if (!fs.existsSync(STATE_PATH)) return false;
    const raw = fs.readFileSync(STATE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as { hazards?: boolean };
    return Boolean(parsed.hazards);
  } catch {
    return false;
  }
};

const persistHazards = () => {
  try {
    fs.writeFileSync(
      STATE_PATH,
      JSON.stringify({ hazards: state.car.hazards }, null, 2),
      "utf-8"
    );
  } catch {
    // ignore persistence errors
  }
};

const logEvent = (topic: string, payload: string) => {
  eventLog.unshift({ topic, payload, ts: Date.now() });
  if (eventLog.length > EVENT_LOG_SIZE) {
    eventLog.pop();
  }
};

const wss = new WebSocketServer({ port: WS_PORT });
let lastBroadcast = 0;
let broadcastTimer: NodeJS.Timeout | null = null;

const broadcastState = () => {
  const payload = JSON.stringify({ type: "state", payload: state });
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(payload);
    }
  });
};

const scheduleBroadcast = () => {
  const now = Date.now();
  const elapsed = now - lastBroadcast;
  if (elapsed >= 50) {
    lastBroadcast = now;
    broadcastState();
    return;
  }
  if (broadcastTimer) return;
  broadcastTimer = setTimeout(() => {
    broadcastTimer = null;
    lastBroadcast = Date.now();
    broadcastState();
  }, 50 - elapsed);
};

const restoreHazards = () => {
  if (!readPersistedHazards()) return;
  state = { ...state, car: { ...state.car, hazards: true } };
  setBlinkMode("hazard");
  scheduleBroadcast();
};

const publishTurnPulse = (leftOn: boolean, rightOn: boolean, pulseOn: boolean) => {
  if (!mqttClient.connected) return;
  mqttClient.publish("car/state/turn/left", leftOn ? "1" : "0", { retain: true });
  mqttClient.publish("car/state/turn/right", rightOn ? "1" : "0", { retain: true });
  mqttClient.publish("car/state/turn/pulse", pulseOn ? "1" : "0", { retain: true });
};

const applyBlinkOutputs = (nextPhaseOn: boolean) => {
  const leftOn = blinkMode === "left" || blinkMode === "hazard" ? nextPhaseOn : false;
  const rightOn = blinkMode === "right" || blinkMode === "hazard" ? nextPhaseOn : false;
  if (leftOn === lastBlinkLeft && rightOn === lastBlinkRight) return;
  lastBlinkLeft = leftOn;
  lastBlinkRight = rightOn;
  state = { ...state, turn: { ...state.turn, left: leftOn, right: rightOn } };
  scheduleBroadcast();
  publishTurnPulse(leftOn, rightOn, nextPhaseOn);
};

const stopBlink = () => {
  if (blinkTimer) {
    clearTimeout(blinkTimer);
    blinkTimer = null;
  }
};

const scheduleBlink = () => {
  stopBlink();
  blinkStartMs = Date.now();
  const step = () => {
    const elapsed = Date.now() - blinkStartMs;
    const cycleMs = BLINK_ON_MS + BLINK_OFF_MS;
    const inOnPhase = elapsed % cycleMs < BLINK_ON_MS;
    blinkPhaseOn = inOnPhase;
    applyBlinkOutputs(blinkPhaseOn);
    blinkTimer = setTimeout(step, 30);
  };
  blinkPhaseOn = false;
  applyBlinkOutputs(false);
  blinkTimer = setTimeout(step, 0);
};

const setBlinkMode = (mode: VehicleState["turn"]["mode"]) => {
  lastModeUpdateMs = Date.now();
  blinkMode = mode;
  state = { ...state, turn: { ...state.turn, mode } };
  scheduleBroadcast();
  if (blinkMode === "off") {
    stopBlink();
    applyBlinkOutputs(false);
    return;
  }
  scheduleBlink();
};

wss.on("connection", (socket) => {
  socket.send(JSON.stringify({ type: "state", payload: state }));

  socket.on("message", (raw) => {
    try {
      const message = JSON.parse(raw.toString()) as { type: string; payload?: unknown };
      if (!message?.type) return;

      switch (message.type) {
        case "climate/set":
          mqttClient.publish("car/cmd/climate/set", JSON.stringify(message.payload ?? {}));
          return;
        case "audio/set":
          mqttClient.publish("car/cmd/audio/set", JSON.stringify(message.payload ?? {}));
          return;
        case "audio/control":
          mqttClient.publish("car/cmd/audio/control", JSON.stringify(message.payload ?? {}));
          return;
        case "bt/media/control":
          mqttClient.publish("car/cmd/bt/media/control", JSON.stringify(message.payload ?? {}));
          return;
        case "ambient/set":
          state = {
            ...state,
            ambient: {
              ...state.ambient,
              ...(message.payload as Partial<VehicleState["ambient"]>),
            },
          };
          scheduleBroadcast();
          mqttClient.publish("car/cmd/ambient/set", JSON.stringify(message.payload ?? {}));
          return;
        case "turn/set":
          mqttClient.publish("car/cmd/turn/set", JSON.stringify(message.payload ?? {}));
          return;
        case "car/toggleLights":
          state = { ...state, car: { ...state.car, lights: !state.car.lights } };
          scheduleBroadcast();
          mqttClient.publish("car/cmd/car", JSON.stringify({ action: message.type }));
          return;
        case "car/toggleHazards": {
          const hazardsOn = !state.car.hazards;
          state = { ...state, car: { ...state.car, hazards: hazardsOn } };
          setBlinkMode(hazardsOn ? "hazard" : "off");
          scheduleBroadcast();
          persistHazards();
          mqttClient.publish("car/cmd/car", JSON.stringify({ action: message.type }));
          return;
        }
        case "car/toggleLock":
          state = { ...state, car: { ...state.car, locked: !state.car.locked } };
          scheduleBroadcast();
          mqttClient.publish("car/cmd/car", JSON.stringify({ action: message.type }));
          return;
        default:
          return;
      }
    } catch {
      // ignore
    }
  });
});

console.log(`Vehicle WS listening on ws://localhost:${WS_PORT}`);
restoreHazards();

const mqttClient = mqtt.connect(MQTT_URL);

mqttClient.on("connect", () => {
  console.log(`MQTT connected: ${MQTT_URL}`);
  mqttClient.subscribe("car/state/#");
  mqttClient.subscribe("car/event/#");
});

const parseNumber = (payload: string) => {
  const value = Number(payload);
  return Number.isFinite(value) ? value : 0;
};

const parseFloatValue = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const ensureSpeedFields = (gps: VehicleState["gps"]): VehicleState["gps"] => {
  const next: VehicleState["gps"] = { ...gps };
  const hasSpeedMps = typeof next.speedMps === "number" && Number.isFinite(next.speedMps);
  const hasSpeedKmh = typeof next.speedKmh === "number" && Number.isFinite(next.speedKmh);
  if (!hasSpeedMps && hasSpeedKmh) {
    next.speedMps = next.speedKmh! / 3.6;
  }
  if (!hasSpeedKmh && hasSpeedMps) {
    next.speedKmh = next.speedMps! * 3.6;
  }
  return next;
};

const applyGpsUpdate = (next: Partial<VehicleState["gps"]>) => {
  const current = state.gps ?? defaultGps;
  const merged = ensureSpeedFields({ ...current, ...next });
  state = { ...state, gps: merged };
  scheduleBroadcast();
};

const parseGpsPayload = (raw: string): Partial<VehicleState["gps"]> | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const findValue = (obj: Record<string, unknown>, keys: string[]) => {
    for (const key of keys) {
      const value = parseFloatValue(obj[key]);
      if (value != null) return value;
    }
    return null;
  };

  const tryJson = (): Partial<VehicleState["gps"]> | null => {
    if (!trimmed.startsWith("{")) return null;
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed !== "object" || parsed === null) return null;
      const record = parsed as Record<string, unknown>;
      const lat = findValue(record, ["lat", "latitude", "lat_deg", "latitude_deg"]);
      const lng = findValue(record, ["lng", "lon", "longitude", "lng_deg", "longitude_deg"]);
      if (lat == null || lng == null) return null;
      const heading = findValue(record, ["heading", "bearing", "track", "course"]);
      const speedMps =
        findValue(record, ["speedMps", "speed_mps", "speed_ms", "speed_m_s"]) ??
        findValue(record, ["speed", "velocity", "speedMs"]);
      const speedKmh =
        findValue(record, ["speedKmh", "speed_kmh", "speed_km_h", "speedkmh"]) ??
        (speedMps != null ? speedMps * 3.6 : null);
      return { lat, lng, heading, speedMps: speedMps ?? null, speedKmh: speedKmh ?? null };
    } catch {
      return null;
    }
  };

  const tryNumbers = (): Partial<VehicleState["gps"]> | null => {
    const tokens = trimmed.split(/[,\s;|]+/);
    const numbers: number[] = [];
    for (const token of tokens) {
      let candidate = token.trim();
      if (!candidate) continue;
      if (candidate.includes("=")) {
        candidate = candidate.split("=").slice(1).join("=");
      }
      if (candidate.includes(":")) {
        candidate = candidate.split(":").slice(1).join(":");
      }
      if (candidate.startsWith("$")) {
        candidate = candidate.slice(1);
      }
      const value = parseFloatValue(candidate);
      if (value != null) {
        numbers.push(value);
      }
    }
    if (numbers.length < 2) return null;
    const result: Partial<VehicleState["gps"]> = {
      lat: numbers[0],
      lng: numbers[1],
    };
    if (numbers.length > 2) {
      result.heading = numbers[2];
    }
    if (numbers.length > 3) {
      result.speedMps = numbers[3];
    }
    return result;
  };

  return tryJson() ?? tryNumbers();
};

const handleGpsSubtopic = (topic: string, payload: string): boolean => {
  const suffix = topic.split("/").pop()?.toLowerCase();
  if (!suffix) return false;
  const value = parseFloatValue(payload);
  if (value == null) return false;
  const partial: Partial<VehicleState["gps"]> = {};
  switch (suffix) {
    case "lat":
    case "latitude":
    case "lat_deg":
    case "latitude_deg":
    case "latdeg":
      partial.lat = value;
      break;
    case "lng":
    case "lon":
    case "long":
    case "longitude":
    case "lng_deg":
    case "longitude_deg":
      partial.lng = value;
      break;
    case "heading":
    case "bearing":
    case "track":
    case "course":
      partial.heading = value;
      break;
    case "speed":
    case "speed_mps":
    case "speed_ms":
    case "speed_m_s":
    case "speedms":
      partial.speedMps = value;
      break;
    case "speed_kmh":
    case "speed_km_h":
    case "speed_kmh_raw":
    case "speedkmh":
      partial.speedKmh = value;
      break;
    default:
      break;
  }
  if (!Object.keys(partial).length) return false;
  applyGpsUpdate(partial);
  return true;
};

const handleGpsTopic = (topic: string, payload: string): boolean => {
  const bases = ["car/state/gps", "car/state/location"];
  if (bases.includes(topic)) {
    const parsed = parseGpsPayload(payload);
    if (!parsed) return false;
    applyGpsUpdate(parsed);
    return true;
  }
  for (const base of bases) {
    if (topic.startsWith(`${base}/`)) {
      return handleGpsSubtopic(topic, payload);
    }
  }
  return false;
};

mqttClient.on("message", (topic, raw) => {
  const payload = raw.toString();

  if (handleGpsTopic(topic, payload)) {
    return;
  }

  if (topic.startsWith("car/event/")) {
    logEvent(topic, payload);
    return;
  }

  switch (topic) {
    case "car/state/turn/mode": {
      const mode = payload as VehicleState["turn"]["mode"];
      setBlinkMode(mode);
      return;
    }
    case "car/state/turn/left":
    case "car/state/turn/right":
      // Ignore direct turn pulses from elsewhere; Pi owns pulse generation.
      return;
    case "car/state/engine/rpm":
      state = { ...state, engine: { rpm: parseNumber(payload) } };
      scheduleBroadcast();
      return;
    case "car/state/vehicle/speedKmh":
      state = { ...state, vehicle: { speedKmh: parseNumber(payload) } };
      scheduleBroadcast();
      return;
    case "car/state/fuel/percent":
      state = { ...state, fuel: { percent: parseNumber(payload) } };
      scheduleBroadcast();
      return;
    case "car/state/temp/oilC":
      state = { ...state, temp: { ...state.temp, oilC: parseNumber(payload) } };
      scheduleBroadcast();
      return;
    case "car/state/temp/coolantC":
      state = { ...state, temp: { ...state.temp, coolantC: parseNumber(payload) } };
      scheduleBroadcast();
      return;
    case "car/state/electrical/batteryV":
      state = { ...state, electrical: { batteryV: parseNumber(payload) } };
      scheduleBroadcast();
      return;
    case "car/state/climate": {
      try {
        const climate = JSON.parse(payload) as VehicleState["climate"];
        state = { ...state, climate };
      } catch {
        // ignore
      }
      scheduleBroadcast();
      return;
    }
    case "car/state/audio": {
      try {
        const audio = JSON.parse(payload) as VehicleState["audio"];
        state = { ...state, audio };
      } catch {
        // ignore
      }
      scheduleBroadcast();
      return;
    }
    default:
      return;
  }
});

process.on("SIGINT", () => {
  mqttClient.end(true);
  wss.close();
  process.exit(0);
});
