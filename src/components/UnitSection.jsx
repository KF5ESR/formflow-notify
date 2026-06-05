import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Truck } from "lucide-react";

export const UNIT_TYPES = ["POV", "Engine", "Brush", "Tanker", "Rescue", "Other"];

// unitTimes: { [unitId]: { dispatch_time, enroute_time, on_scene_time, clear_time } }

function UnitCard({ unitId, responders, times, onTimeChange, isPOV }) {
  const staffing = responders.length;
  const set = (key, val) => onTimeChange(unitId, { ...times, [key]: val });

  // POV: enroute = dispatch auto
  const handleDispatch = (val) => {
    const updated = { ...times, dispatch_time: val };
    if (isPOV && (!times.enroute_time || times._enroute_auto)) {
      updated.enroute_time = val;
      updated._enroute_auto = true;
    }
    onTimeChange(unitId, updated);
  };

  const handleEnroute = (val) => {
    onTimeChange(unitId, { ...times, enroute_time: val, _enroute_auto: false });
  };

  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Truck className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-700">{unitId}</span>
          {isPOV && times._enroute_auto && (
            <span className="text-xs text-blue-400">Enroute = Dispatch</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Staffing:</span>
          <span className={`text-sm font-bold px-2 py-0.5 rounded ${staffing > 0 ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"}`}>
            {staffing}
          </span>
        </div>
      </div>

      {/* Responder names */}
      {responders.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {responders.map((r, i) => (
            <span key={i} className="text-xs bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
              {r.name || `Responder ${i + 1}`}
            </span>
          ))}
        </div>
      )}

      {/* Times */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <Label className="text-xs text-slate-600 mb-1 block">Dispatch</Label>
          <Input type="time" value={times.dispatch_time || ""} onChange={(e) => handleDispatch(e.target.value)} className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-slate-600 mb-1 block">
            Enroute
            {isPOV && times._enroute_auto && <span className="ml-1 text-blue-400">(auto)</span>}
          </Label>
          <Input type="time" value={times.enroute_time || ""} onChange={(e) => handleEnroute(e.target.value)} className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-slate-600 mb-1 block">On Scene</Label>
          <Input type="time" value={times.on_scene_time || ""} onChange={(e) => set("on_scene_time", e.target.value)} className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-slate-600 mb-1 block">Unit Clear</Label>
          <Input type="time" value={times.clear_time || ""} onChange={(e) => set("clear_time", e.target.value)} className="h-8 text-sm" />
        </div>
      </div>
    </div>
  );
}

// unitTimes: map of unitId -> time fields
// onUnitTimesChange: (updatedMap) => void
export default function UnitSection({ responders = [], unitTimes = {}, onUnitTimesChange, globalDispatch, globalOnScene, globalClear }) {
  // Derive unique units from responders
  const unitIds = [...new Set(responders.map((r) => r.assigned_unit).filter(Boolean))];

  const handleTimeChange = (unitId, updatedTimes) => {
    onUnitTimesChange({ ...unitTimes, [unitId]: updatedTimes });
  };

  // Auto-populate times from Basics tab globals if not manually set on the unit
  const getTimesForUnit = (unitId) => {
    const existing = unitTimes[unitId] || {};
    const isPOV = unitId === "POV";
    const defaults = {};
    if (!existing.dispatch_time?.trim() && globalDispatch) {
      defaults.dispatch_time = globalDispatch;
      if (isPOV) { defaults.enroute_time = globalDispatch; defaults._enroute_auto = true; }
    }
    if (!existing.on_scene_time?.trim() && globalOnScene) defaults.on_scene_time = globalOnScene;
    if (!existing.clear_time?.trim() && globalClear)      defaults.clear_time = globalClear;
    // Only let existing values win if they are non-empty
    const existingNonEmpty = Object.fromEntries(
      Object.entries(existing).filter(([, v]) => v !== "" && v != null)
    );
    return { ...defaults, ...existingNonEmpty };
  };

  if (unitIds.length === 0) {
    return (
      <div className="text-sm text-slate-400 italic py-4 text-center border border-dashed border-slate-200 rounded-lg">
        Units will appear here automatically as you add responders with assigned units below.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {unitIds.map((unitId) => {
        const assignedResponders = responders.filter((r) => r.assigned_unit === unitId);
        const times = getTimesForUnit(unitId);
        const isPOV = unitId === "POV";
        return (
          <UnitCard
            key={unitId}
            unitId={unitId}
            responders={assignedResponders}
            times={times}
            onTimeChange={handleTimeChange}
            isPOV={isPOV}
          />
        );
      })}
    </div>
  );
}