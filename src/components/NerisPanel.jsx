/**
 * NERIS Panel — Admin-only workflow component
 *
 * Pipeline (view):
 *   Base44 Incident Record → FA Export JSON → NERIS Translator → NERIS Validate → NERIS Submit
 *
 * This component keeps the three JSON layers separate and visible.
 * Actual API calls (validate/submit) require a backend function with NERIS credentials.
 */
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { buildNerisPayload } from "@/utils/nerisPayload";
import { translateToNeris, validateNerisPayload, diffLayers } from "@/utils/nerisTranslator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp,
  Download, RefreshCw, Eye, ArrowRight, Info
} from "lucide-react";

const ENV_COLORS = { TEST: "bg-amber-100 text-amber-700", PROD: "bg-red-100 text-red-700" };

function JsonBlock({ data, label, badge, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const str = useMemo(() => JSON.stringify(data, null, 2), [data]);
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">{label}</span>
          {badge && <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-mono">{badge}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{str.length} chars</span>
          {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>
      {open && (
        <pre className="text-xs font-mono bg-slate-900 text-green-300 p-4 overflow-auto max-h-80 whitespace-pre-wrap">
          {str}
        </pre>
      )}
    </div>
  );
}

function ValidationResult({ result }) {
  if (!result) return null;
  const { valid, errors, warnings } = result;
  return (
    <div className={`border rounded-lg p-4 ${valid ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
      <div className="flex items-center gap-2 mb-2">
        {valid ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-500" />}
        <span className={`text-sm font-semibold ${valid ? "text-green-700" : "text-red-700"}`}>
          {valid ? "Payload valid (client-side checks)" : `${errors.length} error${errors.length !== 1 ? "s" : ""} found`}
        </span>
        {warnings.length > 0 && (
          <span className="text-xs text-amber-600 ml-auto">{warnings.length} warning{warnings.length !== 1 ? "s" : ""}</span>
        )}
      </div>
      {errors.length > 0 && (
        <ul className="space-y-1 mb-2">
          {errors.map((e, i) => (
            <li key={i} className="text-xs text-red-700 flex items-start gap-1.5">
              <XCircle className="w-3 h-3 mt-0.5 shrink-0" />{e}
            </li>
          ))}
        </ul>
      )}
      {warnings.length > 0 && (
        <ul className="space-y-1">
          {warnings.map((w, i) => (
            <li key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />{w}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DiffView({ changes }) {
  if (!changes || changes.length === 0) return (
    <div className="text-xs text-slate-400 italic">No translation differences — layers are aligned.</div>
  );
  return (
    <div className="space-y-2">
      {changes.map((c, i) => (
        <div key={i} className="flex items-center gap-2 text-xs bg-slate-50 rounded p-2 border border-slate-200">
          <span className="font-medium text-slate-500 shrink-0">{c.field}:</span>
          <code className="text-amber-700 bg-amber-50 px-1 rounded">{c.fa}</code>
          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
          <code className="text-green-700 bg-green-50 px-1 rounded">{c.neris}</code>
        </div>
      ))}
    </div>
  );
}

export default function NerisPanel({ form, units, responders }) {
  const [validationResult, setValidationResult] = useState(null);
  const [showDiff, setShowDiff] = useState(false);

  // Load NERIS config record (use first/only record per FD)
  const { data: configs = [] } = useQuery({
    queryKey: ["neris_config"],
    queryFn: () => base44.entities.NerisConfig.list(),
  });
  const config = configs[0] || {};
  const env = config.env || "TEST";

  // Layer 1: FA Export JSON
  const faJson = useMemo(() => buildNerisPayload(form, units, responders), [form, units, responders]);

  // Layer 2: NERIS API Payload
  const nerisPayload = useMemo(() => translateToNeris(faJson, config), [faJson, config]);

  // Diff
  const diffs = useMemo(() => diffLayers(faJson, nerisPayload), [faJson, nerisPayload]);

  const handleValidate = () => {
    const result = validateNerisPayload(nerisPayload);
    setValidationResult(result);
  };

  const handleExportFA = () => {
    download(faJson, `fa_export_${form.nfirs_id || "draft"}_${form.date || "nodate"}.json`);
  };

  const handleExportNeris = () => {
    download(nerisPayload, `neris_payload_${form.nfirs_id || "draft"}_${form.date || "nodate"}.json`);
  };

  function download(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">

      {/* Header / Env */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">NERIS Integration</span>
          <span className={`text-xs px-2 py-0.5 rounded font-bold ${ENV_COLORS[env] || ENV_COLORS.TEST}`}>
            {env}
          </span>
          {config.entity_id && (
            <span className="text-xs text-slate-400 font-mono">Entity: {config.entity_id}</span>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button type="button" variant="outline" size="sm" onClick={() => setShowDiff(!showDiff)} className="text-xs">
            <Eye className="w-3 h-3 mr-1" /> {showDiff ? "Hide" : "Show"} Translation Diff
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleExportFA} className="text-xs">
            <Download className="w-3 h-3 mr-1" /> FA JSON
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleExportNeris} className="text-xs text-blue-600 border-blue-300">
            <Download className="w-3 h-3 mr-1" /> NERIS Payload
          </Button>
        </div>
      </div>

      {/* Pipeline diagram */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
        <span className="bg-slate-100 px-2 py-1 rounded">Base44 Record</span>
        <ArrowRight className="w-3 h-3" />
        <span className="bg-amber-50 border border-amber-200 text-amber-700 px-2 py-1 rounded font-medium">FA Export JSON</span>
        <ArrowRight className="w-3 h-3" />
        <span className="bg-blue-50 border border-blue-200 text-blue-700 px-2 py-1 rounded font-medium">NERIS Translator</span>
        <ArrowRight className="w-3 h-3" />
        <span className="bg-green-50 border border-green-200 text-green-700 px-2 py-1 rounded font-medium">NERIS Payload</span>
        <ArrowRight className="w-3 h-3" />
        <span className="bg-slate-100 px-2 py-1 rounded">Validate → Submit</span>
      </div>

      {/* Incident type translation preview */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
        <div className="text-xs font-medium text-slate-500 mb-2">Incident Type Translation</div>
        <div className="flex items-start gap-2 flex-wrap">
          <div>
            <div className="text-xs text-slate-400">Human label (FA)</div>
            <code className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded">
              {form.type_response || "(not set)"}
            </code>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 mt-4" />
          <div>
            <div className="text-xs text-slate-400">NERIS code hierarchy</div>
            <code className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded font-mono">
              {nerisPayload.call_type || <span className="text-red-500 italic">⚠ unresolved</span>}
            </code>
          </div>
          {nerisPayload.incident_types?.[0]?.code && (
            <>
              <ArrowRight className="w-4 h-4 text-slate-400 mt-4" />
              <div>
                <div className="text-xs text-slate-400">Leaf code</div>
                <code className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                  {nerisPayload.incident_types[0].code}
                </code>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Unit time key translation */}
      {units.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <div className="text-xs font-medium text-slate-500 mb-2">Unit Time Keys (FA → NERIS canonical)</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {[
              ["dispatch_time", "dispatch"],
              ["enroute_time", "enroute_to_scene"],
              ["on_scene_time", "on_scene"],
              ["clear_time", "unit_clear"],
            ].map(([fa, neris]) => (
              <div key={fa} className="flex items-center gap-1">
                <code className="text-amber-600 bg-amber-50 px-1 rounded">{fa}</code>
                <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                <code className="text-green-600 bg-green-50 px-1 rounded">{neris}</code>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Translation Diff */}
      {showDiff && (
        <div className="border border-slate-200 rounded-lg p-3">
          <div className="text-xs font-medium text-slate-500 mb-2">Translation Diff</div>
          <DiffView changes={diffs} />
        </div>
      )}

      {/* JSON Layers */}
      <JsonBlock data={faJson} label="FAST ATTACK Export JSON" badge="Layer 1 — FA" />
      <JsonBlock data={nerisPayload} label="NERIS API Payload" badge="Layer 2 — NERIS" defaultOpen={true} />

      {/* Client-side Validate */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button type="button" onClick={handleValidate} className="bg-blue-600 hover:bg-blue-700 text-white">
            <RefreshCw className="w-4 h-4 mr-2" /> Validate Payload (client-side)
          </Button>
        </div>
        <ValidationResult result={validationResult} />
      </div>

      {/* API submit — requires backend function */}
      <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-slate-700">Live Validate / Submit to NERIS</p>
            <p className="text-xs text-slate-500 mt-1">
              Actual NERIS API calls (POST /validate and POST /incident) require a backend function
              to handle OAuth tokens and CORS. Export the NERIS Payload JSON above and pass it
              to the Apps Script engine (<code className="bg-slate-100 px-1 rounded">nerisUpsertIncidentByIdPatchFirst</code>),
              or set up a backend function with your NERIS credentials.
            </p>
            {config.base_url && (
              <p className="text-xs text-blue-600 mt-1">
                Configured endpoint: <code className="font-mono">{config.base_url}</code> ({env})
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Post Status */}
      {(form.neris_post_status || form.neris_logged || form.neris_incident_composite) && (
        <div className="border border-green-200 bg-green-50 rounded-lg p-3 space-y-1">
          <p className="text-xs font-semibold text-green-700">Post Status</p>
          {form.neris_post_status && <p className="text-xs text-green-700">Status: <strong>{form.neris_post_status}</strong></p>}
          {form.neris_incident_composite && <p className="text-xs text-green-700 font-mono">Composite ID: {form.neris_incident_composite}</p>}
          {form.neris_logged && <p className="text-xs text-green-700">✓ Marked as logged in NERIS</p>}
        </div>
      )}
    </div>
  );
}