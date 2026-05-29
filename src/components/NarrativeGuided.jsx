import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Edit2 } from "lucide-react";
import { useState, useEffect } from "react";

const PROMPTS = [
  { key: "narrative_reported",    label: "What was reported?",           placeholder: "Describe the initial call — type of incident, caller information, what was dispatched..." },
  { key: "narrative_found",       label: "What was found on arrival?",   placeholder: "Conditions on arrival — visible signs of fire/injury, hazards, who was present..." },
  { key: "narrative_condition",   label: "Patient / scene condition",    placeholder: "Patient vitals, LOC, extent of fire/damage, hazmat conditions..." },
  { key: "narrative_actions",     label: "Actions taken",                placeholder: "What did responders do? Equipment used, treatments given, water supply, overhaul..." },
  { key: "narrative_disposition", label: "Disposition / Who took over",  placeholder: "How was incident resolved? Transported to hospital, turned over to LE, structure secured..." },
];

export function buildNarrative(fields) {
  const parts = [];
  if (fields.narrative_reported)    parts.push(`Dispatched: ${fields.narrative_reported.trim()}`);
  if (fields.narrative_found)       parts.push(`Upon arrival: ${fields.narrative_found.trim()}`);
  if (fields.narrative_condition)   parts.push(`Condition: ${fields.narrative_condition.trim()}`);
  if (fields.narrative_actions)     parts.push(`Actions taken: ${fields.narrative_actions.trim()}`);
  if (fields.narrative_disposition) parts.push(`Disposition: ${fields.narrative_disposition.trim()}`);
  return parts.join(" ");
}

export default function NarrativeGuided({ fields, onChange }) {
  const [showGuided, setShowGuided] = useState(true);
  const [finalNarrative, setFinalNarrative] = useState(fields.notes || "");
  const [narrativeSynced, setNarrativeSynced] = useState(!fields.notes);

  // When guided fields change, auto-update the final narrative ONLY if not manually edited
  useEffect(() => {
    if (narrativeSynced) {
      const generated = buildNarrative(fields);
      setFinalNarrative(generated);
      onChange("notes", generated);
    }
  }, [
    fields.narrative_reported, fields.narrative_found, fields.narrative_condition,
    fields.narrative_actions, fields.narrative_disposition
  ]);

  const handleFinalEdit = (val) => {
    setFinalNarrative(val);
    setNarrativeSynced(false);
    onChange("notes", val);
  };

  const resync = () => {
    const generated = buildNarrative(fields);
    setFinalNarrative(generated);
    onChange("notes", generated);
    setNarrativeSynced(true);
  };

  return (
    <div className="space-y-4 md:col-span-2">
      {/* Toggle guided fields */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowGuided(!showGuided)}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          {showGuided ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {showGuided ? "Hide guided fields" : "Show guided fields"}
        </button>
        {!narrativeSynced && (
          <button
            type="button"
            onClick={resync}
            className="text-xs text-amber-600 hover:text-amber-800 underline"
          >
            ↺ Re-sync from guided fields
          </button>
        )}
      </div>

      {/* Guided prompts */}
      {showGuided && (
        <div className="space-y-3 border border-slate-200 rounded-lg p-4 bg-slate-50">
          {PROMPTS.map(({ key, label, placeholder }) => (
            <div key={key}>
              <Label className="text-sm font-medium text-slate-700 mb-1 block">{label}</Label>
              <Textarea
                value={fields[key] || ""}
                onChange={(e) => {
                  onChange(key, e.target.value);
                }}
                placeholder={placeholder}
                rows={2}
                className="resize-y text-sm bg-white"
              />
            </div>
          ))}
        </div>
      )}

      {/* Editable final narrative */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <Edit2 className="w-4 h-4 text-slate-400" />
          <Label className="text-sm font-medium text-slate-700">
            Final Narrative
            {narrativeSynced
              ? <span className="ml-2 text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Auto-synced</span>
              : <span className="ml-2 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Manually edited</span>
            }
          </Label>
          <span className="ml-auto text-xs text-slate-400">{finalNarrative.length} chars</span>
        </div>
        <Textarea
          value={finalNarrative}
          onChange={(e) => handleFinalEdit(e.target.value)}
          rows={5}
          className="resize-y text-sm font-mono"
          placeholder="Final narrative (auto-generated from guided fields, or type directly)..."
        />
        <p className="text-xs text-slate-400 mt-1">
          This exact text is saved and sent to NERIS. Edit directly or use guided fields above.
        </p>
      </div>
    </div>
  );
}