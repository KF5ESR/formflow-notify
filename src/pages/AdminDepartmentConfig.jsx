/**
 * AdminDepartmentConfig — configure NERIS settings for a specific department.
 * Accessible by Super Admin and Department Admin.
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ONBOARDING_STEPS } from "@/lib/nerisReadiness";
import { ArrowLeft, Settings, CheckCircle, XCircle, AlertTriangle, Building2 } from "lucide-react";

const EMPTY_CONFIG = {
  env: "TEST", base_url: "https://api-test.neris.fsri.org/v1",
  entity_id: "", incident_id_source: "NFIRS_ID",
  apps_script_validate_url: "", config_status: "INCOMPLETE",
  default_state: "", default_city: "", default_postal: "",
};

function ConfigStatusBadge({ status }) {
  if (status === "VERIFIED") return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>;
  if (status === "COMPLETE") return <Badge className="bg-blue-100 text-blue-700"><CheckCircle className="w-3 h-3 mr-1" />Complete</Badge>;
  return <Badge className="bg-amber-100 text-amber-700"><AlertTriangle className="w-3 h-3 mr-1" />Incomplete</Badge>;
}

function OnboardingChecklist({ department, nerisConfig }) {
  const checks = [
    { label: "Department name set", ok: !!department?.department_name },
    { label: "FDID set", ok: !!department?.fdid },
    { label: "State set", ok: !!department?.state },
    { label: "NERIS Entity ID set", ok: !!nerisConfig?.entity_id },
    { label: "Environment set", ok: !!nerisConfig?.env },
    { label: "Incident ID source set", ok: !!nerisConfig?.incident_id_source },
    { label: "Apps Script validate URL set", ok: !!nerisConfig?.apps_script_validate_url },
    { label: "Test validation passed", ok: nerisConfig?.validation_test_status === "PASSED" },
  ];
  const done = checks.filter(c => c.ok).length;

  return (
    <div className="border border-slate-200 rounded-xl p-5 bg-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-800">Onboarding Checklist</h3>
        <span className="text-sm text-slate-500">{done}/{checks.length} complete</span>
      </div>
      <div className="space-y-2">
        {checks.map((c, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            {c.ok
              ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
              : <XCircle className="w-4 h-4 text-slate-300 shrink-0" />}
            <span className={c.ok ? "text-slate-700" : "text-slate-400"}>{c.label}</span>
          </div>
        ))}
      </div>
      {done === checks.length && (
        <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700 font-medium">
          ✓ All checks passed — department is NERIS-ready for production review.
        </div>
      )}
    </div>
  );
}

export default function AdminDepartmentConfig() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [configForm, setConfigForm] = useState(EMPTY_CONFIG);
  const [existingConfigId, setExistingConfigId] = useState(null);

  const canAccess = ["super_admin", "admin", "dept_admin"].includes(currentUser?.role) ||
    (currentUser?.role === "dept_admin" && currentUser?.department_id === id);

  const { data: department } = useQuery({
    queryKey: ["department", id],
    queryFn: () => base44.entities.Department.get(id),
    enabled: !!id,
  });

  const { data: configs = [] } = useQuery({
    queryKey: ["neris_config", id],
    queryFn: () => base44.entities.NerisConfig.filter({ department_id: id }),
    enabled: !!id,
  });

  useEffect(() => {
    if (configs.length > 0) {
      const cfg = configs[0];
      setExistingConfigId(cfg.id);
      setConfigForm({
        env: cfg.env || "TEST",
        base_url: cfg.base_url || "",
        entity_id: cfg.entity_id || "",
        incident_id_source: cfg.incident_id_source || "NFIRS_ID",
        apps_script_validate_url: cfg.apps_script_validate_url || "",
        config_status: cfg.config_status || "INCOMPLETE",
        default_state: cfg.default_state || "",
        default_city: cfg.default_city || "",
        default_postal: cfg.default_postal || "",
      });
    }
  }, [configs]);

  const saveConfig = useMutation({
    mutationFn: (form) => {
      const data = { ...form, department_id: id };
      return existingConfigId
        ? base44.entities.NerisConfig.update(existingConfigId, data)
        : base44.entities.NerisConfig.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["neris_config", id] });
      queryClient.invalidateQueries({ queryKey: ["neris_config"] });
    },
  });

  const set = (k) => (e) => setConfigForm(f => ({ ...f, [k]: e.target ? e.target.value : e }));

  if (!canAccess) return (
    <div className="min-h-screen flex items-center justify-center text-slate-500">Access denied.</div>
  );

  const nerisConfig = configs[0] || null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/departments")} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{department?.department_name || "Department Config"}</h1>
              <p className="text-sm text-slate-500">NERIS Configuration & Onboarding</p>
            </div>
          </div>
          {nerisConfig && <ConfigStatusBadge status={nerisConfig.config_status} />}
        </div>

        <OnboardingChecklist department={department} nerisConfig={nerisConfig} />

        {/* NERIS Config Form */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-500" /> NERIS Configuration
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Environment</Label>
              <Select value={configForm.env} onValueChange={(v) => setConfigForm(f => ({ ...f, env: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEST">TEST</SelectItem>
                  <SelectItem value="PROD">PROD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Incident ID Source</Label>
              <Select value={configForm.incident_id_source} onValueChange={(v) => setConfigForm(f => ({ ...f, incident_id_source: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NFIRS_ID">NFIRS ID</SelectItem>
                  <SelectItem value="PSRID">PSRID</SelectItem>
                  <SelectItem value="AUTO">Auto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>NERIS Entity ID</Label><Input value={configForm.entity_id} onChange={set("entity_id")} placeholder="e.g. FD05049197" /></div>
            <div><Label>NERIS Base URL</Label><Input value={configForm.base_url} onChange={set("base_url")} placeholder="https://api-test.neris.fsri.org/v1" /></div>
            <div className="md:col-span-2">
              <Label>Apps Script Validate URL</Label>
              <Input value={configForm.apps_script_validate_url} onChange={set("apps_script_validate_url")} placeholder="https://script.google.com/macros/s/…/exec" />
            </div>
            <div><Label>Default State</Label><Input value={configForm.default_state} onChange={set("default_state")} maxLength={2} className="uppercase" /></div>
            <div><Label>Default City</Label><Input value={configForm.default_city} onChange={set("default_city")} /></div>
            <div>
              <Label>Config Status</Label>
              <Select value={configForm.config_status} onValueChange={(v) => setConfigForm(f => ({ ...f, config_status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOMPLETE">Incomplete</SelectItem>
                  <SelectItem value="COMPLETE">Complete</SelectItem>
                  <SelectItem value="VERIFIED">Verified</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={() => saveConfig.mutate(configForm)}
            disabled={saveConfig.isPending}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {saveConfig.isPending ? "Saving…" : existingConfigId ? "Update Config" : "Save Config"}
          </Button>
          {saveConfig.isSuccess && <span className="text-sm text-green-600 ml-3">✓ Saved</span>}
        </div>
      </div>
    </div>
  );
}