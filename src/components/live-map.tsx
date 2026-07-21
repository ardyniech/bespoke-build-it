import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

export type MapPoint = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  sub?: string;
  variant?: "me" | "active" | "idle" | "sos";
};

const COLORS: Record<NonNullable<MapPoint["variant"]>, string> = {
  me: "#0284c7",
  active: "#c14a2a",
  idle: "#94a3b8",
  sos: "#dc2626",
};

function pinIcon(variant: NonNullable<MapPoint["variant"]>) {
  const color = COLORS[variant];
  const pulse = variant === "sos" || variant === "me";
  return L.divIcon({
    className: "drg-pin",
    html: `<div style="position:relative;transform:translate(-50%,-100%);">
      <div style="width:28px;height:28px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 4px 10px rgba(0,0,0,.35);${pulse ? "animation:drgPulse 1.6s ease-out infinite;" : ""}"></div>
      <div style="position:absolute;left:50%;top:24px;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ${color};"></div>
    </div>
    <style>@keyframes drgPulse{0%{box-shadow:0 0 0 0 ${color}66}70%{box-shadow:0 0 0 14px ${color}00}100%{box-shadow:0 0 0 0 ${color}00}}</style>`,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
  });
}

function FitBounds({ points, focusId }: { points: MapPoint[]; focusId?: string }) {
  const map = useMap();
  const initialized = useRef(false);
  useEffect(() => {
    if (focusId) {
      const p = points.find((x) => x.id === focusId);
      if (p) map.flyTo([p.lat, p.lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
      return;
    }
    if (points.length === 0 || initialized.current) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14);
    } else {
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
    initialized.current = true;
  }, [points, focusId, map]);
  return null;
}

export default function LiveMap({
  points,
  focusId,
  height = "100%",
  interactive = true,
}: {
  points: MapPoint[];
  focusId?: string;
  height?: string | number;
  interactive?: boolean;
}) {
  const center = useMemo<[number, number]>(() => {
    if (points.length > 0) return [points[0].lat, points[0].lng];
    return [-7.9666, 112.6326]; // Malang default
  }, [points]);

  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom={interactive}
      dragging={interactive}
      style={{ height, width: "100%", borderRadius: "1rem", zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={points} focusId={focusId} />
      {points.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={pinIcon(p.variant ?? "active")}>
          <Popup>
            <div style={{ minWidth: 160 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{p.label}</div>
              {p.sub && <div style={{ fontSize: 12, color: "#64748b" }}>{p.sub}</div>}
              <a
                href={`https://www.google.com/maps?q=${p.lat},${p.lng}`}
                target="_blank"
                rel="noreferrer"
                style={{ display: "inline-block", marginTop: 8, fontSize: 12, color: "#c14a2a", fontWeight: 600 }}
              >
                Buka di Google Maps →
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}