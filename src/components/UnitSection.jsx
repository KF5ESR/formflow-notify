import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Truck } from "lucide-react";

export const UNIT_TYPES = ["POV", "Engine", "Brush", "Tanker", "Rescue", "Other"];

const EMPTY_UNIT = {
  unit_id: "",
  unit_type: "POV",
  staffing: "",
  dispatch_time: "",
  enroute_time: "",
  on_scene_time: "",
  clear_time: "",
  _enroute_auto: true, // POV default: enroute tracks dispatch
};

function UnitRow({ unit, index, onChange, onRemove, globalDispatch }) {
  const handleField = (key, val) => {
    const updated = { ...unit, [key]: val };

    if (key === "unit_type") {
      const nowPOV = val === "POV";
      if (nowPOV) {
        // Switching TO POV: auto-fill enroute = dispatch
        updated.enroute_time = updated.dispatch_time || globalDispatch || "";
        updated._enroute_auto = true;
      } else {
        // Switching AWAY from POV: clear auto-filled enroute, leave blank
        if (unit._enroute_auto) {
          updated.enroute_time = "";
        }
        updated._enroute_auto = false;
      }
    }

    if (key === "dispatch_time") {
      // Only propagate to enroute if still in auto mode (POV and not manually set)
      if (unit._enroute_auto && unit.unit_type === "POV") {
        updated.enroute_time = val;
      }
    }

    if (key === "enroute_time") {
      // Any manual edit breaks auto-sync
      updated._enroute_auto = false;
    }

    onChange(index, updated);
  };

  const isPOV = unit.unit_type === "POV";

  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 relative">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Truck className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-700">Unit {index + 1}</span>
          {unit.unit_id && (
            <span className="text-xs bg-white border border-slate-200 px-2 py-0.5 rounded font-mono">{unit.unit_id}</span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded font-medium ${isPOV ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"}`}>
            {unit.unit_type}
          </span>
          {isPOV && unit._enroute_auto && (
            <span className="text-xs text-blue-400">Enroute = Dispatch</span>
          )}
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={() => onRemove(index)} className="w-7 h-7 text-slate-400 hover:text-red-500">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <Label className="text-xs text-slate-600 mb-1 block">Unit ID</Label>
          <Input value={unit.unit_id} onChange={(e) => handleField("unit_id", e.target.value)} placeholder="E555, B560…" className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-slate-600 mb-1 block">Unit Type</Label>
          <Select value={unit.unit_type} onValueChange={(v) => handleField("unit_type", v)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{UNIT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-slate-600 mb-1 block">Staffing (#)</Label>
          <Input type="number" min="0" value={unit.staffing} onChange={(e) => handleField("staffing", e.target.value)} className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-slate-600 mb-1 block">Dispatch</Label>
          <Input type="time" value={unit.dispatch_time} onChange={(e) => handleField("dispatch_time", e.target.value)} className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-slate-600 mb-1 block">
            Enroute
            {isPOV && unit._enroute_auto
              ? <span className="ml-1 text-blue-400">(auto)</span>
              : !isPOV
              ? <span className="ml-1 text-slate-400">(blank until entered)</span>
              : null
            }
          </Label>
          <Input
            type="time"
            value={unit.enroute_time}
            onChange={(e) => handleField("enroute_time", e.target.value)}
            className={`h-8 text-sm ${!isPOV && !unit.enroute_time ? "bg-slate-100 text-slate-400" : ""}`}
            placeholder={!isPOV ? "—" : ""}
          />
        </div>
        <div>
          <Label className="text-xs text-slate-600 mb-1 block">On Scene</Label>
          <Input type="time" value={unit.on_scene_time} onChange={(e) => handleField("on_scene_time", e.target.value)} className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-slate-600 mb-1 block">Unit Clear</Label>
          <Input type="time" value={unit.clear_time} onChange={(e) => handleField("clear_time", e.target.value)} className="h-8 text-sm" />
        </div>
      </div>
    </div>
  );
}

export default function UnitSection({ units, onChange, globalDispatch }) {
  const addUnit = () => {
    const newUnit = {
      ...EMPTY_UNIT,
      dispatch_time: globalDispatch || "",
      enroute_time: globalDispatch || "", // POV default
      _enroute_auto: true,
    };
    onChange([...units, newUnit]);
  };

  const updateUnit = (index, updated) => {
    const next = [...units];
    next[index] = updated;
    onChange(next);
  };

  const removeUnit = (index) => onChange(units.filter((_, i) => i !== index));

  return (
    <div className="space-y-3">
      {units.map((unit, i) => (
        <UnitRow key={i} unit={unit} index={i} onChange={updateUnit} onRemove={removeUnit} globalDispatch={globalDispatch} />
      ))}
      <Button type="button" variant="outline" onClick={addUnit} className="w-full border-dashed text-slate-500 hover:text-slate-700">
        <Plus className="w-4 h-4 mr-2" /> Add Unit
      </Button>
    </div>
  );
}