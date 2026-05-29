import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileText, Eye } from "lucide-react";
import { useState } from "react";

const PROMPTS = [
  { key: "narrative_reported", label: "What was reported?", placeholder: "Describe the initial call — what was dispatch told, what type of incident was reported..." },
  { key: "narrative_found", label: "What was found on arrival?", placeholder: "Describe conditions on arrival — location, visible signs of fire/patient status, hazards..." },
  { key: "narrative_condition", label: "Patient / scene condition", placeholder: "Patient vitals, level of consciousness, extent of fire/damage, hazmat conditions..." },
  { key: "narrative_actions", label: "Actions taken", placeholder: "What did responders do? Equipment used, treatments given, water supply established..." },
  { key: "narrative_disposition", label: "Disposition / Who took over", placeholder: "How was the incident resolved? Transported to hospital, turned over to law enforcement, structure secured..." },
];

function buildNarrative(fields) {
  const parts = [];
  if (fields.narrative_reported) parts.push(`Dispatched: ${fields.narrative_reported.trim()}`);
  if (fields.narrative_found) parts.push(`Upon arrival: ${fields.narrative_found.trim()}`);
  if (fields.narrative_condition) parts.push(`Condition: ${fields.narrative_condition.trim()}`);
  if (fields.narrative_actions) parts.push(`Actions taken: ${fields.narrative_actions.trim()}`);
  if (fields.narrative_disposition) parts.push(`Disposition: ${fields.narrative_disposition.trim()}`);
  return parts.join(" ");
}

export default function NarrativeGuided({ fields, onChange }) {
  const [showPreview, setShowPreview] = useState(false);
  const preview = buildNarrative(fields);

  return (
    <div className="space-y-4 md:col-span-2">
      {PROMPTS.map(({ key, label, placeholder }) => (
        <div key={key}>
          <Label className="text-sm font-medium text-slate-700 mb-1.5 block">{label}</Label>
          <Textarea
            value={fields[key] || ""}
            onChange={(e) => onChange(key, e.target.value)}
            placeholder={placeholder}
            rows={2}
            className="resize-y text-sm"
          />
        </div>
      ))}

      {/* Preview */}
      <div className="border border-blue-200 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="w-full flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 transition-colors text-left"
        >
          <Eye className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-700">Generated Narrative Preview</span>
          {preview && <span className="ml-auto text-xs text-blue-400">{preview.length} chars</span>}
        </button>
        {showPreview && (
          <div className="p-4 bg-white">
            {preview ? (
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{preview}</p>
            ) : (
              <p className="text-sm text-slate-400 italic">Fill in the fields above to generate a narrative preview.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export { buildNarrative };