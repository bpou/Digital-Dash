import { useEffect, useState } from "react";
import type { VehicleState } from "../shared/vehicleTypes";

type Listener = (state: VehicleState) => void;

type Track = Omit<VehicleState["audio"]["nowPlaying"], "positionSec" | "isPlaying">;

const tracks: Track[] = [
  {
    title: "Midnight Lights",
    artist: "Eliora",
    album: "Signals",
    durationSec: 256,
  },
  {
    title: "Neon Drift",
    artist: "Atlas Run",
    album: "Night City",
    durationSec: 212,
  },
  {
    title: "Magnetic",
    artist: "Nova Phase",
    album: "Binary Sky",
    durationSec: 284,
  },
];

let trackIndex = 0;

let rawState: VehicleState = {
  turn: {
    mode: "off",
    left: false,
    right: false,
  },
  engine: {
    rpm: 1650,
  },
  vehicle: {
    speedKmh: 54,
  },
  fuel: {
    percent: 47,
  },
  temp: {
    oilC: 82,
    coolantC: 80,
  },
  electrical: {
    batteryV: 14.4,
  },
  climate: {
    tempSetC: 21,
    fan: 2,
    ac: true,
    recirc: false,
    defrost: false,
    auto: true,
  },
  audio: {
    volume: 38,
    muted: false,
    source: "bt",
    nowPlaying: {
      ...tracks[0],
      positionSec: 114,
      isPlaying: true,
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
};

let state: VehicleState = rawState;
const listeners = new Set<Listener>();
let socket: WebSocket | null = null;
let ytmSocket: WebSocket | null = null;
let connectUrl = `ws://${window.location.hostname}:8765`;
let ytmOverride: Partial<VehicleState["audio"]["nowPlaying"]> | null = null;
let btOverride: Partial<VehicleState["audio"]["nowPlaying"]> | null = null;
let btPollTimer: number | null = null;
const btBaseUrl = `http://${window.location.hostname}:5175`;
const ytmUrls = (() => {
  const host = window.location.hostname;
  const urls = [`ws://${host}:5174`];
  if (host !== "localhost") {
    urls.push("ws://localhost:5174");
  }
  return urls;
})();
let ytmUrlIndex = 0;

const BLINK_INTERVAL_MS = 330;
let blinkTimer: number | null = null;
let blinkPhaseOn = false;
let blinkEnabled = false;
let lastBlinkApplied = false;

const MOCK_INTERVAL_MS = 120;
let mockTimer: number | null = null;
let mockTick = 0;

const notify = () => {
  listeners.forEach((listener) => listener(state));
};

const commit = (next: VehicleState) => {
  rawState = next;
  deriveState();
};

const deriveState = () => {
  const hazardsOn = rawState.car.hazards;
  const mode = hazardsOn ? "hazard" : rawState.turn.mode;
  blinkEnabled = hazardsOn || mode !== "off";
  if (!blinkEnabled) {
    blinkPhaseOn = false;
    state = {
      ...rawState,
      turn: {
        ...rawState.turn,
        mode,
        left: rawState.turn.left,
        right: rawState.turn.right,
      },
    };
    return;
  }
  const leftOn = blinkPhaseOn && (mode === "left" || mode === "hazard");
  const rightOn = blinkPhaseOn && (mode === "right" || mode === "hazard");
  state = {
    ...rawState,
    turn: {
      ...rawState.turn,
      mode,
      left: leftOn,
      right: rightOn,
    },
  };
};

const applyBlinkPhase = () => {
  const shouldApply = blinkEnabled && blinkPhaseOn;
  if (shouldApply === lastBlinkApplied && blinkEnabled === false) return;
  lastBlinkApplied = shouldApply;
  deriveState();
  notify();
};

const startBlinkLoop = () => {
  if (blinkTimer !== null) return;
  blinkTimer = window.setInterval(() => {
    if (!blinkEnabled) {
      if (lastBlinkApplied) {
        lastBlinkApplied = false;
        blinkPhaseOn = false;
        deriveState();
        notify();
      }
      return;
    }
    blinkPhaseOn = !blinkPhaseOn;
    applyBlinkPhase();
  }, BLINK_INTERVAL_MS);
};

export const connectVehicleWS = (url: string) => {
  connectUrl = url;
  connect();
};

const connect = () => {
  if (socket && socket.readyState === WebSocket.OPEN) return;

  try {
    socket = new WebSocket(connectUrl);
  } catch {
    return;
  }

  socket.addEventListener("open", () => {
    stopMockLoop();
  });

  socket.addEventListener("message", (event) => {
    try {
      const message = JSON.parse(event.data as string) as {
        type: string;
        payload: VehicleState | (Omit<VehicleState, "ambient"> & { ambient?: VehicleState["ambient"] });
      };
      if (message.type === "state" && message.payload) {
        rawState = {
          ...(message.payload as VehicleState),
          ambient: message.payload.ambient ?? rawState.ambient,
        };
        if (btOverride) {
          rawState = {
            ...rawState,
            audio: {
              ...rawState.audio,
              nowPlaying: {
                ...rawState.audio.nowPlaying,
                ...btOverride,
              },
            },
          };
        }
        if (ytmOverride) {
          rawState = {
            ...rawState,
            audio: {
              ...rawState.audio,
              nowPlaying: {
                ...rawState.audio.nowPlaying,
                ...ytmOverride,
              },
            },
          };
        }
        deriveState();
        notify();
      }
    } catch {
      // Ignore malformed messages
    }
  });

  socket.addEventListener("close", () => {
    socket = null;
    setTimeout(connect, 2000);
  });

  socket.addEventListener("error", () => {
    // stay idle without mock updates
  });
};

const applyYtmNowPlaying = (payload: {
  title?: string;
  artist?: string;
  album?: string;
  artworkUrl?: string;
  durationSec?: number;
  positionSec?: number;
  isPlaying?: boolean;
}) => {
  if (!payload?.title && !payload?.artist) return;
  ytmOverride = {
    title: payload.title ?? rawState.audio.nowPlaying.title,
    artist: payload.artist ?? rawState.audio.nowPlaying.artist,
    album: payload.album ?? rawState.audio.nowPlaying.album,
    artworkUrl: payload.artworkUrl ?? rawState.audio.nowPlaying.artworkUrl,
    durationSec: Number.isFinite(payload.durationSec)
      ? Number(payload.durationSec)
      : rawState.audio.nowPlaying.durationSec,
    positionSec: Number.isFinite(payload.positionSec)
      ? Number(payload.positionSec)
      : rawState.audio.nowPlaying.positionSec,
    isPlaying:
      typeof payload.isPlaying === "boolean"
        ? payload.isPlaying
        : rawState.audio.nowPlaying.isPlaying,
  };
  commit({
    ...rawState,
    audio: {
      ...rawState.audio,
      nowPlaying: {
        ...rawState.audio.nowPlaying,
        ...ytmOverride,
      },
    },
  });
  notify();
};

const applyBtNowPlaying = (payload: {
  connected?: boolean;
  title?: string;
  artist?: string;
  album?: string;
  durationSec?: number;
  positionSec?: number;
  isPlaying?: boolean;
}) => {
  if (!payload?.connected) {
    btOverride = null;
    return;
  }
  btOverride = {
    title: payload.title ?? rawState.audio.nowPlaying.title,
    artist: payload.artist ?? rawState.audio.nowPlaying.artist,
    album: payload.album ?? rawState.audio.nowPlaying.album,
    durationSec: Number.isFinite(payload.durationSec)
      ? Number(payload.durationSec)
      : rawState.audio.nowPlaying.durationSec,
    positionSec: Number.isFinite(payload.positionSec)
      ? Number(payload.positionSec)
      : rawState.audio.nowPlaying.positionSec,
    isPlaying:
      typeof payload.isPlaying === "boolean"
        ? payload.isPlaying
        : rawState.audio.nowPlaying.isPlaying,
  };
  commit({
    ...rawState,
    audio: {
      ...rawState.audio,
      nowPlaying: {
        ...rawState.audio.nowPlaying,
        ...btOverride,
      },
    },
  });
  notify();
};

const connectYtm = () => {
  if (ytmSocket && (ytmSocket.readyState === WebSocket.OPEN || ytmSocket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const url = ytmUrls[ytmUrlIndex % ytmUrls.length];
  ytmUrlIndex += 1;

  try {
    ytmSocket = new WebSocket(url);
  } catch {
    ytmSocket = null;
    setTimeout(connectYtm, 2000);
    return;
  }

  ytmSocket.addEventListener("message", (event) => {
    try {
      const payload = JSON.parse(event.data as string);
      applyYtmNowPlaying(payload);
    } catch {
      // ignore malformed
    }
  });

  ytmSocket.addEventListener("close", () => {
    ytmSocket = null;
    setTimeout(connectYtm, 2000);
  });

  ytmSocket.addEventListener("error", () => {
    // reconnect on close
  });
};

const startBluetoothNowPlayingLoop = () => {
  if (btPollTimer !== null) return;
  btPollTimer = window.setInterval(async () => {
    try {
      const res = await fetch(`${btBaseUrl}/media/now-playing`);
      if (!res.ok) return;
      const payload = (await res.json()) as {
        connected?: boolean;
        title?: string;
        artist?: string;
        album?: string;
        durationSec?: number;
        positionSec?: number;
        isPlaying?: boolean;
      };
      if (ytmOverride) return;
      applyBtNowPlaying(payload);
    } catch {
      // ignore
    }
  }, 3000);
};

export const sendVehicleCommand = (type: string, payload?: unknown) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type, payload }));
    applyCommand(type, payload);
    notify();
    return;
  }

  applyCommand(type, payload);
  notify();
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const setTrack = (direction: 1 | -1) => {
  trackIndex = (trackIndex + direction + tracks.length) % tracks.length;
  const next = tracks[trackIndex];
  commit({
    ...rawState,
    audio: {
      ...rawState.audio,
      nowPlaying: {
        ...next,
        positionSec: 0,
        isPlaying: true,
      },
    },
  });
};

const applyCommand = (type: string, payload?: unknown) => {
  switch (type) {
    case "climate/set": {
      const next = payload as Partial<VehicleState["climate"]>;
      commit({
        ...rawState,
        climate: {
          ...rawState.climate,
          ...next,
          tempSetC: next?.tempSetC !== undefined ? clamp(next.tempSetC, 16, 28) : rawState.climate.tempSetC,
          fan: next?.fan !== undefined ? clamp(next.fan, 0, 5) : rawState.climate.fan,
        },
      });
      return;
    }
    case "audio/set": {
      const next = payload as Partial<VehicleState["audio"]>;
      commit({
        ...rawState,
        audio: {
          ...rawState.audio,
          ...next,
        },
      });
      return;
    }
    case "audio/control": {
      const action = (payload as { action?: string })?.action;
      if (action === "toggle") {
        commit({
          ...rawState,
          audio: {
            ...rawState.audio,
            nowPlaying: {
              ...rawState.audio.nowPlaying,
              isPlaying: !rawState.audio.nowPlaying.isPlaying,
            },
          },
        });
      }
      if (action === "play") {
        commit({
          ...rawState,
          audio: {
            ...rawState.audio,
            nowPlaying: {
              ...rawState.audio.nowPlaying,
              isPlaying: true,
            },
          },
        });
      }
      if (action === "pause") {
        commit({
          ...rawState,
          audio: {
            ...rawState.audio,
            nowPlaying: {
              ...rawState.audio.nowPlaying,
              isPlaying: false,
            },
          },
        });
      }
      if (action === "next") {
        setTrack(1);
      }
      if (action === "prev") {
        setTrack(-1);
      }
      return;
    }
    case "turn/set":
      commit({
        ...rawState,
        turn: {
          ...rawState.turn,
          ...(payload as Partial<VehicleState["turn"]>),
        },
      });
      return;
    case "car/toggleLights":
      commit({ ...rawState, car: { ...rawState.car, lights: !rawState.car.lights } });
      return;
    case "car/toggleHazards": {
      const hazardsOn = !rawState.car.hazards;
      commit({
        ...rawState,
        car: { ...rawState.car, hazards: hazardsOn },
        turn: {
          ...rawState.turn,
          mode: hazardsOn ? "hazard" : "off",
          left: false,
          right: false,
        },
      });
      return;
    }
    case "car/toggleLock":
      commit({ ...rawState, car: { ...rawState.car, locked: !rawState.car.locked } });
      return;
    case "ambient/set": {
      const next = payload as Partial<VehicleState["ambient"]>;
      commit({
        ...rawState,
        ambient: {
          ...rawState.ambient,
          ...next,
        },
      });
      return;
    }
    default:
      return;
  }
};

const startMockLoop = () => {
  if (mockTimer !== null) return;
  mockTimer = window.setInterval(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      stopMockLoop();
      return;
    }
    mockTick += 0.03;
    const rpm = 800 + ((Math.sin(mockTick) + 1) / 2) * 7200;
    const speedKmh = ((Math.sin(mockTick * 0.7 + 1.2) + 1) / 2) * 200;
    commit({
      ...rawState,
      engine: {
        ...rawState.engine,
        rpm,
      },
      vehicle: {
        ...rawState.vehicle,
        speedKmh,
      },
    });
    notify();
  }, MOCK_INTERVAL_MS);
};

const stopMockLoop = () => {
  if (mockTimer === null) return;
  window.clearInterval(mockTimer);
  mockTimer = null;
};

export const useVehicleState = () => {
  const [vehicleState, setVehicleState] = useState(state);

  useEffect(() => {
    connect();
    connectYtm();
    startBluetoothNowPlayingLoop();
    startBlinkLoop();
    startMockLoop();
    const unsubscribe = subscribe(setVehicleState);
    return () => unsubscribe();
  }, []);

  return vehicleState;
};

export const subscribe = (listener: Listener) => {
  listeners.add(listener);
  deriveState();
  listener(state);
  return () => {
    listeners.delete(listener);
  };
};
