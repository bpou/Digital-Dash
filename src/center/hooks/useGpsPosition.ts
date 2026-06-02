import { useEffect, useState } from "react";
import type { VehicleState } from "../../shared/vehicleTypes";
import { subscribe } from "../../vehicle/vehicleClient";

type GpsPosition = {
  location: { lat: number; lng: number };
  heading: number | null;
  speedMps: number | null;
  speedKmh: number | null;
  source: "vehicle" | "browser";
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const fromVehicleGps = (gps: VehicleState["gps"]): GpsPosition | null => {
  if (!gps || !isFiniteNumber(gps.lat) || !isFiniteNumber(gps.lng)) return null;

  const speedMps = isFiniteNumber(gps.speedMps)
    ? gps.speedMps
    : isFiniteNumber(gps.speedKmh)
      ? gps.speedKmh / 3.6
      : null;
  const speedKmh = isFiniteNumber(gps.speedKmh)
    ? gps.speedKmh
    : speedMps !== null
      ? speedMps * 3.6
      : null;

  return {
    location: { lat: gps.lat, lng: gps.lng },
    heading: isFiniteNumber(gps.heading) ? gps.heading : null,
    speedMps,
    speedKmh,
    source: "vehicle",
  };
};

const useBrowserGeolocation = () => {
  const [position, setPosition] = useState<GpsPosition | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      return;
    }
    let watchId: number | null = null;
    const setFromBrowser = (pos: GeolocationPosition) => {
      const speedMps = Number.isFinite(pos.coords.speed ?? NaN) ? pos.coords.speed : null;
      setPosition({
        location: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        heading: Number.isFinite(pos.coords.heading ?? NaN) ? pos.coords.heading : null,
        speedMps,
        speedKmh: speedMps !== null ? speedMps * 3.6 : null,
        source: "browser",
      });
    };

    watchId = navigator.geolocation.watchPosition(
      setFromBrowser,
      () => {},
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 12000 }
    );

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  return position;
};

export const useGpsPosition = () => {
  const browserPosition = useBrowserGeolocation();
  const [vehiclePosition, setVehiclePosition] = useState<GpsPosition | null>(null);

  useEffect(() => {
    return subscribe((state) => {
      setVehiclePosition(fromVehicleGps(state.gps));
    });
  }, []);

  return vehiclePosition ?? browserPosition;
};
