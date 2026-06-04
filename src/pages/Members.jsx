import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Pencil, Check, X } from "lucide-react";
import { useParams } from "react-router-dom";
import DeptContextHeader from "@/components/DeptContextHeader";

const RANKS = ["Chief", "Captain", "Lieutenant", "Firefighter", "Paramedic", "Driver", "Other"];
const STATUSES = ["Active", "Inactive", "On Leave"];
const DEPT_ROLES = [
  { value: "dept_admin", label: "Dept Admin" },
  { value: "reviewer",   label: "Reviewer" },
  { value: "user",       label: "User" },
  { value: "viewer",     label: "Viewer" },
];

const ROLE_COLORS = {
  dept_admin: "bg-red-100 text-red-700",
  reviewer:   "bg-amber-100 text-amber-700",
  user:       "bg-blue-100 text-blue-700",
  viewer:     "bg-slate-100 text-slate-600",
};

const EMPTY_FORM = { name: "", email: "", phone: "", badge_number: "", rank: "Firefighter", department_role: "user", status: "Active" };

export default function Members() {
  const { deptId } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [editRole, setEditRole] = useState("");

  const canManage = ["super_admin", "admin", "dept_admin"].includes(user?.role);

  const { data: members = [] } = useQuery({
    queryKey: ["members", deptId],
    queryFn: () => base44.entities.Member.filter({ department_id: deptId }),
    enabled: !!deptId,
  });

  const create = useMutation({
    mutationFn: (data) => base44.entities.Member.create({ ...data, department_id: deptId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      setForm(EMPTY_FORM);
      setShowForm(false);
    },
  });

  const updateRole = useMutation({
    mutationFn: ({ id, department_role }) => base44.entities.Member.update(id, { department_role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      setEditingId(null);
    },
  });

  const delete_ = useMutation({
    mutationFn: (id) => base44.entities.Member.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members"] }),
  });

  const startEdit = (m) => {
    setEditingId(m.id);
    setEditRole(m.department_role || "user");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <DeptContextHeader module="Members" />
      <div className="max-w-5xl mx-auto px-4 py-8">

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
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Login Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Matches their Base44 login email" />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(555) 123-4567" />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Badge Number</Label>
                <Input value={form.badge_number} onChange={(e) => setForm({ ...form, badge_number: e.target.value })} placeholder="e.g. 001" />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Rank / Position</Label>
                <Select value={form.rank} onValueChange={(val) => setForm({ ...form, rank: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RANKS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Department Role</Label>
                <Select value={form.department_role} onValueChange={(val) => setForm({ ...form, department_role: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEPT_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Status</Label>
                <Select value={form.status} onValueChange={(val) => setForm({ ...form, status: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => create.mutate(form)} disabled={!form.name || create.isPending} className="bg-blue-600 hover:bg-blue-700">
                Save
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Badge</TableHead>
                <TableHead>Rank</TableHead>
                <TableHead>Dept Role</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id} className="hover:bg-slate-50">
                  <TableCell className="font-medium text-slate-900">{m.name}</TableCell>
                  <TableCell className="text-slate-500 text-sm">{m.email || "—"}</TableCell>
                  <TableCell className="text-slate-600">{m.badge_number || "—"}</TableCell>
                  <TableCell className="text-slate-600">{m.rank || m.role || "—"}</TableCell>
                  <TableCell>
                    {canManage && editingId === m.id ? (
                      <div className="flex items-center gap-1">
                        <Select value={editRole} onValueChange={setEditRole}>
                          <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {DEPT_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => updateRole.mutate({ id: m.id, department_role: editRole })}>
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400" onClick={() => setEditingId(null)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Badge className={`text-xs font-medium border-0 ${ROLE_COLORS[m.department_role] || ROLE_COLORS.viewer}`}>
                          {DEPT_ROLES.find(r => r.value === m.department_role)?.label || m.department_role || "user"}
                        </Badge>
                        {canManage && (
                          <button onClick={() => startEdit(m)} className="text-slate-300 hover:text-slate-500 transition-colors">
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-1 rounded-full ${m.status === "Active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"}`}>
                      {m.status}
                    </span>
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => delete_.mutate(m.id)} className="text-red-500 hover:text-red-700 w-8 h-8">
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

        <p className="text-xs text-slate-400 mt-4">
          <strong>Note:</strong> The Login Email must match the member's Base44 login. Department Role controls what they can do inside this department — it is separate from the Base44 app-level role.
        </p>
      </div>
    </div>
  );
}