import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useDepartment } from "@/lib/DepartmentContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Save, ArrowLeft, Flame, Clock, Timer, AlertTriangle, Download } from "lucide-react";
import UnitSection from "@/components/UnitSection";
import ResponderSection from "@/components/ResponderSection";
import NarrativeGuided, { buildNarrative } from "@/components/NarrativeGuided";
import { buildNerisPayload, TYPE_RESPONSE_MAP } from "@/utils/nerisPayload";
import NerisPanel from "@/components/NerisPanel";

const TYPE_RESPONSES = Object.keys(TYPE_RESPONSE_MAP);
const PROPERTY_TYPES = ["RESIDENCE", "INDUSTRIAL", "COMMERCIAL", "AGRICULTURAL", "OTHER"];
const FD_OPTIONS = ["Petit Jean", "Oppelo", "Sardis", "Morrilton", "Hill Creek"];
const MUTUAL_AID_OPTIONS = ["N/A", "Given", "Received", "Given and Received"];

function toDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  try {
    const [h, m] = timeStr.split(":").map(Number);
    const d = new Date(dateStr);
    d.setHours(h, m, 0, 0);
    return d;
  } catch (_) { return null; }
}

function diffMinutes(a, b) {
  if (!a || !b) return null;
  const diff = Math.round((b - a) / 60000);
  return diff;
}

function formatMinutes(mins) {
  if (mins === null || mins === undefined) return null;
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

const EMPTY_FORM = {
  nfirs_id: "", psrid: "", date: "", dispatch_time: "", first_on_scene_time: "",
  control_time: "", fd_clear_time: "",
  incident_location: "", owner_occupant: "", contact_number: "",
  nature_of_call: "", investigation: "No", action_taken: "", type_response: "", type_response_2: "", type_response_3: "",
  property_type: "", value_dollar: "", loss_dollar: "", value_crop: "", value_vehicle: "",
  area: "", vin_lic: "", products: "", patients_injured: "", fatalities: "",
  mutual_aid: "N/A", fdid_received: "", total_amount: "", hydrant_location: "",
  conditions_temp: "", select_fd: "Petit Jean", incident_commander: "",
  narrative_reported: "", narrative_found: "", narrative_condition: "",
  narrative_actions: "", narrative_disposition: "", notes: "", form_url: "",
  neris_env: "TEST", neris_post_status: "", neris_incident_composite: "",
  neris_logged: false, email_status: "",
};

const Section = ({ title, badge, children, defaultOpen = true, fullGrid = false, warning }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`border rounded-xl overflow-hidden mb-4 ${warning ? "border-amber-300" : "border-slate-200"}`}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => e.key === 'Enter' && setOpen(!open)}
        className={`w-full flex items-center justify-between px-5 py-3 transition-colors cursor-pointer ${warning ? "bg-amber-50 hover:bg-amber-100" : "bg-slate-50 hover:bg-slate-100"}`}
      >
        <div className="flex items-center gap-2">
          {warning && <AlertTriangle className="w-4 h-4 text-amber-500" />}
          <span className="font-semibold text-slate-800">{title}</span>
          {badge && <Badge variant="secondary" className="text-xs">{badge}</Badge>}
          {warning && <span className="text-xs text-amber-600 font-medium">{warning}</span>}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </div>
      {open && (
        <div className={fullGrid ? "p-5" : "p-5 grid grid-cols-1 md:grid-cols-2 gap-4"}>
          {children}
        </div>
      )}
    </div>
  );
};

const Field = ({ label, required, children, full }) => (
  <div className={full ? "md:col-span-2" : ""}>
    <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
      {label} {required && <span className="text-red-500">*</span>}
    </Label>
    {children}
  </div>
);

const CalcBadge = ({ label, minutes, warn }) => {
  if (minutes === null || minutes === undefined) return null;
  const isNeg = minutes < 0;
  return (
    <div className={`flex items-center gap-1.5 border rounded-lg px-3 py-1.5 ${isNeg || warn ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
      {(isNeg || warn) ? <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> : <Timer className="w-3.5 h-3.5 text-green-600" />}
      <span className={`text-xs font-medium ${isNeg || warn ? "text-red-700" : "text-green-700"}`}>
        {label}: <strong>{isNeg ? "⚠ Negative — check times" : formatMinutes(minutes)}</strong>
      </span>
    </div>
  );
};

export default function IncidentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const { department } = useDepartment();
  const isEdit = !!id;
  const isAdmin = currentUser?.role === "admin";

  // Set FD_OPTIONS based on user role
  const FD_OPTIONS_FILTERED = useMemo(() => {
    if (isAdmin) return FD_OPTIONS; // Admins see all FDs
    return department ? [department.department_name] : []; // Non-admins see only their department
  }, [isAdmin, department]);

  const [form, setForm] = useState(EMPTY_FORM);
  const [units, setUnits] = useState([]);
  const [responders, setResponders] = useState([]);

  const { data: existing } = useQuery({
    queryKey: ["incident", id],
    queryFn: () => base44.entities.Incident.get(id),
    enabled: isEdit,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members", department?.id],
    queryFn: () => base44.entities.Member.filter({ department_id: department?.id || "" }),
    enabled: !!department?.id,
  });

  const { data: apparatus = [] } = useQuery({
    queryKey: ["apparatus", department?.id],
    queryFn: () => base44.entities.Apparatus.filter({ department_id: department?.id || "" }),
    enabled: !!department?.id,
  });

  useEffect(() => {
   if (existing) {
     const merged = { ...EMPTY_FORM };
     Object.keys(EMPTY_FORM).forEach((k) => {
       if (existing[k] !== undefined && existing[k] !== null) merged[k] = String(existing[k]);
     });
     merged.neris_logged = existing.neris_logged === true;
     setForm(merged);
   } else if (department && !isAdmin) {
     // For new incidents, default select_fd to user's department
     setForm((f) => ({ ...f, select_fd: department.department_name }));
      try { setUnits(JSON.parse(existing.units_json || "[]")); } catch (_) { setUnits([]); }
      try { setResponders(JSON.parse(existing.responders_json || "[]")); } catch (_) { setResponders([]); }
    }
  }, [existing, department, isAdmin]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target ? e.target.value : e }));
  const setNarr = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  // Calculated times
  const calcTimes = useMemo(() => {
    const dispatch = toDateTime(form.date, form.dispatch_time);
    const onScene = toDateTime(form.date, form.first_on_scene_time);
    const clear = toDateTime(form.date, form.fd_clear_time);
    return {
      response: diffMinutes(dispatch, onScene),
      duration: diffMinutes(dispatch, clear),
      scene: diffMinutes(onScene, clear),
    };
  }, [form.date, form.dispatch_time, form.first_on_scene_time, form.fd_clear_time]);

  // Validation flags
  const icFromResponders = useMemo(() => (responders.find((r) => r.role === "IC") || {}).name || "", [responders]);
  const hasIC = !!(form.incident_commander || icFromResponders);
  const clearBeforeScene = calcTimes.scene !== null && calcTimes.scene < 0;
  const clearBeforeDispatch = calcTimes.duration !== null && calcTimes.duration < 0;
  const hasTimeConflict = clearBeforeScene || clearBeforeDispatch;

  // All validation issues
  const validationIssues = useMemo(() => {
    const issues = [];
    if (!hasIC) issues.push("No IC assigned — add a responder with Role = IC or set the IC field");
    if (clearBeforeScene) issues.push("FD_CLEAR_TIME is before FIRST_ON_SCENE_TIME");
    if (clearBeforeDispatch) issues.push("FD_CLEAR_TIME is before DISPATCH_TIME");
    return issues;
  }, [hasIC, clearBeforeScene, clearBeforeDispatch]);

  // Export payload
  const handleExport = () => {
    const payload = buildNerisPayload(form, units, responders);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `neris_payload_${form.nfirs_id || "draft"}_${form.date || "nodate"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const save = useMutation({
    mutationFn: (data) => isEdit ? base44.entities.Incident.update(id, data) : base44.entities.Incident.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      navigate("/");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      incident_commander: form.incident_commander || icFromResponders,
      units_json: JSON.stringify(units),
      responders_json: JSON.stringify(responders),
    };
    ["value_dollar","loss_dollar","value_crop","value_vehicle","total_amount","patients_injured","fatalities"].forEach((k) => {
      payload[k] = payload[k] !== "" ? Number(payload[k]) : null;
    });
    if (!isAdmin) {
      delete payload.neris_env;
      delete payload.neris_post_status;
      delete payload.neris_incident_composite;
      delete payload.neris_logged;
      delete payload.email_status;
    }
    save.mutate(payload);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <Flame className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{isEdit ? "Edit Incident" : "New Incident Report"}</h1>
              <p className="text-sm text-slate-500">
                {department?.department_name || "Fire Department"}
                {isAdmin && <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Admin View</span>}
              </p>
            </div>
          </div>
          {isAdmin && (
            <Button type="button" variant="outline" onClick={handleExport} className="shrink-0 text-slate-600 border-slate-300">
              <Download className="w-4 h-4 mr-2" /> Export Payload
            </Button>
          )}
        </div>

        {/* Validation banner */}
        {validationIssues.length > 0 && (
          <div className="mb-4 bg-amber-50 border border-amber-300 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-800">Report Issues ({validationIssues.length})</span>
            </div>
            <ul className="space-y-1">
              {validationIssues.map((issue, i) => (
                <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                  <span className="mt-0.5">•</span>{issue}
                </li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-2">

          {/* IDs */}
          <Section title="Incident Identifiers" badge="IDs">
            <Field label="NFIRS ID"><Input value={form.nfirs_id} onChange={set("nfirs_id")} placeholder="e.g. 2600001" /></Field>
            <Field label="PSRID"><Input value={form.psrid} onChange={set("psrid")} placeholder="e.g. 2026-000076" /></Field>
          </Section>

          {/* Times */}
          <Section
            title="Date & Times"
            badge="Times"
            warning={hasTimeConflict ? "Time conflict detected" : null}
          >
            <Field label="Date" required>
              <Input type="date" value={form.date} onChange={set("date")} />
            </Field>
            <Field label="Conditions / Temp">
              <Input value={form.conditions_temp} onChange={set("conditions_temp")} placeholder="e.g. Cool & Clear" />
            </Field>
            <Field label="DISPATCH_TIME">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <Input type="time" value={form.dispatch_time} onChange={set("dispatch_time")} />
              </div>
            </Field>
            <Field label="FIRST_ON_SCENE_TIME">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <Input type="time" value={form.first_on_scene_time} onChange={set("first_on_scene_time")} />
              </div>
            </Field>
            <Field label="CONTROL_TIME">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <Input type="time" value={form.control_time} onChange={set("control_time")} />
              </div>
            </Field>
            <Field label="FD_CLEAR_TIME">
              <div className="flex items-center gap-2">
                <Clock className={`w-4 h-4 shrink-0 ${hasTimeConflict ? "text-red-400" : "text-slate-400"}`} />
                <Input
                  type="time"
                  value={form.fd_clear_time}
                  onChange={set("fd_clear_time")}
                  className={hasTimeConflict ? "border-red-300 bg-red-50" : ""}
                />
              </div>
            </Field>
            {/* Calculated durations */}
            {(calcTimes.response !== null || calcTimes.duration !== null || calcTimes.scene !== null) && (
              <div className="md:col-span-2 flex flex-wrap gap-2 pt-1">
                <CalcBadge label="Response" minutes={calcTimes.response} />
                <CalcBadge label="Incident Duration" minutes={calcTimes.duration} />
                <CalcBadge label="Scene Duration" minutes={calcTimes.scene} warn={clearBeforeScene} />
              </div>
            )}
          </Section>

          {/* Location */}
          <Section title="Location & Contact">
            <Field label="Incident Location" required full>
              <Input value={form.incident_location} onChange={set("incident_location")} placeholder="Street address or intersection" />
            </Field>
            <Field label="Owner / Occupant / Patient">
              <Input value={form.owner_occupant} onChange={set("owner_occupant")} placeholder="Name and address" />
            </Field>
            <Field label="Contact Number">
              <Input value={form.contact_number} onChange={set("contact_number")} placeholder="Phone number" />
            </Field>
          </Section>

          {/* Incident Details */}
          <Section title="Incident Details">
            <Field label="Nature of Call" required>
              <Input value={form.nature_of_call} onChange={set("nature_of_call")} placeholder="e.g. Medical, Structure Fire, MVC" />
            </Field>
            <Field label="Investigation">
              <Select value={form.investigation} onValueChange={set("investigation")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
              </Select>
            </Field>
            <Field label="Action Taken" required>
              <Input value={form.action_taken} onChange={set("action_taken")} placeholder="e.g. Extinguish, Medical, Cancelled" />
            </Field>
            <Field label="Type Response (Primary)">
              <Select value={form.type_response} onValueChange={set("type_response")}>
                <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                <SelectContent>{TYPE_RESPONSES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            {form.type_response && TYPE_RESPONSE_MAP[form.type_response] && (
              <div className="md:col-span-2 flex items-center gap-2 -mt-2">
                <span className="text-xs text-slate-400">NERIS code:</span>
                <code className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                  {TYPE_RESPONSE_MAP[form.type_response].code}
                </code>
              </div>
            )}
            <Field label="Type Response (Secondary)">
              <Select value={form.type_response_2} onValueChange={set("type_response_2")}>
                <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  {TYPE_RESPONSES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Type Response (Tertiary)">
              <Select value={form.type_response_3} onValueChange={set("type_response_3")}>
                <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  {TYPE_RESPONSES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Property Type">
              <Select value={form.property_type} onValueChange={set("property_type")}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{PROPERTY_TYPES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </Section>

          {/* Unit Response */}
          <Section
            title="Unit Response"
            badge={units.length > 0 ? `${units.length} unit${units.length !== 1 ? "s" : ""}` : undefined}
            fullGrid
          >
            <div className="mb-3">
             <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Select FD</Label>
             <Select value={form.select_fd} onValueChange={set("select_fd")}>
               <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
               <SelectContent>{FD_OPTIONS_FILTERED.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
             </Select>
            </div>
            <UnitSection units={units} onChange={setUnits} globalDispatch={form.dispatch_time} responders={responders} apparatus={apparatus} />
          </Section>

          {/* Responders */}
          <Section
            title="Responders"
            badge={responders.length > 0 ? `${responders.length}` : undefined}
            fullGrid
            warning={!hasIC ? "No IC assigned" : null}
          >
            <div className="mb-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  Incident Commander (IC)
                  {!hasIC && <span className="ml-2 text-xs text-amber-600">⚠ Required</span>}
                </Label>
                <Input
                  value={form.incident_commander}
                  onChange={set("incident_commander")}
                  placeholder={icFromResponders ? `Auto: ${icFromResponders}` : "Name or assign IC role below"}
                  className={!hasIC ? "border-amber-300" : ""}
                />
                {icFromResponders && !form.incident_commander && (
                  <p className="text-xs text-green-600 mt-1">Auto-detected from responders: {icFromResponders}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Ambulance Service/Unit No.</Label>
                <Input
                  value={form.ambulance_unit || ""}
                  onChange={(e) => setForm(f => ({ ...f, ambulance_unit: e.target.value }))}
                  placeholder="e.g. Med-Tech / 8001"
                />
              </div>
            </div>
            <ResponderSection responders={responders} onChange={setResponders} units={units} members={members} />
          </Section>

          {/* Mutual Aid */}
          <Section title="Mutual Aid" defaultOpen={false}>
            <Field label="Mutual Aid Given/Received">
              <Select value={form.mutual_aid} onValueChange={set("mutual_aid")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MUTUAL_AID_OPTIONS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="FDID Number Received">
              <Input value={form.fdid_received} onChange={set("fdid_received")} placeholder="e.g. Oppelo, Sardis" />
            </Field>
            <Field label="Hydrant Number/Location">
              <Input value={form.hydrant_location} onChange={set("hydrant_location")} />
            </Field>
          </Section>

          {/* Values */}
          <Section title="Property / Loss Values" defaultOpen={false}>
            <Field label="Property Value ($)"><Input type="number" value={form.value_dollar} onChange={set("value_dollar")} /></Field>
            <Field label="Loss ($)"><Input type="number" value={form.loss_dollar} onChange={set("loss_dollar")} /></Field>
            <Field label="Crop Value ($)"><Input type="number" value={form.value_crop} onChange={set("value_crop")} /></Field>
            <Field label="Vehicle Value ($)"><Input type="number" value={form.value_vehicle} onChange={set("value_vehicle")} /></Field>
            <Field label="Total Amount ($)"><Input type="number" value={form.total_amount} onChange={set("total_amount")} /></Field>
            <Field label="Area"><Input value={form.area} onChange={set("area")} placeholder="e.g. 2 acres" /></Field>
            <Field label="VIN / LIC"><Input value={form.vin_lic} onChange={set("vin_lic")} /></Field>
            <Field label="Products Involved"><Input value={form.products} onChange={set("products")} /></Field>
            <Field label="Patients Injured"><Input type="number" value={form.patients_injured} onChange={set("patients_injured")} /></Field>
            <Field label="Fatalities"><Input type="number" value={form.fatalities} onChange={set("fatalities")} /></Field>
          </Section>

          {/* Narrative */}
          <Section title="Narrative" fullGrid>
            <NarrativeGuided fields={form} onChange={setNarr} />
          </Section>

          {/* NERIS Data */}
          <Section title="NERIS Data" badge="Admin Only">
              <Field label="NERIS Environment">
                <Select value={form.neris_env} onValueChange={set("neris_env")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TEST">TEST</SelectItem>
                    <SelectItem value="PROD">PROD</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="NERIS Post Status">
                <Input value={form.neris_post_status} onChange={set("neris_post_status")} placeholder="e.g. success, pending" />
              </Field>
              <Field label="NERIS Incident Composite ID" full>
                <Input value={form.neris_incident_composite} onChange={set("neris_incident_composite")} placeholder="e.g. FD12345678|001|000000001" />
              </Field>
              <Field label="NERIS Logged">
                <Select value={form.neris_logged ? "true" : "false"} onValueChange={(v) => setForm((f) => ({ ...f, neris_logged: v === "true" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">No</SelectItem>
                    <SelectItem value="true">Yes</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Email Status">
                <Input value={form.email_status} onChange={set("email_status")} placeholder="e.g. sent, pending" />
              </Field>
              <Field label="Form URL" full>
                <Input value={form.form_url} onChange={set("form_url")} placeholder="Google Forms edit URL" />
              </Field>
            </Section>

          {/* NERIS Translation Engine */}
          <Section title="NERIS Translation Engine" badge="Admin Only" fullGrid>
            <NerisPanel form={form} incidentId={id} units={units} responders={responders} />
          </Section>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={save.isPending} className="bg-red-600 hover:bg-red-700 text-white px-8">
              <Save className="w-4 h-4 mr-2" />
              {save.isPending ? "Saving..." : (isEdit ? "Update Incident" : "Save Incident")}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/")}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}