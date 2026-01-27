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

let state: VehicleState = {
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
};

const listeners = new Set<Listener>();
let socket: WebSocket | null = null;
let connectUrl = `ws://${window.location.hostname}:8765`;

let connectedOnce = false;
let mockInterval: number | null = null;

const notify = () => {
  listeners.forEach((listener) => listener(state));
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
    startMock();
    return;
  }

  socket.addEventListener("open", () => {
    connectedOnce = true;
  });

  socket.addEventListener("message", (event) => {
    try {
      const message = JSON.parse(event.data as string) as { type: string; payload: VehicleState };
      if (message.type === "state" && message.payload) {
        state = message.payload;
        notify();
      }
    } catch {
      // Ignore malformed messages
    }
  });

  socket.addEventListener("close", () => {
    socket = null;
    if (!connectedOnce) startMock();
    setTimeout(connect, 2000);
  });

  socket.addEventListener("error", () => {
    if (!connectedOnce) startMock();
  });
};

export const sendVehicleCommand = (type: string, payload?: unknown) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type, payload }));
    return;
  }

  applyCommand(type, payload);
  notify();
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const setTrack = (direction: 1 | -1) => {
  trackIndex = (trackIndex + direction + tracks.length) % tracks.length;
  const next = tracks[trackIndex];
  state = {
    ...state,
    audio: {
      ...state.audio,
      nowPlaying: {
        ...next,
        positionSec: 0,
        isPlaying: true,
      },
    },
  };
};

const applyCommand = (type: string, payload?: unknown) => {
  switch (type) {
    case "climate/set": {
      const next = payload as Partial<VehicleState["climate"]>;
      state = {
        ...state,
        climate: {
          ...state.climate,
          ...next,
          tempSetC: next?.tempSetC !== undefined ? clamp(next.tempSetC, 16, 28) : state.climate.tempSetC,
          fan: next?.fan !== undefined ? clamp(next.fan, 0, 5) : state.climate.fan,
        },
      };
      return;
    }
    case "audio/set": {
      const next = payload as Partial<VehicleState["audio"]>;
      state = {
        ...state,
        audio: {
          ...state.audio,
          ...next,
        },
      };
      return;
    }
    case "audio/control": {
      const action = (payload as { action?: string })?.action;
      if (action === "toggle") {
        state = {
          ...state,
          audio: {
            ...state.audio,
            nowPlaying: {
              ...state.audio.nowPlaying,
              isPlaying: !state.audio.nowPlaying.isPlaying,
            },
          },
        };
      }
      if (action === "play") {
        state = {
          ...state,
          audio: {
            ...state.audio,
            nowPlaying: {
              ...state.audio.nowPlaying,
              isPlaying: true,
            },
          },
        };
      }
      if (action === "pause") {
        state = {
          ...state,
          audio: {
            ...state.audio,
            nowPlaying: {
              ...state.audio.nowPlaying,
              isPlaying: false,
            },
          },
        };
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
      state = {
        ...state,
        turn: {
          ...state.turn,
          ...(payload as Partial<VehicleState["turn"]>),
        },
      };
      return;
    case "car/toggleLights":
      state = { ...state, car: { ...state.car, lights: !state.car.lights } };
      return;
    case "car/toggleHazards":
      state = { ...state, car: { ...state.car, hazards: !state.car.hazards } };
      return;
    case "car/toggleLock":
      state = { ...state, car: { ...state.car, locked: !state.car.locked } };
      return;
    default:
      return;
  }
};

const startMock = () => {
  if (mockInterval !== null) return;

  const seed = Math.random() * Math.PI * 2;
  let startTime = Date.now();

  mockInterval = window.setInterval(() => {
    const elapsed = (Date.now() - startTime) / 1000;
    const dt = 0.05;

    const wave = Math.sin(elapsed * 0.8 + seed);
    const wave2 = Math.sin(elapsed * 0.5 + seed * 1.5);

    const targetSpeed = clamp(80 + wave * 60 + wave2 * 40, 10, 190);
    const targetRpm = clamp(2000 + targetSpeed * 30 + Math.sin(elapsed * 1.2) * 600, 1000, 7500);
    const targetTemp = clamp(78 + Math.sin(elapsed * 0.15) * 8, 60, 110);

    const smoothSpeed = state.vehicle.speedKmh + (targetSpeed - state.vehicle.speedKmh) * 0.08;
    const smoothRpm = state.engine.rpm + (targetRpm - state.engine.rpm) * 0.1;
    const smoothTemp = state.temp.coolantC + (targetTemp - state.temp.coolantC) * 0.05;

    const nextFuel = clamp(state.fuel.percent - dt * 0.01, 15, 90);
    const duration = Math.max(1, state.audio.nowPlaying.durationSec);
    let nextPosition = state.audio.nowPlaying.positionSec;
    if (state.audio.nowPlaying.isPlaying) {
      nextPosition = (nextPosition + dt) % duration;
    }

    state = {
      ...state,
      vehicle: {
        speedKmh: smoothSpeed,
      },
      engine: {
        rpm: smoothRpm,
      },
      temp: {
        ...state.temp,
        coolantC: smoothTemp,
      },
      fuel: {
        percent: nextFuel,
      },
      electrical: {
        batteryV: 14.2 + Math.sin(elapsed * 0.4) * 0.3,
      },
      audio: {
        ...state.audio,
        nowPlaying: {
          ...state.audio.nowPlaying,
          positionSec: nextPosition,
        },
      },
    };

    notify();
  }, 50);
};

export const useVehicleState = () => {
  const [vehicleState, setVehicleState] = useState(state);

  useEffect(() => {
    connect();
    const unsubscribe = subscribe(setVehicleState);
    return () => unsubscribe();
  }, []);

  return vehicleState;
};

export const subscribe = (listener: Listener) => {
  listeners.add(listener);
  listener(state);
  return () => {
    listeners.delete(listener);
  };
};
