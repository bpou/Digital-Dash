export type TurnMode = "off" | "left" | "right" | "hazard";

export type VehicleState = {
  turn: {
    mode: TurnMode;
    left: boolean;
    right: boolean;
  };
  engine: {
    rpm: number;
  };
  vehicle: {
    speedKmh: number;
  };
  fuel: {
    percent: number;
  };
  temp: {
    oilC: number;
    coolantC: number;
  };
  electrical: {
    batteryV: number;
  };
  climate: {
    tempSetC: number;
    fan: number;
    ac: boolean;
    recirc: boolean;
    defrost: boolean;
    auto: boolean;
  };
  audio: {
    volume: number;
    muted: boolean;
    source: "bt" | "aux" | "radio" | "spotify" | "local";
    nowPlaying: {
      title: string;
      artist: string;
      album?: string;
      durationSec: number;
      positionSec: number;
      isPlaying: boolean;
    };
  };
  car: {
    lights: boolean;
    hazards: boolean;
    locked: boolean;
  };
  ambient: {
    color: string;
    brightness: number;
  };
};
