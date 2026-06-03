import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useDepartment } from "@/lib/DepartmentContext";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ROLES = ["Chief", "Captain", "Lieutenant", "Firefighter", "Paramedic", "Driver", "Other"];
const STATUSES = ["Active", "Inactive", "On Leave"];

export default function Members() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { scopeFilter, departmentId } = useDepartment();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", badge_number: "", role: "Firefighter", status: "Active" });

  const canManage = ["super_admin", "admin", "dept_admin"].includes(user?.role);

  const { data: members = [] } = useQuery({
    queryKey: ["members", departmentId],
    queryFn: () => base44.entities.Member.filter(scopeFilter()),
  });

  const create = useMutation({
    mutationFn: (data) => base44.entities.Member.create({ ...data, department_id: departmentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      setForm({ name: "", badge_number: "", role: "Firefighter", status: "Active" });
      setShowForm(false);
    },
  });

  const delete_ = useMutation({
    mutationFn: (id) => base44.entities.Member.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members"] }),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">Members</h1>
        </div>

        {canManage && (
          <Button onClick={() => setShowForm(!showForm)} className="mb-6 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Add Member
          </Button>
        )}

        {showForm && canManage && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Full name"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Badge Number</Label>
                <Input
                  value={form.badge_number}
                  onChange={(e) => setForm({ ...form, badge_number: e.target.value })}
                  placeholder="e.g. 001"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Role</Label>
                <Select value={form.role} onValueChange={(val) => setForm({ ...form, role: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Status</Label>
                <Select value={form.status} onValueChange={(val) => setForm({ ...form, status: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => create.mutate(form)} disabled={!form.name || create.isPending} className="bg-blue-600 hover:bg-blue-700">
                Save
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Badge</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="text-right">Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id} className="hover:bg-slate-50">
                  <TableCell className="font-medium text-slate-900">{m.name}</TableCell>
                  <TableCell className="text-slate-600">{m.badge_number || "—"}</TableCell>
                  <TableCell className="text-slate-600">{m.role}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-1 rounded-full ${m.status === "Active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"}`}>
                      {m.status}
                    </span>
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => delete_.mutate(m.id)} className="text-red-600 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {members.length === 0 && (
            <div className="p-8 text-center text-slate-500">No members yet. Add one to get started.</div>
          )}
        </div>
      </div>
    </div>
  );
}