import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, User } from "lucide-react";

const ROLES = ["IC", "Primary", "Assist", "Driver", "Observer"];
const RESPONSE_TYPES = ["POV", "Station/Apparatus", "Mutual Aid"];

const EMPTY_RESPONDER = { name: "", role: "Primary", response_type: "POV" };

function ResponderRow({ responder, index, onChange, onRemove }) {
  const set = (key, val) => onChange(index, { ...responder, [key]: val });

  return (
    <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 shrink-0">
        <User className="w-4 h-4 text-slate-400" />
        <span className="text-xs text-slate-500 w-4 text-center">{index + 1}</span>
      </div>
      <div className="flex-1 min-w-32">
        <Input
          value={responder.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Responder name"
          className="h-8 text-sm"
        />
      </div>
      <div className="w-32">
        <Select value={responder.role} onValueChange={(v) => set("role", v)}>
          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="w-44">
        <Select value={responder.response_type} onValueChange={(v) => set("response_type", v)}>
          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>{RESPONSE_TYPES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <Button type="button" variant="ghost" size="icon" onClick={() => onRemove(index)} className="w-7 h-7 text-slate-400 hover:text-red-500 shrink-0">
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

export default function ResponderSection({ responders, onChange }) {
  const add = () => onChange([...responders, { ...EMPTY_RESPONDER }]);

  const update = (index, updated) => {
    const next = [...responders];
    next[index] = updated;
    onChange(next);
  };

  const remove = (index) => onChange(responders.filter((_, i) => i !== index));

  return (
    <div className="space-y-2">
      <div className="hidden md:grid grid-cols-[auto_1fr_130px_176px_auto] gap-3 px-3 text-xs text-slate-400 font-medium">
        <span className="w-8" />
        <span>Name</span>
        <span>Role</span>
        <span>Response Type</span>
        <span className="w-7" />
      </div>
      {responders.map((r, i) => (
        <ResponderRow key={i} responder={r} index={i} onChange={update} onRemove={remove} />
      ))}
      <Button type="button" variant="outline" onClick={add} className="w-full border-dashed text-slate-500 hover:text-slate-700">
        <Plus className="w-4 h-4 mr-2" /> Add Responder
      </Button>
    </div>
  );
}