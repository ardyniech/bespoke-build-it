import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "drg.on_bit";

// Aturan komunitas: default ON saat login (share lokasi selama ngebit).
// User bisa toggle OFF secara manual dari header/peta.
function readInitial(): boolean {
  if (typeof window === "undefined") return true;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === null ? true : v === "1";
}

export function useLiveLocation(userId: string | undefined) {
  const [onBit, setOnBitState] = useState<boolean>(true);
  const [hydrated, setHydrated] = useState(false);
  const [coords, setCoords] = useState<GeolocationCoordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const lastPush = useRef<number>(0);

  useEffect(() => {
    setOnBitState(readInitial());
    setHydrated(true);
  }, []);

  const setOnBit = useCallback((v: boolean) => {
    setOnBitState(v);
    try {
      window.localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
    } catch {}
  }, []);

  // Push helper — throttle ~15s server-side
  const push = useCallback(
    async (c: GeolocationCoordinates, active: boolean) => {
      if (!userId) return;
      const now = Date.now();
      if (now - lastPush.current < 15_000) return;
      lastPush.current = now;
      await supabase.from("live_locations").upsert(
        {
          user_id: userId,
          lat: c.latitude,
          lng: c.longitude,
          accuracy: c.accuracy ?? null,
          heading: c.heading ?? null,
          speed: c.speed ?? null,
          on_bit: active,
          last_seen: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    },
    [userId],
  );

  useEffect(() => {
    if (!hydrated || !userId) return;
    if (!onBit) {
      // Turn off: stop watching & mark inactive
      if (watchId.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      supabase
        .from("live_locations")
        .update({ on_bit: false, last_seen: new Date().toISOString() })
        .eq("user_id", userId);
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Perangkat tidak mendukung GPS");
      return;
    }
    const opts: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 10_000,
      timeout: 20_000,
    };
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setError(null);
        setCoords(pos.coords);
        push(pos.coords, true);
      },
      (err) => setError(err.message),
      opts,
    );
    watchId.current = id;
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, [hydrated, onBit, userId, push]);

  return { onBit, setOnBit, coords, error, hydrated };
}