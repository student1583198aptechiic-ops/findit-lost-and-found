import { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { MapPin, Search } from "lucide-react";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function ClickHandler({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function MapPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number | null, lng: number | null) => void;
}) {
  const [search, setSearch] = useState("");
  const center: [number, number] =
    lat != null && lng != null ? [lat, lng] : [40.7128, -74.006];

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!search.trim()) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          search
        )}&limit=1`
      );
      const data = (await res.json()) as Array<{ lat: string; lon: string }>;
      if (data.length > 0) {
        onChange(parseFloat(data[0].lat), parseFloat(data[0].lon));
      }
    } catch {
      // ignore - graceful fallback
    }
  }

  return (
    <div>
      <form onSubmit={handleSearch} className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search for a place..."
          className="input pl-10 py-2 text-sm"
        />
      </form>
      <div className="h-72 rounded-lg overflow-hidden border border-slate-200">
        <MapContainer
          center={center}
          zoom={12}
          className="h-full w-full"
          scrollWheelZoom={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          <ClickHandler
            onPick={(la, ln) => {
              // Round to 4 decimal places for approximate location
              onChange(Math.round(la * 10000) / 10000, Math.round(ln * 10000) / 10000);
            }}
          />
          {lat != null && lng != null && (
            <Marker position={[lat, lng]}>
              {/* Popup not needed in picker */}
            </Marker>
          )}
        </MapContainer>
      </div>
      <p className="mt-2 text-xs text-navy-400 flex items-center gap-1">
        <MapPin className="h-3.5 w-3.5" />
        {lat != null && lng != null
          ? `Selected: ${lat}, ${lng} (approximate)`
          : "Click on the map to set an approximate location."}
      </p>
    </div>
  );
}
