import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { RANKS, STATUSES, DEPT_ROLES } from "@/pages/Members";

export default function MemberEditSheet({ member, onSave, onClose, isSaving }) {
  const [form, setForm] = useState({
    name:            member.name || "",
    email:           member.email || "",
    phone:           member.phone || "",
    badge_number:    member.badge_number || "",
    rank:            member.rank || "Firefighter",
    department_role: member.department_role || "user",
    status:          member.status || "Active",
  });

  const handleSave = () => {
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/30" onClick={onClose} />

      {/* Sheet */}
      <div className="w-full max-w-md bg-white shadow-2xl flex flex-col h-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="font-semibold text-slate-900">Edit Member</h2>
            <p className="text-sm text-slate-500">{member.name}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Full Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Login Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Matches their Base44 login" />
          </div>
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(555) 123-4567" />
          </div>
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Badge Number</Label>
            <Input value={form.badge_number} onChange={(e) => setForm({ ...form, badge_number: e.target.value })} />
          </div>
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Rank / Position</Label>
            <Select value={form.rank} onValueChange={(val) => setForm({ ...form, rank: val })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{RANKS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Department Role</Label>
            <Select value={form.department_role} onValueChange={(val) => setForm({ ...form, department_role: val })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DEPT_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Status</Label>
            <Select value={form.status} onValueChange={(val) => setForm({ ...form, status: val })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-xs text-slate-400 mt-1.5">
              Prefer changing status over deleting — member history stays linked to past incidents and reports.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
          <Button onClick={handleSave} disabled={!form.name || isSaving} className="flex-1 bg-blue-600 hover:bg-blue-700">
            {isSaving ? "Saving…" : "Save Changes"}
          </Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}