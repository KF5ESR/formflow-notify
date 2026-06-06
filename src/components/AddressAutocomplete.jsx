import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2, X, ExternalLink } from "lucide-react";

// Nominatim viewbox centered on Mammoth Spring, AR (36.4958, -91.5318)
const VIEWBOX = "-93.5,37.8,-90.0,35.2";
const BOUNDED = "0";

function MapPopup({ lat, lon, label, onClose }) {
  const zoom = 15;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.01},${lat - 0.01},${lon + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lon}`;
  const osmLink = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=${zoom}`;
  const googleLink = `https://www.google.com/maps?q=${lat},${lon}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-500" />
            <span className="text-sm font-semibold text-slate-800 truncate max-w-xs">{label || "Incident Location"}</span>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Map iframe */}
        <div className="relative w-full h-56">
          <iframe
            src={mapUrl}
            className="w-full h-full border-0"
            title="Incident Location Map"
            loading="lazy"
          />
        </div>

        {/* Coordinates + links */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <span className="font-semibold text-slate-700">Coords:</span>
            <span>{lat.toFixed(6)}, {lon.toFixed(6)}</span>
          </div>
          <div className="flex gap-2">
            <a
              href={googleLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              <ExternalLink className="w-3 h-3" /> Google Maps
            </a>
            <span className="text-slate-300">|</span>
            <a
              href={osmLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              <ExternalLink className="w-3 h-3" /> OpenStreetMap
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// onChange(formattedAddress, { lat, lon } | null) — coords passed as second arg when known
export default function AddressAutocomplete({ value, onChange, placeholder, className }) {
  const [query, setQuery] = useState(value || "");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null); // { lat, lon }
  const [showMap, setShowMap] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  // Sync if parent changes value externally
  useEffect(() => {
    if (value !== query) {
      setQuery(value || "");
      // Clear coords if value was cleared externally
      if (!value) setCoords(null);
    }
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    setCoords(null); // clear coords when user types manually

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 3) { setSuggestions([]); setOpen(false); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?` +
          `q=${encodeURIComponent(val)}&format=json&addressdetails=1&limit=8` +
          `&viewbox=${VIEWBOX}&bounded=${BOUNDED}` +
          `&countrycodes=us&dedupe=1`;
        const res = await fetch(url, {
          headers: { "Accept-Language": "en-US", "User-Agent": "FastAttack-FD-App" }
        });
        const data = await res.json();
        setSuggestions(data || []);
        setOpen(data && data.length > 0);
      } catch (_) {
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  const handleSelect = (item) => {
    const addr = item.address || {};
    const stateAbbr = (addr['ISO3166-2-lvl4'] || '').replace('US-', '') || addr.state_code || addr.state || '';
    const city = addr.city || addr.town || addr.village || addr.hamlet || addr.county || "";
    const parts = [
      addr.house_number && addr.road ? `${addr.house_number} ${addr.road}` : (addr.road || ""),
      city,
      stateAbbr,
      addr.postcode || "",
    ].filter(Boolean);
    const formatted = parts.join(", ") || item.display_name;
    setQuery(formatted);
    const newCoords = (item.lat && item.lon)
      ? { lat: parseFloat(item.lat), lon: parseFloat(item.lon) }
      : null;
    if (newCoords) setCoords(newCoords);
    onChange(formatted, newCoords);
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <>
      <div ref={containerRef} className="relative">
        <div className="relative">
          <Input
            value={query}
            onChange={handleInput}
            placeholder={placeholder || "Street address or intersection"}
            className={`pr-8 ${className || ""}`}
          />
          {/* Map pin button — only shown when coords are known */}
          {coords && !loading && (
            <button
              type="button"
              onClick={() => setShowMap(true)}
              title="View on map"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700 transition-colors"
            >
              <MapPin className="w-4 h-4" />
            </button>
          )}
          {loading && (
            <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
          )}
        </div>

        {/* Coords badge */}
        {coords && (
          <button
            type="button"
            onClick={() => setShowMap(true)}
            className="mt-1 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-mono transition-colors"
          >
            <MapPin className="w-3 h-3" />
            {coords.lat.toFixed(5)}, {coords.lon.toFixed(5)} — tap to preview
          </button>
        )}

        {open && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((item, i) => {
              const addr = item.address || {};
              const line1 = addr.house_number && addr.road
                ? `${addr.house_number} ${addr.road}`
                : (addr.road || item.display_name.split(",")[0]);
              const line2 = [
                addr.city || addr.town || addr.village || addr.hamlet || "",
                addr.state || "",
                addr.postcode || "",
              ].filter(Boolean).join(", ");

              return (
                <button
                  key={i}
                  type="button"
                  onMouseDown={() => handleSelect(item)}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-slate-800">{line1}</div>
                      {line2 && <div className="text-xs text-slate-500">{line2}</div>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Map popup */}
      {showMap && coords && (
        <MapPopup
          lat={coords.lat}
          lon={coords.lon}
          label={query}
          onClose={() => setShowMap(false)}
        />
      )}
    </>
  );
}