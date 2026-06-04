import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flame } from "lucide-react";

const EFFECTIVENESS = ["EFFECTIVE", "INEFFECTIVE", "UNDETERMINED"];

const YesNoSelect = ({ value, onChange }) => (
  <Select value={value ?? "false"} onValueChange={(v) => onChange(v === "true")}>
    <SelectTrigger className="w-24 h-8 text-sm"><SelectValue /></SelectTrigger>
    <SelectContent>
      <SelectItem value="false">No</SelectItem>
      <SelectItem value="true">Yes</SelectItem>
    </SelectContent>
  </Select>
);

const EffectivenessSelect = ({ value, onChange }) => (
  <Select value={value || "UNDETERMINED"} onValueChange={onChange}>
    <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
    <SelectContent>
      {EFFECTIVENESS.map((e) => <SelectItem key={e} value={e}>{e.charAt(0) + e.slice(1).toLowerCase()}</SelectItem>)}
    </SelectContent>
  </Select>
);

const ModuleRow = ({ label, fields, values, onChange }) => (
  <div className="flex flex-wrap items-center gap-4 py-2 border-b border-slate-100 last:border-0">
    <span className="text-sm font-medium text-slate-700 w-32 shrink-0">{label}</span>
    {fields.map(({ key, label: fLabel }) => (
      <div key={key} className="flex items-center gap-2">
        <span className="text-xs text-slate-500">{fLabel}</span>
        {key === "effectiveness" ? (
          <EffectivenessSelect value={values[key]} onChange={(v) => onChange(key, v)} />
        ) : (
          <YesNoSelect value={values[key]} onChange={(v) => onChange(key, v)} />
        )}
      </div>
    ))}
  </div>
);

/**
 * fireModules shape:
 * {
 *   smoke_alarm: { present, alerted_occupants, effectiveness },
 *   fire_alarm: { present, operated, effectiveness },
 *   other_alarm: { present, alerted_occupants },
 *   fire_suppression: { present, operated, effectiveness }
 * }
 */
export const DEFAULT_FIRE_MODULES = {
  smoke_alarm: { present: false, alerted_occupants: false, effectiveness: "UNDETERMINED" },
  fire_alarm: { present: false, operated: false, effectiveness: "UNDETERMINED" },
  other_alarm: { present: false, alerted_occupants: false },
  fire_suppression: { present: false, operated: false, effectiveness: "UNDETERMINED" },
};

export default function FireModulesSection({ value, onChange }) {
  const modules = value || DEFAULT_FIRE_MODULES;

  const update = (module, key, val) => {
    onChange({ ...modules, [module]: { ...modules[module], [key]: val } });
  };

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Flame className="w-4 h-4 text-amber-600" />
        <span className="text-sm font-semibold text-amber-800">
          Structure Fire Modules <span className="text-amber-600 font-normal">(Required by NERIS for structure fire incidents)</span>
        </span>
      </div>
      <div className="bg-white rounded-md border border-amber-100 px-4 py-1">
        <ModuleRow
          label="Smoke Alarm"
          values={modules.smoke_alarm}
          onChange={(k, v) => update("smoke_alarm", k, v)}
          fields={[
            { key: "present", label: "Present" },
            { key: "alerted_occupants", label: "Alerted" },
            { key: "effectiveness", label: "Effectiveness" },
          ]}
        />
        <ModuleRow
          label="Fire Alarm"
          values={modules.fire_alarm}
          onChange={(k, v) => update("fire_alarm", k, v)}
          fields={[
            { key: "present", label: "Present" },
            { key: "operated", label: "Operated" },
            { key: "effectiveness", label: "Effectiveness" },
          ]}
        />
        <ModuleRow
          label="Other Alarm"
          values={modules.other_alarm}
          onChange={(k, v) => update("other_alarm", k, v)}
          fields={[
            { key: "present", label: "Present" },
            { key: "alerted_occupants", label: "Alerted" },
          ]}
        />
        <ModuleRow
          label="Fire Suppression"
          values={modules.fire_suppression}
          onChange={(k, v) => update("fire_suppression", k, v)}
          fields={[
            { key: "present", label: "Present" },
            { key: "operated", label: "Operated" },
            { key: "effectiveness", label: "Effectiveness" },
          ]}
        />
      </div>
    </div>
  );
}