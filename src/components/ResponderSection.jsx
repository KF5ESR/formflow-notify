import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, User } from "lucide-react";

const ROLES = ["IC", "Primary", "Assist", "Driver", "Observer"];
const RESPONSE_TYPES = ["Emergent", "Non Emergent"];

const EMPTY_RESPONDER = { name: "", role: "Primary", response_type: "Emergent", assigned_unit: "POV" };

function ResponderRow({ responder, index, onChange, onRemove, unitOptions, members = [] }) {
  const set = (key, val) => onChange(index, { ...responder, [key]: val });

  return (
    <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 shrink-0">
        <User className="w-4 h-4 text-slate-400" />
        <span className="text-xs text-slate-500 w-4 text-center">{index + 1}</span>
      </div>

      {/* Name */}
      <div className="flex-1 min-w-32">
        {members.length > 0 ? (
          <Select value={responder.name} onValueChange={(v) => set("name", v)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select member..." /></SelectTrigger>
            <SelectContent>
              {members.map((m) => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : (
          <Input value={responder.name} onChange={(e) => set("name", e.target.value)} placeholder="Responder name" className="h-8 text-sm" />
        )}
      </div>

      {/* Role */}
      <div className="w-28">
        <Select value={responder.role} onValueChange={(v) => set("role", v)}>
          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Response Type */}
      <div className="w-40">
        <Select value={responder.response_type} onValueChange={(v) => set("response_type", v)}>
          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>{RESPONSE_TYPES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Assigned Unit — dropdown from apparatus */}
      <div className="w-36">
        <Select value={responder.assigned_unit} onValueChange={(v) => set("assigned_unit", v)}>
          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>{unitOptions.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Button type="button" variant="ghost" size="icon" onClick={() => onRemove(index)} className="w-7 h-7 text-slate-400 hover:text-red-500 shrink-0">
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

export default function ResponderSection({ responders, onChange, apparatus = [], members = [] }) {
  // Build suggested unit options from apparatus list + already-used assigned units
  const apparatusOptions = apparatus.map((a) => a.unit_id).filter(Boolean);
  const usedUnits = [...new Set(responders.map((r) => r.assigned_unit).filter(Boolean))];
  const unitOptions = [...new Set(["POV", ...apparatusOptions, ...usedUnits])];

  const add = () => onChange([...responders, { ...EMPTY_RESPONDER }]);
  const update = (index, updated) => {
    const next = [...responders];
    next[index] = updated;
    onChange(next);
  };
  const remove = (index) => onChange(responders.filter((_, i) => i !== index));

  return (
    <div className="space-y-2">
      <div className="hidden md:grid grid-cols-[auto_1fr_112px_160px_144px_auto] gap-3 px-3 text-xs text-slate-400 font-medium">
        <span className="w-8" />
        <span>Name</span>
        <span>Role</span>
        <span>Response Type</span>
        <span>Assigned Unit</span>
        <span className="w-7" />
      </div>
      {responders.map((r, i) => (
        <ResponderRow key={i} responder={r} index={i} onChange={update} onRemove={remove} unitOptions={unitOptions} members={members} />
      ))}
      <Button type="button" variant="outline" onClick={add} className="w-full border-dashed text-slate-500 hover:text-slate-700">
        <Plus className="w-4 h-4 mr-2" /> Add Responder
      </Button>
    </div>
  );
}