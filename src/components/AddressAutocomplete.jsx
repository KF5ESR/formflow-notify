import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";

// Nominatim viewbox centered on Mammoth Spring, AR (36.4958, -91.5318)
// Format: left,top,right,bottom (min_lon, max_lat, max_lon, min_lat)
// ~80 mile radius covers Hardy AR, Salem AR, Thayer MO, Alton MO, etc.
const VIEWBOX = "-93.5,37.8,-90.0,35.2";
const BOUNDED = "0"; // bias but don't restrict — allows results slightly outside box

export default function AddressAutocomplete({ value, onChange, placeholder, className }) {
  const [query, setQuery] = useState(value || "");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  // Sync if parent changes value externally
  useEffect(() => {
    if (value !== query) setQuery(value || "");
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
    onChange(val); // keep parent in sync as user types

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
    // Use 2-letter state abbreviation (ISO3166-2-lvl4 = "US-AR" → "AR")
    const stateAbbr = (addr['ISO3166-2-lvl4'] || '').replace('US-', '') || addr.state_code || addr.state || '';
    // Prefer city/town/village/hamlet over county for postal_community
    const city = addr.city || addr.town || addr.village || addr.hamlet || addr.county || "";
    // Build a clean address string: house_number + road + city + state_abbr + postcode
    const parts = [
      addr.house_number && addr.road ? `${addr.house_number} ${addr.road}` : (addr.road || ""),
      city,
      stateAbbr,
      addr.postcode || "",
    ].filter(Boolean);
    const formatted = parts.join(", ") || item.display_name;
    setQuery(formatted);
    onChange(formatted);
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          value={query}
          onChange={handleInput}
          placeholder={placeholder || "Street address or intersection"}
          className={className}
        />
        {loading && (
          <Loader2 className="absolute right-2 top-2.5 w-4 h-4 text-slate-400 animate-spin" />
        )}
      </div>

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
  );
}