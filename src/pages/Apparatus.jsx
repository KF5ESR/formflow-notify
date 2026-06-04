import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus, Pencil } from "lucide-react";
import { useParams } from "react-router-dom";
import DeptContextHeader from "@/components/DeptContextHeader";
import ApparatusEditSheet from "@/components/ApparatusEditSheet";

const UNIT_TYPES = ["Engine", "Truck", "Rescue", "Tanker", "Ambulance", "POV", "Other"];
const STATUSES = ["Available", "In Service", "Out of Service"];

export default function Apparatus() {
  const { deptId } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ unit_id: "", unit_type: "Engine", description: "", status: "Available" });
  const [editingUnit, setEditingUnit] = useState(null);

  const canManage = ["super_admin", "admin", "dept_admin"].includes(user?.role);

  const { data: apparatus = [] } = useQuery({
    queryKey: ["apparatus", deptId],
    queryFn: () => base44.entities.Apparatus.filter({ department_id: deptId }),
    enabled: !!deptId,
  });

  const create = useMutation({
    mutationFn: (data) => base44.entities.Apparatus.create({ ...data, department_id: deptId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apparatus"] });
      setForm({ unit_id: "", unit_type: "Engine", description: "", status: "Available" });
      setShowForm(false);
    },
  });

  const update = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Apparatus.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apparatus"] });
      setEditingUnit(null);
    },
  });

  const delete_ = useMutation({
    mutationFn: (id) => base44.entities.Apparatus.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["apparatus"] }),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <DeptContextHeader module="Apparatus" />
      <div className="max-w-5xl mx-auto px-4 py-8">

        {canManage && (
          <Button onClick={() => setShowForm(!showForm)} className="mb-6 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Add Unit
          </Button>
        )}

        {showForm && canManage && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Unit ID *</Label>
                <Input
                  value={form.unit_id}
                  onChange={(e) => setForm({ ...form, unit_id: e.target.value })}
                  placeholder="e.g. E355, A1, POV-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Unit Type</Label>
                <Select value={form.unit_type} onValueChange={(val) => setForm({ ...form, unit_type: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Structure Fire - 750 GPM"
                />
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
              <Button onClick={() => create.mutate(form)} disabled={!form.unit_id || create.isPending} className="bg-blue-600 hover:bg-blue-700">
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
                <TableHead>Unit ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {apparatus.map((a) => (
                <TableRow key={a.id} className="hover:bg-slate-50">
                  <TableCell className="font-medium text-slate-900">{a.unit_id}</TableCell>
                  <TableCell className="text-slate-600">{a.unit_type}</TableCell>
                  <TableCell className="text-slate-600">{a.description || "—"}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-1 rounded-full ${a.status === "Available" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {a.status}
                    </span>
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setEditingUnit(a)} className="w-8 h-8 text-slate-500 hover:text-slate-700">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => delete_.mutate(a.id)} className="text-red-400 hover:text-red-600 w-8 h-8">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {apparatus.length === 0 && (
            <div className="p-8 text-center text-slate-500">No apparatus yet. Add one to get started.</div>
          )}
        </div>
      </div>

      {editingUnit && (
        <ApparatusEditSheet
          apparatus={editingUnit}
          onSave={(data) => update.mutate({ id: editingUnit.id, data })}
          onClose={() => setEditingUnit(null)}
          isSaving={update.isPending}
        />
      )}
    </div>
  );
}