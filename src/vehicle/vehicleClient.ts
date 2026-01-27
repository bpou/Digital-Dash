import { useEffect, useState } from "react";

type AudioSource = "BT" | "AUX" | "Spotify";

export type VehicleState = {
  speedKmh: number;
  rpm: number;
  fuelPct: number;
  rangeKm: number;
  batteryV: number;
  auxV: number;
  tempC: number;
  audio: {
    volume: number;
    source: AudioSource;
    nowPlaying: {
      title: string;
      artist: string;
      album?: string;
      artworkUrl?: string;
      durationSec: number;
      positionSec: number;
    };
    isPlaying: boolean;
  };
  climate: {
    tempSet: number;
    fan: number;
    ac: boolean;
    recirc: boolean;
    defrost: boolean;
    auto: boolean;
  };
  car: {
    lights: boolean;
    hazards: boolean;
    locked: boolean;
  };
};

type Command =
  | { type: "audio/togglePlay" }
  | { type: "audio/next" }
  | { type: "audio/prev" }
  | { type: "audio/setVolume"; payload: number }
  | { type: "audio/setSource"; payload: AudioSource }
  | { type: "climate/setTemp"; payload: number }
  | { type: "climate/setFan"; payload: number }
  | { type: "climate/toggleAc" }
  | { type: "climate/toggleRecirc" }
  | { type: "climate/toggleDefrost" }
  | { type: "climate/toggleAuto" }
  | { type: "car/toggleLights" }
  | { type: "car/toggleHazards" }
  | { type: "car/toggleLock" };

type Listener = (state: VehicleState) => void;

const listeners = new Set<Listener>();

const tracks = [
  {
    title: "Midnight Lights",
    artist: "Eliora",
    album: "Signals",
    artworkUrl: "",
    durationSec: 256,
  },
  {
    title: "Neon Drift",
    artist: "Atlas Run",
    album: "Night City",
    artworkUrl: "",
    durationSec: 212,
  },
  {
    title: "Magnetic",
    artist: "Nova Phase",
    album: "Binary Sky",
    artworkUrl: "",
    durationSec: 284,
  },
];

let trackIndex = 0;

let state: VehicleState = {
  speedKmh: 54,
  rpm: 1650,
  fuelPct: 47,
  rangeKm: 250,
  batteryV: 14.4,
  auxV: 0,
  tempC: 80,
  audio: {
    volume: 38,
    source: "BT",
    nowPlaying: {
      ...tracks[0],
      positionSec: 114,
    },
    isPlaying: true,
  },
  climate: {
    tempSet: 21,
    fan: 2,
    ac: true,
    recirc: false,
    defrost: false,
    auto: true,
  },
  car: {
    lights: false,
    hazards: false,
    locked: true,
  },
};

const notify = () => {
  listeners.forEach((listener) => listener(state));
};

export const subscribe = (listener: Listener) => {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
};

export const getVehicleState = () => state;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const nextTrack = (direction: 1 | -1) => {
  trackIndex = (trackIndex + direction + tracks.length) % tracks.length;
  const next = tracks[trackIndex];
  state = {
    ...state,
    audio: {
      ...state.audio,
      nowPlaying: {
        ...next,
        positionSec: 0,
      },
    },
  };
};

export const sendCommand = (type: Command["type"], payload?: unknown) => {
  switch (type) {
    case "audio/togglePlay":
      state = { ...state, audio: { ...state.audio, isPlaying: !state.audio.isPlaying } };
      break;
    case "audio/next":
      nextTrack(1);
      break;
    case "audio/prev":
      nextTrack(-1);
      break;
    case "audio/setVolume":
      state = { ...state, audio: { ...state.audio, volume: clamp(Number(payload), 0, 100) } };
      break;
    case "audio/setSource":
      state = { ...state, audio: { ...state.audio, source: payload as AudioSource } };
      break;
    case "climate/setTemp":
      state = { ...state, climate: { ...state.climate, tempSet: clamp(Number(payload), 16, 28) } };
      break;
    case "climate/setFan":
      state = { ...state, climate: { ...state.climate, fan: clamp(Number(payload), 0, 5) } };
      break;
    case "climate/toggleAc":
      state = { ...state, climate: { ...state.climate, ac: !state.climate.ac } };
      break;
    case "climate/toggleRecirc":
      state = { ...state, climate: { ...state.climate, recirc: !state.climate.recirc } };
      break;
    case "climate/toggleDefrost":
      state = { ...state, climate: { ...state.climate, defrost: !state.climate.defrost } };
      break;
    case "climate/toggleAuto":
      state = { ...state, climate: { ...state.climate, auto: !state.climate.auto } };
      break;
    case "car/toggleLights":
      state = { ...state, car: { ...state.car, lights: !state.car.lights } };
      break;
    case "car/toggleHazards":
      state = { ...state, car: { ...state.car, hazards: !state.car.hazards } };
      break;
    case "car/toggleLock":
      state = { ...state, car: { ...state.car, locked: !state.car.locked } };
      break;
    default:
      break;
  }

  notify();
};

let mockStarted = false;

export const startMockVehicleService = () => {
  if (mockStarted) return;
  mockStarted = true;
  const seed = Math.random() * Math.PI * 2;
  let startTime = Date.now();

  setInterval(() => {
    const elapsed = (Date.now() - startTime) / 1000;
    const dt = 0.05;

    const wave = Math.sin(elapsed * 0.8 + seed);
    const wave2 = Math.sin(elapsed * 0.5 + seed * 1.5);

    const targetSpeed = clamp(80 + wave * 60 + wave2 * 40, 10, 190);
    const targetRpm = clamp(2000 + targetSpeed * 30 + Math.sin(elapsed * 1.2) * 600, 1000, 7500);
    const targetTemp = clamp(75 + Math.sin(elapsed * 0.15) * 10, 60, 110);

    const smoothSpeed = state.speedKmh + (targetSpeed - state.speedKmh) * 0.08;
    const smoothRpm = state.rpm + (targetRpm - state.rpm) * 0.1;
    const smoothTemp = state.tempC + (targetTemp - state.tempC) * 0.05;

    const nextFuel = clamp(state.fuelPct - dt * 0.01, 15, 90);
    const nextRange = Math.round(250 - (1 - nextFuel / 100) * 40);

    let nextPosition = state.audio.nowPlaying.positionSec;
    const duration = Math.max(1, state.audio.nowPlaying.durationSec);
    if (state.audio.isPlaying) {
      nextPosition = (nextPosition + dt) % duration;
    }

    state = {
      ...state,
      speedKmh: smoothSpeed,
      rpm: smoothRpm,
      tempC: smoothTemp,
      fuelPct: nextFuel,
      rangeKm: nextRange,
      batteryV: 14.2 + Math.sin(elapsed * 0.4) * 0.3,
      auxV: 0,
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
    startMockVehicleService();
    return subscribe(setVehicleState);
  }, []);

  return vehicleState;
};
