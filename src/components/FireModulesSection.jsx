/**
 * FireModulesSection — NERIS structure fire data entry.
 *
 * The NERIS payload has TWO separate top-level nodes:
 *
 *  1. fire_detail  → location_detail, water_supply, suppression_appliances,
 *                    investigation_needed, investigation_types
 *
 *  2. risk_reduction (smoke_alarm, fire_alarm, other_alarm, fire_suppression)
 *     — required for FIRE||STRUCTURE_FIRE incidents — also top-level in payload.
 *
 * This component edits both under a single `value` prop with shape:
 *   {
 *     fire_detail: { location_detail: {...}, water_supply, suppression_appliances, investigation_needed, investigation_types },
 *     smoke_alarm: { present, alerted_occupants, effectiveness },
 *     fire_alarm:  { present, operated, effectiveness },
 *     other_alarm: { present, alerted_occupants },
 *     fire_suppression: { present, operated, effectiveness },
 *   }
 */
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Flame } from "lucide-react";

// ── Value sets (from NERIS spec) ─────────────────────────────────────────────

const ARRIVAL_CONDITIONS = [
  ["NO_SMOKE_FIRE_SHOWING", "No Smoke / Fire Showing"],
  ["SMOKE_SHOWING", "Smoke Showing"],
  ["SMOKE_FIRE_SHOWING", "Smoke And Fire Showing"],
  ["STRUCTURE_INVOLVED", "Structure Involved"],
  ["FIRE_SPREAD_BEYOND_STRUCTURE", "Fire Spread Beyond Structure"],
  ["FIRE_OUT_UPON_ARRIVAL", "Fire Out Upon Arrival"],
];

const DAMAGE_TYPES = [
  ["NO_DAMAGE", "No Damage"],
  ["MINOR_DAMAGE", "Minor Damage"],
  ["MODERATE_DAMAGE", "Moderate Damage"],
  ["MAJOR_DAMAGE", "Major Damage"],
];

const ROOMS = [
  ["ASSEMBLY", "Assembly"], ["BATHROOM", "Bathroom"], ["BEDROOM", "Bedroom"],
  ["KITCHEN", "Kitchen"], ["LIVING_SPACE", "Living Space"], ["HALLWAY_FOYER", "Hallway / Foyer"],
  ["GARAGE", "Garage"], ["BALCONY_PORCH_DECK", "Balcony / Porch / Deck"],
  ["BASEMENT", "Basement"], ["ATTIC", "Attic"], ["OFFICE", "Office"],
  ["UTILITY_ROOM", "Utility Room"], ["OTHER", "Other"], ["UNKNOWN", "Unknown"],
];

const FIRE_CAUSES = [
  ["OPERATING_EQUIPMENT", "Operating Equipment"],
  ["ELECTRICAL", "Electrical"],
  ["BATTERY_POWER_STORAGE", "Battery / Power Storage"],
  ["HEAT_FROM_ANOTHER_OBJECT", "Heat From Another Object"],
  ["EXPLOSIVES_FIREWORKS", "Explosives / Fireworks"],
  ["SMOKING_MATERIALS_ILLICIT_DRUGS", "Smoking Materials / Illicit Drugs"],
  ["OPEN_FLAME", "Open Flame"],
  ["COOKING", "Cooking"],
  ["CHEMICAL", "Chemical"],
  ["ACT_OF_NATURE", "Act Of Nature"],
  ["INCENDIARY", "Incendiary"],
  ["OTHER_HEAT_SOURCE", "Other Heat Source"],
  ["UNABLE_TO_BE_DETERMINED", "Unable To Be Determined"],
];

const WATER_SUPPLIES = [
  ["HYDRANT_LESS_500", "Hydrant (< 500 gpm)"],
  ["HYDRANT_GREATER_500", "Hydrant (> 500 gpm)"],
  ["TANK_WATER", "Tank Water"],
  ["WATER_TENDER_SHUTTLE", "Water Tender / Shuttle"],
  ["NURSE_OTHER_APPARATUS", "Nurse From Other Apparatus"],
  ["DRAFT_FROM_STATIC_SOURCE", "Draft From Static Source"],
  ["SUPPLY_FROM_FIRE_BOAT", "Supply From Fire Boat"],
  ["FOAM_ADDITIVE", "Foam / Water Additive"],
];

const INVESTIGATION_NEEDS = [
  ["YES", "Yes"],
  ["NO", "No"],
  ["NOT_EVALUATED", "Not Evaluated"],
  ["NOT_APPLICABLE", "Not Applicable"],
  ["NO_CAUSE_OBVIOUS", "No - Cause Obvious"],
  ["OTHER", "Other"],
];

const INVESTIGATION_TYPES = [
  ["INVESTIGATED_ON_SCENE_RESOURCE", "On-Scene Resources"],
  ["INVESTIGATED_BY_ARSON_FIRE_INVESTIGATOR", "Arson / Fire Investigator"],
  ["INVESTIGATED_BY_OUTSIDE_AGENCY", "Outside Fire Agency"],
  ["INVESTIGATED_BY_STATE_FIRE_MARSHAL", "State Fire Marshal"],
  ["INVESTIGATED_BY_INSURANCE", "Insurance"],
  ["INVESTIGATED_BY_NONFIRE_LAW_ENFORCEMENT", "Law Enforcement (Nonfire)"],
  ["INVESTIGATED_BY_OTHER", "Other"],
];

const SUPPRESSION_APPLIANCES = [
  ["FIRE_EXTINGUISHER", "Fire Extinguisher"],
  ["BOOSTER_FIRE_HOSE", "Booster (< 1\") Fire Hose"],
  ["SMALL_DIAMETER_FIRE_HOSE", "Small Diameter (1\"-2\") Hose"],
  ["MEDIUM_DIAMETER_FIRE_HOSE", "Medium Diameter (2\"-3\") Hose"],
  ["GROUND_MONITOR", "Ground Monitor"],
  ["MASTER_STREAM", "Master Stream"],
  ["ELEVATED_MASTER_STREAM_STANDPIPE", "Elevated Master Stream / Standpipe"],
  ["BUILDING_STANDPIPE", "Building Standpipe"],
  ["BUILDING_FDC", "Building FDC"],
  ["AIRATTACK_HELITACK", "Air Tanker / Helitank"],
  ["OTHER", "Other"],
  ["NONE", "None"],
];



// ── Helpers ──────────────────────────────────────────────────────────────────

const Row = ({ label, children }) => (
  <div className="flex flex-wrap items-start gap-x-6 gap-y-2 py-2 border-b border-slate-100 last:border-0">
    <span className="text-sm font-medium text-slate-700 w-36 shrink-0 pt-1">{label}</span>
    <div className="flex flex-wrap items-center gap-4">{children}</div>
  </div>
);

const Field = ({ label, children }) => (
  <div className="flex flex-col gap-1">
    <span className="text-xs text-slate-500">{label}</span>
    {children}
  </div>
);

const EnumSelect = ({ value, onChange, options, placeholder = "Select..." }) => (
  <Select value={value || ""} onValueChange={onChange}>
    <SelectTrigger className="h-8 text-sm min-w-[160px]"><SelectValue placeholder={placeholder} /></SelectTrigger>
    <SelectContent>
      {options.map(([v, label]) => <SelectItem key={v} value={v}>{label}</SelectItem>)}
    </SelectContent>
  </Select>
);

const YesNo = ({ value, onChange }) => (
  <Select value={value === true ? "true" : value === false ? "false" : ""} onValueChange={(v) => onChange(v === "true")}>
    <SelectTrigger className="h-8 text-sm w-20"><SelectValue /></SelectTrigger>
    <SelectContent>
      <SelectItem value="false">No</SelectItem>
      <SelectItem value="true">Yes</SelectItem>
    </SelectContent>
  </Select>
);

const RR_PRESENCE_OPTIONS = [
  ["PRESENT", "Present"],
  ["NOT_PRESENT", "Not Present"],
  ["NOT_APPLICABLE", "Not Applicable"],
];

// Multi-select checkboxes for array fields
const MultiCheck = ({ value = [], onChange, options }) => {
  const toggle = (v) => {
    const next = value.includes(v) ? value.filter((x) => x !== v) : [...value, v];
    onChange(next);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([v, label]) => (
        <label key={v} className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={value.includes(v)}
            onChange={() => toggle(v)}
            className="rounded border-slate-300"
          />
          <span className="text-xs text-slate-600">{label}</span>
        </label>
      ))}
    </div>
  );
};

// ── Default shape ─────────────────────────────────────────────────────────────

export const DEFAULT_FIRE_MODULES = {
  fire_detail: {
    location_detail: {
      type: "STRUCTURE",
      arrival_condition: "",
      progression_evident: false,
      damage_type: "",
      floor_of_origin: 1,
      room_of_origin_type: "",
      cause: "",
    },
    water_supply: "",
    suppression_appliances: [],
    investigation_needed: "",
    investigation_types: [],
  },
  // Risk reduction: presence is an object { type: "PRESENT" | "NOT_PRESENT" | "NOT_APPLICABLE" }
  smoke_alarm:     { presence: { type: "NOT_APPLICABLE" } },
  fire_alarm:      { presence: { type: "NOT_APPLICABLE" } },
  other_alarm:     { presence: { type: "NOT_APPLICABLE" } },
  fire_suppression:{ presence: { type: "NOT_APPLICABLE" } },
};

// ── Main component ─────────────────────────────────────────────────────────────

export default function FireModulesSection({ value, onChange }) {
  const m = value || DEFAULT_FIRE_MODULES;
  const fd = m.fire_detail || DEFAULT_FIRE_MODULES.fire_detail;
  const ld = fd.location_detail || DEFAULT_FIRE_MODULES.fire_detail.location_detail;

  const setLd = (key, val) =>
    onChange({ ...m, fire_detail: { ...fd, location_detail: { ...ld, [key]: val } } });
  const setFd = (key, val) =>
    onChange({ ...m, fire_detail: { ...fd, [key]: val } });
  // presence must be { type: "..." } per NERIS schema discriminator
  const setPresence = (module, typeVal) =>
    onChange({ ...m, [module]: { ...m[module], presence: { type: typeVal } } });

  return (
    <div className="space-y-5">

      {/* ── fire_detail ─────────────────────────────────────── */}
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="w-4 h-4 text-red-600" />
          <span className="text-sm font-semibold text-red-800">
            Fire Detail <span className="text-red-500 font-normal">(fire_detail — required for FIRE incidents)</span>
          </span>
        </div>

        {/* location_detail */}
        <div className="bg-white rounded-md border border-red-100 px-4 py-1 mb-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide py-2">Location Detail</p>
          <Row label="Arrival Condition">
            <Field label="Arrival Condition">
              <EnumSelect value={ld.arrival_condition} onChange={(v) => setLd("arrival_condition", v)} options={ARRIVAL_CONDITIONS} />
            </Field>
            <Field label="Progression Evident">
              <YesNo value={ld.progression_evident} onChange={(v) => setLd("progression_evident", v)} />
            </Field>
          </Row>
          <Row label="Damage Type">
            <Field label="Building Damage">
              <EnumSelect value={ld.damage_type} onChange={(v) => setLd("damage_type", v)} options={DAMAGE_TYPES} />
            </Field>
          </Row>
          <Row label="Origin">
            <Field label="Floor of Origin">
              <Input
                type="number"
                value={ld.floor_of_origin ?? 1}
                onChange={(e) => setLd("floor_of_origin", parseInt(e.target.value) || 1)}
                className="h-8 text-sm w-20"
              />
            </Field>
            <Field label="Room of Origin">
              <EnumSelect value={ld.room_of_origin_type} onChange={(v) => setLd("room_of_origin_type", v)} options={ROOMS} />
            </Field>
          </Row>
          <Row label="Fire Cause">
            <Field label="Cause">
              <EnumSelect value={ld.cause} onChange={(v) => setLd("cause", v)} options={FIRE_CAUSES} />
            </Field>
          </Row>
        </div>

        {/* water_supply / suppression_appliances */}
        <div className="bg-white rounded-md border border-red-100 px-4 py-1 mb-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide py-2">Water & Suppression</p>
          <Row label="Water Supply">
            <Field label="Water Supply">
              <EnumSelect value={fd.water_supply} onChange={(v) => setFd("water_supply", v)} options={WATER_SUPPLIES} />
            </Field>
          </Row>
          <Row label="Suppression Appliances">
            <MultiCheck value={fd.suppression_appliances} onChange={(v) => setFd("suppression_appliances", v)} options={SUPPRESSION_APPLIANCES} />
          </Row>
        </div>

        {/* investigation */}
        <div className="bg-white rounded-md border border-red-100 px-4 py-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide py-2">Investigation</p>
          <Row label="Investigation Needed">
            <Field label="Needed?">
              <EnumSelect value={fd.investigation_needed} onChange={(v) => setFd("investigation_needed", v)} options={INVESTIGATION_NEEDS} />
            </Field>
          </Row>
          {fd.investigation_needed && fd.investigation_needed !== "NO" && fd.investigation_needed !== "NOT_APPLICABLE" && (
            <Row label="Investigation Types">
              <MultiCheck value={fd.investigation_types} onChange={(v) => setFd("investigation_types", v)} options={INVESTIGATION_TYPES} />
            </Row>
          )}
        </div>
      </div>

      {/* ── Risk Reduction (smoke_alarm, fire_alarm, other_alarm, fire_suppression) ── */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-semibold text-amber-800">
            Risk Reduction <span className="text-amber-600 font-normal">(required for STRUCTURE_FIRE — each only needs "presence")</span>
          </span>
        </div>
        <div className="bg-white rounded-md border border-amber-100 px-4 py-1">
          {/* smoke_alarm */}
          <Row label="Smoke Alarm">
            <Field label="Presence">
              <EnumSelect value={m.smoke_alarm?.presence?.type} onChange={(v) => setPresence("smoke_alarm", v)} options={RR_PRESENCE_OPTIONS} />
            </Field>
          </Row>
          {/* fire_alarm */}
          <Row label="Fire Alarm">
            <Field label="Presence">
              <EnumSelect value={m.fire_alarm?.presence?.type} onChange={(v) => setPresence("fire_alarm", v)} options={RR_PRESENCE_OPTIONS} />
            </Field>
          </Row>
          {/* other_alarm */}
          <Row label="Other Alarm">
            <Field label="Presence">
              <EnumSelect value={m.other_alarm?.presence?.type} onChange={(v) => setPresence("other_alarm", v)} options={RR_PRESENCE_OPTIONS} />
            </Field>
          </Row>
          {/* fire_suppression */}
          <Row label="Fire Suppression">
            <Field label="Presence">
              <EnumSelect value={m.fire_suppression?.presence?.type} onChange={(v) => setPresence("fire_suppression", v)} options={RR_PRESENCE_OPTIONS} />
            </Field>
          </Row>
        </div>
      </div>
    </div>
  );
}