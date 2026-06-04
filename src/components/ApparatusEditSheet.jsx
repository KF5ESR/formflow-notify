import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

const UNIT_TYPES = ["Engine", "Truck", "Rescue", "Tanker", "Ambulance", "POV", "Other"];
const STATUSES = ["Available", "In Service", "Out of Service"];

export default function ApparatusEditSheet({ apparatus, onSave, onClose, isSaving }) {
  const [form, setForm] = useState({ ...apparatus });

  useEffect(() => {
    setForm({ ...apparatus });
  }, [apparatus]);

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={onClose} />

      {/* Sheet */}
      <div className="w-full max-w-md bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Edit Apparatus</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Unit ID *</Label>
            <Input
              value={form.unit_id || ""}
              onChange={(e) => setForm({ ...form, unit_id: e.target.value })}
              placeholder="e.g. E355, A1, POV-1"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Unit Type</Label>
            <Select value={form.unit_type || ""} onValueChange={(val) => setForm({ ...form, unit_type: val })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {UNIT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Description</Label>
            <Input
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. Structure Fire - 750 GPM"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Status</Label>
            <Select value={form.status || "Available"} onValueChange={(val) => setForm({ ...form, status: val })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
          <Button
            onClick={() => onSave(form)}
            disabled={!form.unit_id || isSaving}
            className="bg-blue-600 hover:bg-blue-700 flex-1"
          >
            {isSaving ? "Saving…" : "Save Changes"}
          </Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}