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
let connectUrl = `ws://${window.location.hostname}:8765`;

const BLINK_INTERVAL_MS = 330;
let blinkTimer: number | null = null;
let blinkPhaseOn = false;
let blinkEnabled = false;
let lastBlinkApplied = false;

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


export const useVehicleState = () => {
  const [vehicleState, setVehicleState] = useState(state);

  useEffect(() => {
    connect();
    startBlinkLoop();
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
