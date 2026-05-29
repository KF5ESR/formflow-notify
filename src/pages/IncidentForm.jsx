import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Save, ArrowLeft, Flame } from "lucide-react";

const TYPE_RESPONSES = [
  "Medical > Illness > Chest Pain (Non-Trauma)",
  "Medical > Illness > Allergic Reaction / Stings",
  "Medical > Illness > Nausea / Vomiting",
  "Medical > Trauma > Fall",
  "Medical > Trauma > MVC Injury",
  "Fire > Structure Fire > Structural Involvement",
  "Fire > Structure Fire > Room and Contents Fire",
  "Fire > Outside Fire > Vegetation / Grass Fire",
  "Fire > Outside Fire > Dumpster / Other Outdoor Container Fire",
  "Motor Vehicle Collision (MVC)",
  "Search and Rescue (SAR)",
  "No Emergency > Cancelled",
  "No Emergency > Controlled Burn / Standby",
  "Natural Disaster",
  "Hazmat",
  "Other",
];

const PROPERTY_TYPES = ["RESIDENCE", "INDUSTRIAL", "COMMERCIAL", "AGRICULTURAL", "OTHER"];
const FD_OPTIONS = ["Petit Jean", "Oppelo", "Sardis", "Morrilton", "Hill Creek"];
const MUTUAL_AID_OPTIONS = ["N/A", "Given", "Received", "Given and Received"];

const EMPTY_FORM = {
  nfirs_id: "", psrid: "", date: "", call_time: "", on_scene: "", controlled: "", in_service: "",
  incident_location: "", owner_occupant: "", contact_number: "",
  nature_of_call: "", investigation: "No", action_taken: "", type_response: "", type_response_2: "",
  property_type: "", value_dollar: "", loss_dollar: "", value_crop: "", value_vehicle: "",
  area: "", vin_lic: "", products: "", patients_injured: "", fatalities: "",
  mutual_aid: "N/A", fdid_received: "", total_personnel: "", ambulance_unit: "",
  total_amount: "", hydrant_location: "", conditions_temp: "", select_fd: "Petit Jean",
  incident_commander: "", apparatus: "", responders: "", notes: "", form_url: "",
  neris_env: "TEST", neris_post_status: "", neris_incident_composite: "", neris_logged: false,
  email_status: "",
};

const Section = ({ title, badge, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden mb-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800">{title}</span>
          {badge && <Badge variant="secondary" className="text-xs">{badge}</Badge>}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>
      {open && <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>}
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

export default function IncidentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [form, setForm] = useState(EMPTY_FORM);

  const { data: existing } = useQuery({
    queryKey: ["incident", id],
    queryFn: () => base44.entities.Incident.get(id),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      const merged = { ...EMPTY_FORM };
      Object.keys(EMPTY_FORM).forEach((k) => {
        if (existing[k] !== undefined && existing[k] !== null) merged[k] = String(existing[k]);
      });
      merged.neris_logged = existing.neris_logged === true;
      setForm(merged);
    }
  }, [existing]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target ? e.target.value : e }));

  const save = useMutation({
    mutationFn: (data) => isEdit ? base44.entities.Incident.update(id, data) : base44.entities.Incident.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      navigate("/");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form };
    ["value_dollar","loss_dollar","value_crop","value_vehicle","total_amount","patients_injured","fatalities"].forEach((k) => {
      payload[k] = payload[k] !== "" ? Number(payload[k]) : null;
    });
    save.mutate(payload);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <Flame className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{isEdit ? "Edit Incident" : "New Incident Report"}</h1>
              <p className="text-sm text-slate-500">Petit Jean Fire Department</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2">
          {/* Incident IDs */}
          <Section title="Incident Identifiers" badge="IDs">
            <Field label="NFIRS ID"><Input value={form.nfirs_id} onChange={set("nfirs_id")} placeholder="e.g. 2600001" /></Field>
            <Field label="PSRID"><Input value={form.psrid} onChange={set("psrid")} placeholder="e.g. 2026-000076" /></Field>
          </Section>

          {/* Timestamps */}
          <Section title="Date & Times" badge="Times">
            <Field label="Date" required>
              <Input type="date" value={form.date} onChange={set("date")} />
            </Field>
            <Field label="Call Time"><Input type="time" value={form.call_time} onChange={set("call_time")} /></Field>
            <Field label="On Scene"><Input type="time" value={form.on_scene} onChange={set("on_scene")} /></Field>
            <Field label="Controlled"><Input type="time" value={form.controlled} onChange={set("controlled")} /></Field>
            <Field label="In Service"><Input type="time" value={form.in_service} onChange={set("in_service")} /></Field>
            <Field label="Conditions / Temp"><Input value={form.conditions_temp} onChange={set("conditions_temp")} placeholder="e.g. Cool & Clear" /></Field>
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
                <SelectContent>
                  {TYPE_RESPONSES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Type Response (Secondary)">
              <Select value={form.type_response_2} onValueChange={set("type_response_2")}>
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

          {/* Personnel */}
          <Section title="Personnel & Apparatus">
            <Field label="Select FD">
              <Select value={form.select_fd} onValueChange={set("select_fd")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FD_OPTIONS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Incident Commander (IC)">
              <Input value={form.incident_commander} onChange={set("incident_commander")} placeholder="Name" />
            </Field>
            <Field label="Apparatus" full>
              <Input value={form.apparatus} onChange={set("apparatus")} placeholder="e.g. E555, T585, B562" />
            </Field>
            <Field label="Responders" full>
              <Input value={form.responders} onChange={set("responders")} placeholder="Comma-separated names" />
            </Field>
            <Field label="Total Personnel/Apparatus">
              <Input value={form.total_personnel} onChange={set("total_personnel")} placeholder="e.g. 8" />
            </Field>
            <Field label="Ambulance Service/Unit No.">
              <Input value={form.ambulance_unit} onChange={set("ambulance_unit")} placeholder="e.g. Med-Tech / 8001" />
            </Field>
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
            <Field label="Products Involved"><Input value={form.products} onChange={set("products")} placeholder="e.g. Brush, Propane" /></Field>
            <Field label="Patients Injured"><Input type="number" value={form.patients_injured} onChange={set("patients_injured")} /></Field>
            <Field label="Fatalities"><Input type="number" value={form.fatalities} onChange={set("fatalities")} /></Field>
          </Section>

          {/* NERIS */}
          <Section title="NERIS Data" badge="NERIS" defaultOpen={true}>
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
            <Field label="NERIS Incident Composite ID">
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

          {/* Notes */}
          <Section title="Narrative / Notes">
            <Field label="Notes" full>
              <Textarea value={form.notes} onChange={set("notes")} rows={6} placeholder="Detailed incident narrative..." className="resize-y" />
            </Field>
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