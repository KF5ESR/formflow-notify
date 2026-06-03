/**
 * AdminDepartments — Super Admin page for creating and managing departments.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ONBOARDING_STEPS, getOnboardingStepIndex } from "@/lib/nerisReadiness";
import { Plus, Building2, ArrowLeft, CheckCircle, Circle, Settings } from "lucide-react";

const EMPTY = {
  department_name: "", short_name: "", fdid: "", neris_entity_id: "",
  county: "", state: "AR", status: "ACTIVE",
  onboarding_status: "DEPARTMENT_CREATED", neris_enabled: false, production_enabled: false,
};

function OnboardingProgress({ status }) {
  const current = getOnboardingStepIndex(status);
  return (
    <div className="flex items-center gap-0.5 flex-wrap">
      {ONBOARDING_STEPS.map((step, i) => (
        <div key={step.key} title={step.label}
          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center
            ${i < current ? "bg-green-500 border-green-500" :
              i === current ? "bg-blue-500 border-blue-500" :
              "bg-white border-slate-300"}`}>
          {i < current && <CheckCircle className="w-2.5 h-2.5 text-white" />}
          {i === current && <Circle className="w-2 h-2 text-white fill-white" />}
        </div>
      ))}
      <span className="ml-2 text-xs text-slate-500">
        Step {Math.min(current + 1, ONBOARDING_STEPS.length)}/{ONBOARDING_STEPS.length}
      </span>
    </div>
  );
}

function DepartmentForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial || EMPTY);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target ? e.target.value : e }));

  return (
    <div className="border border-slate-200 rounded-xl p-6 bg-white space-y-4">
      <h3 className="font-semibold text-slate-800">{initial?.id ? "Edit Department" : "New Department"}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label>Department Name *</Label><Input value={form.department_name} onChange={set("department_name")} placeholder="Petit Jean Fire Department" /></div>
        <div><Label>Short Name</Label><Input value={form.short_name} onChange={set("short_name")} placeholder="PJFD" /></div>
        <div><Label>FDID</Label><Input value={form.fdid} onChange={set("fdid")} placeholder="e.g. AR0001" /></div>
        <div><Label>NERIS Entity ID</Label><Input value={form.neris_entity_id} onChange={set("neris_entity_id")} placeholder="e.g. FD05049197" /></div>
        <div><Label>County</Label><Input value={form.county} onChange={set("county")} /></div>
        <div><Label>State</Label><Input value={form.state} onChange={set("state")} maxLength={2} className="uppercase" /></div>
        <div>
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Onboarding Step</Label>
          <Select value={form.onboarding_status} onValueChange={(v) => setForm(f => ({ ...f, onboarding_status: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ONBOARDING_STEPS.map(s => (
                <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <Button onClick={() => onSave(form)} disabled={saving || !form.department_name} className="bg-red-600 hover:bg-red-700 text-white">
          {saving ? "Saving…" : "Save Department"}
        </Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

export default function AdminDepartments() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const isSuperAdmin = currentUser?.role === "super_admin" || currentUser?.role === "admin";

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: () => base44.entities.Department.list("-created_date"),
  });

  const saveMutation = useMutation({
    mutationFn: (form) => form.id
      ? base44.entities.Department.update(form.id, form)
      : base44.entities.Department.create(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      setShowForm(false);
      setEditing(null);
    },
  });

  const STATUS_COLOR = { ACTIVE: "bg-green-100 text-green-700", INACTIVE: "bg-slate-100 text-slate-500", SUSPENDED: "bg-red-100 text-red-600" };

  if (!isSuperAdmin) return (
    <div className="min-h-screen flex items-center justify-center text-slate-500">Access denied — Super Admin only.</div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Department Management</h1>
              <p className="text-sm text-slate-500">Super Admin — all departments</p>
            </div>
          </div>
          <Button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-red-600 hover:bg-red-700 text-white">
            <Plus className="w-4 h-4 mr-2" /> New Department
          </Button>
        </div>

        {(showForm && !editing) && (
          <div className="mb-6">
            <DepartmentForm onSave={(f) => saveMutation.mutate(f)} onCancel={() => setShowForm(false)} saving={saveMutation.isPending} />
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-16 text-slate-400">Loading…</div>
        ) : departments.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No departments yet</p>
            <p className="text-sm mt-1">Create the first department to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {departments.map(dept => (
              <div key={dept.id}>
                {editing?.id === dept.id ? (
                  <DepartmentForm
                    initial={editing}
                    onSave={(f) => saveMutation.mutate({ ...f, id: dept.id })}
                    onCancel={() => setEditing(null)}
                    saving={saveMutation.isPending}
                  />
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-slate-900">{dept.department_name}</h3>
                        {dept.short_name && <span className="text-xs text-slate-400 font-mono">{dept.short_name}</span>}
                        <Badge className={STATUS_COLOR[dept.status] || STATUS_COLOR.ACTIVE}>{dept.status}</Badge>
                        {dept.neris_enabled && <Badge className="bg-blue-100 text-blue-700">NERIS</Badge>}
                        {dept.production_enabled && <Badge className="bg-purple-100 text-purple-700">PROD</Badge>}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap mb-2">
                        {dept.fdid && <span>FDID: {dept.fdid}</span>}
                        {dept.neris_entity_id && <span>NERIS: {dept.neris_entity_id}</span>}
                        {dept.county && <span>{dept.county}, {dept.state}</span>}
                        <span className="font-mono text-slate-400">ID: {dept.id}</span>
                      </div>
                      <OnboardingProgress status={dept.onboarding_status} />
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => setEditing(dept)}>
                        <Settings className="w-3.5 h-3.5 mr-1" /> Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/admin/departments/${dept.id}/config`)}>
                        NERIS Config
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}