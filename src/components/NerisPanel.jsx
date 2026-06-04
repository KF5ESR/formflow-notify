/**
 * NERIS Panel — Admin-only workflow component
 *
 * Pipeline (view):
 *   Base44 Incident Record → FA Export JSON → NERIS Translator → NERIS Validate → NERIS Submit
 *
 * This component keeps the three JSON layers separate and visible.
 * Actual API calls (validate/submit) require a backend function with NERIS credentials.
 */
import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { buildNerisPayload } from "@/utils/nerisPayload";
import { translateToNeris, validateNerisPayload, diffLayers, buildApiPayload } from "@/utils/nerisTranslator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getIncidentTypeOptions, getActionTacticOptions, GITHUB_REFS, clearCache, getCacheAge } from "@/utils/nerisValueSets";
import NerisValidationStatusCard from "@/components/NerisValidationStatusCard";
import {
  CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp,
  Download, RefreshCw, Eye, ArrowRight, Info, Copy, ClipboardCheck,
  Github, Database, Clock, Shield, Loader2
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

function ValueSetStatus() {
  const [status, setStatus] = useState({
    loading: false, incidentCount: null, actionCount: null, error: null, fetchedAt: null
  });

  const load = useCallback(async (bust = false) => {
    if (bust) clearCache();
    setStatus(s => ({ ...s, loading: true, error: null }));
    try {
      const [types, actions] = await Promise.all([getIncidentTypeOptions(), getActionTacticOptions()]);
      setStatus({ loading: false, incidentCount: types.length, actionCount: actions.length, error: null, fetchedAt: new Date() });
    } catch (e) {
      setStatus(s => ({ ...s, loading: false, error: e.message }));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const ageMs = getCacheAge('incident_types');
  const ageLabel = ageMs == null ? '—'
    : ageMs < 60000 ? `${Math.round(ageMs / 1000)}s ago`
    : `${Math.round(ageMs / 60000)}m ago`;

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 overflow-hidden">
      {/* Layer boundary notice */}
      <div className="flex items-start gap-2 px-3 py-2 bg-amber-950/60 border-b border-amber-800/40">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-300 leading-relaxed">
          <strong className="text-amber-200">Layer boundary:</strong>{" "}
          GitHub value sets are used for code lists and dropdown choices only.
          The final API body is built against the{" "}
          <strong className="text-amber-200">NERIS API contract</strong> and verified by{" "}
          <code className="bg-amber-900/50 text-amber-200 px-1 rounded">/validate</code>.
          The GitHub framework module field names (e.g. <code className="bg-amber-900/50 text-amber-200 px-1 rounded">incident_final_type</code>)
          do not override the validated API payload shape (e.g.{" "}
          <code className="bg-amber-900/50 text-amber-200 px-1 rounded">incident_types[&#123;type&#125;]</code>).
        </p>
      </div>

      {/* Status row */}
      <div className="flex items-center gap-3 flex-wrap px-3 py-2 text-xs text-slate-300">
        {/* GitHub source */}
        <div className="flex items-center gap-1.5">
          <Github className="w-3.5 h-3.5 text-slate-400" />
          <a href={GITHUB_REFS.repo} target="_blank" rel="noopener noreferrer"
             className="font-mono text-slate-400 hover:text-white transition-colors underline-offset-2 hover:underline">
            ulfsri/neris-framework
          </a>
          <span className="text-slate-600 text-xs">— value sets only</span>
        </div>

        <span className="text-slate-700">|</span>

        {/* Counts / loading / error */}
        {status.loading ? (
          <span className="flex items-center gap-1 text-slate-400">
            <RefreshCw className="w-3 h-3 animate-spin" /> Fetching…
          </span>
        ) : status.error ? (
          <span className="flex items-center gap-1 text-red-400">
            <XCircle className="w-3 h-3" /> {status.error}
          </span>
        ) : status.incidentCount !== null ? (
          <span className="flex items-center gap-1 text-green-400">
            <Database className="w-3 h-3" />
            {status.incidentCount} incident types · {status.actionCount} action/tactics
          </span>
        ) : null}

        {/* Cache age */}
        {!status.loading && ageMs != null && (
          <span className="flex items-center gap-1 text-slate-500">
            <Clock className="w-3 h-3" /> cached {ageLabel}
          </span>
        )}

        {/* Fetch timestamp */}
        {status.fetchedAt && (
          <span className="text-slate-600 text-xs">
            fetched {status.fetchedAt.toLocaleTimeString()}
          </span>
        )}

        <span className="text-slate-700">|</span>

        {/* API contract source */}
        <span className="flex items-center gap-1 text-blue-400">
          <CheckCircle className="w-3 h-3" />
          Payload contract: NERIS API <code className="bg-slate-800 px-1 rounded">/validate</code>
        </span>

        {/* Refresh button */}
        <button onClick={() => load(true)}
                className="ml-auto flex items-center gap-1 text-slate-500 hover:text-white transition-colors">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>
    </div>
  );
}

export default function NerisPanel({ form, incidentId, units, responders }) {
  const [validationResult, setValidationResult] = useState(null);
  const [backendValidationResult, setBackendValidationResult] = useState(null);
  const [showDiff, setShowDiff] = useState(false);
  const [copied, setCopied] = useState(false);
  const [validating, setValidating] = useState(false);
  const queryClient = useQueryClient();

  // Load NERIS config record (use first/only record per FD)
  const { data: configs = [] } = useQuery({
    queryKey: ["neris_config"],
    queryFn: () => base44.entities.NerisConfig.list(),
  });
  const config = configs[0] || {};
  const env = config.env || "TEST";

  // Layer 1: FA Export JSON
  const faJson = useMemo(() => buildNerisPayload(form, units, responders), [form, units, responders]);

  // Layer 2: Full NERIS payload (includes _dispatch_provenance for internal review)
  const nerisPayload = useMemo(() => translateToNeris(faJson, config), [faJson, config]);

  // Layer 2b: Clean API payload — _provenance stripped, safe to POST
  const apiPayload = useMemo(() => buildApiPayload(nerisPayload), [nerisPayload]);

  // Diff
  const diffs = useMemo(() => diffLayers(faJson, nerisPayload), [faJson, nerisPayload]);

  const handleValidate = () => {
    // Client-side schema checks only
    const result = validateNerisPayload(apiPayload);
    setValidationResult(result);
  };

  const handleBackendValidate = async () => {
    if (!incidentId) return;
    const proxyUrl = config.apps_script_validate_url;
    if (!proxyUrl) return;

    setValidating(true);
    setBackendValidationResult(null);

    const validated_at = new Date().toISOString();
    const cleanBody = apiPayload;

    const requestPayload = {
      action: "validate",
      entity_id: config.entity_id,
      environment: env,
      incident_id: form.nfirs_id || form.id,
      body: cleanBody,
    };

    let result;
    try {
      const proxyResp = await base44.functions.invoke("nerisValidateProxy", {
        proxyUrl,
        requestPayload,
      });
      const { http_status, response_body } = proxyResp.data;

      const httpOk = http_status >= 200 && http_status < 300;
      const asObj = (typeof response_body === "object" && response_body !== null) ? response_body : {};

      // NERIS /validate returns HTTP 200 for both valid AND invalid payloads.
      // A valid payload has an empty or absent "detail" array.
      // An invalid payload has a populated "detail" array with validation errors.
      // We must inspect the body — not just the HTTP status — to determine true validity.
      const nerisDetail = asObj.detail;
      const hasValidationErrors = Array.isArray(nerisDetail) && nerisDetail.length > 0;
      const success = httpOk && !hasValidationErrors && asObj.success !== false && !asObj.error;

      // Build a human-readable error summary from NERIS detail array
      let errorMessage = null;
      if (!success) {
        if (hasValidationErrors) {
          errorMessage = nerisDetail.map(d => {
            const loc = Array.isArray(d.loc) ? d.loc.join(" → ") : "";
            return loc ? `[${loc}] ${d.msg}` : d.msg;
          }).join(" | ");
        } else {
          errorMessage = asObj.error || asObj.message || `HTTP ${http_status}`;
        }
      }

      result = {
        success,
        http_status,
        validated_at,
        environment: env,
        endpoint_used: `Apps Script proxy → NERIS /incident/${config.entity_id}/validate`,
        response_body,
        error_message: errorMessage,
        request_body_snapshot: cleanBody,
        route: "apps_script_proxy",
        incident_id_source_used: asObj.incident_id_source_used || null,
        incident_number_used: asObj.incident_number_used || (cleanBody?.base?.incident_number) || null,
      };
    } catch (e) {
      result = {
        success: false,
        http_status: null,
        validated_at,
        environment: env,
        endpoint_used: proxyUrl,
        response_body: null,
        error_message: e.message,
        request_body_snapshot: cleanBody,
        route: "fetch_error",
        incident_id_source_used: null,
        incident_number_used: null,
      };
    }

    // Determine status
    const validation_status = result.success ? "VALID" : (result.http_status ? "INVALID" : "ERROR");
    result.status = validation_status;

    setBackendValidationResult(result);

    // 1. Update Incident record with latest validation state
    // 2. Append a NerisValidationLog entry for full audit trail
    try {
      const [me] = await Promise.allSettled([base44.auth.me()]);
      const userEmail = me.status === "fulfilled" ? me.value?.email : null;

      await Promise.all([
        base44.entities.Incident.update(incidentId, {
          neris_validation_status: validation_status,
          neris_validation_message: result.error_message || (result.success ? "Validation passed" : "Validation failed"),
          neris_last_validated_at: validated_at,
          neris_validation_environment: env,
          neris_validation_http_status: result.http_status,
          neris_validation_endpoint: result.endpoint_used,
          neris_validation_route: result.route,
          neris_incident_id_source_used: result.incident_id_source_used,
          neris_incident_number_used: result.incident_number_used,
          neris_validation_request_snapshot_json: JSON.stringify(result.request_body_snapshot),
          neris_validation_result_json: JSON.stringify(result),
        }),
        base44.entities.NerisValidationLog.create({
          incident_id: incidentId,
          nfirs_id: form.nfirs_id || null,
          validated_at,
          environment: env,
          route: result.route,
          endpoint_used: result.endpoint_used,
          http_status: result.http_status,
          success: result.success,
          incident_id_source_used: result.incident_id_source_used,
          incident_number_used: result.incident_number_used,
          request_body_snapshot: JSON.stringify(result.request_body_snapshot),
          response_body: JSON.stringify(result.response_body),
          error_message: result.error_message,
          validated_by_email: userEmail,
        }),
      ]);

      queryClient.invalidateQueries({ queryKey: ["incident", incidentId] });
    } catch (_) {}

    setValidating(false);
  };

  const handleExportFA = () => {
    download(faJson, `fa_export_${form.nfirs_id || "draft"}_${form.date || "nodate"}.json`);
  };

  const handleExportNeris = () => {
    // Export the clean API payload — this is what gets POSTed to NERIS
    download(apiPayload, `neris_payload_${form.nfirs_id || "draft"}_${form.date || "nodate"}.json`);
  };

  const handleCopyClean = () => {
    navigator.clipboard.writeText(JSON.stringify(apiPayload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          <Button type="button" variant="outline" size="sm" onClick={handleCopyClean} className={`text-xs ${copied ? 'text-green-600 border-green-400' : 'text-purple-600 border-purple-300'}`}>
            {copied ? <ClipboardCheck className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
            {copied ? 'Copied!' : 'Copy Clean NERIS API Body'}
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

      {/* GitHub value sets status */}
      <ValueSetStatus />

      {/* PSAP time source banner */}
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
        <div className="text-xs text-blue-700">
          <strong>Non-CAD dispatch mode:</strong> No PSAP/CAD connection.
          <span className="ml-1"><code className="bg-blue-100 px-1 rounded">DISPATCH_TIME</code> → <code className="bg-blue-100 px-1 rounded">call_arrival / call_answered / call_create</code> (user-entered fallback).</span>
          <span className="ml-1"><code className="bg-blue-100 px-1 rounded">FIRST_ON_SCENE_TIME</code> → <code className="bg-blue-100 px-1 rounded">unit_responses[].on_scene</code> only.</span>
          <span className="ml-2 text-blue-500 font-mono">time_source: USER_ENTERED_NON_CAD</span>
        </div>
      </div>

      {/* Incident type translation preview */}
      {units.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <div className="text-xs font-medium text-slate-500 mb-2">Unit Time Keys (FA → NERIS canonical) — legacy aliases stripped</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-xs">
            {[
              ["dispatch_time",          "unit_responses[].dispatch",          false],
              ["enroute_time",           "unit_responses[].enroute_to_scene",  false],
              ["on_scene_time",          "unit_responses[].on_scene",          false],
              ["clear_time",             "unit_responses[].unit_clear",        false],
              ["DISPATCH_TIME",          "dispatch.call_arrival / call_create", true],
              ["FIRST_ON_SCENE_TIME",    "unit_responses[].on_scene (fallback if blank)", true],
            ].map(([fa, neris, isIncident]) => (
              <div key={fa} className={`flex items-center gap-1 px-2 py-1 rounded ${isIncident ? 'bg-blue-50 border border-blue-100' : ''}`}>
                <code className={`px-1 rounded ${isIncident ? 'text-blue-700 bg-blue-100' : 'text-amber-600 bg-amber-50'}`}>{fa}</code>
                <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                <code className={`px-1 rounded ${isIncident ? 'text-blue-700 bg-blue-100' : 'text-green-600 bg-green-50'}`}>{neris}</code>
                {isIncident && <span className="text-blue-400 ml-1">(incident-level)</span>}
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
      <JsonBlock data={nerisPayload} label="NERIS Full Payload (with provenance)" badge="Layer 2 — internal review" defaultOpen={false} />
      <JsonBlock
        data={apiPayload}
        label="NERIS API Payload  —  sent to NERIS  (✓ provenance stripped)"
        badge="Layer 2b"
        defaultOpen={true}
      />

      {/* Validate buttons */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Client-side */}
          <Button type="button" onClick={handleValidate} variant="outline" className="text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Check (client-side)
          </Button>

          {/* Apps Script proxy → NERIS /validate */}
          {config.apps_script_validate_url ? (
            <Button
              type="button"
              onClick={handleBackendValidate}
              disabled={validating || !incidentId}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
            >
              {validating
                ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Validating…</>
                : <><Shield className="w-3.5 h-3.5 mr-1.5" /> Validate Clean NERIS API Body</>}
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              Validation proxy not configured — add Apps Script validate URL in NerisConfig.
            </div>
          )}

          {/* Live result badge (just ran) */}
          {backendValidationResult && (
            <span className={`text-xs px-2 py-1 rounded font-semibold ${
              backendValidationResult.success ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}>
              {backendValidationResult.success ? "✓ VALID" : "✗ " + (backendValidationResult.status || "FAILED")}
            </span>
          )}
        </div>

        {/* Validation route note */}
        <div className="flex items-start gap-2 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          <Info className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
          <div className="text-slate-500 space-y-1">
            <div>
              <strong className="text-slate-600">Validation Route:</strong>{" "}
              Base44 → Apps Script WebApp → NERIS{" "}
              <code className="bg-slate-100 px-1 rounded">POST /incident/{"{entity_id}"}/validate</code>
            </div>
            <div>
              The <code className="bg-slate-100 px-1 rounded">handleBase44Validate_</code> bridge must
              call the <strong>same internal helper</strong> that{" "}
              <code className="bg-slate-100 px-1 rounded">nerisValidateIncidentById_</code> uses — so all
              existing Config sheet / Script Properties auth logic is reused automatically.
              Do <strong>not</strong> hand-roll a separate <code className="bg-slate-100 px-1 rounded">UrlFetchApp.fetch()</code> or token lookup.
            </div>
            <div className="text-green-700 font-medium">
              ✓ Config sheet is assumed good — the Google Forms path already validates/posts successfully.
              The only change needed is plugging Base44&apos;s externally-supplied body into that same proven path.
            </div>
            <div>
              No NERIS token is ever held or exposed by Base44.
            </div>
          </div>
        </div>

        {/* Apps Script doPost handler template */}
        <details className="border border-slate-200 rounded-lg overflow-hidden text-xs">
          <summary className="px-3 py-2 bg-slate-50 cursor-pointer font-medium text-slate-700 hover:bg-slate-100">
            Apps Script <code>doPost</code> handler template — add this branch to your WebApp
          </summary>
          <pre className="bg-slate-900 text-green-300 p-4 overflow-auto max-h-80 whitespace-pre text-xs font-mono">{`// ─── IMPORTANT: DO NOT REPLACE your existing doPost(e) ──────────────────────
          // Only INSERT the Base44 branch near the top of your existing doPost(e).
          // If your doPost ends with "return unsupported POST", your Forms workflow WILL BREAK.
          // The Base44 branch must fall through to your existing logic if action !== 'validate'.
          // ─────────────────────────────────────────────────────────────────────────────
          //
          // ─── handleBase44Validate_ ────────────────────────────────────────────────────
          // Uses the SAME token pattern as the working FA NERIS calls:
          //   cfg        = getNerisConfig()          (no underscore — matches your script)
          //   tokenInfo  = getNerisToken_(cfg)
          //   token      = tokenInfo && tokenInfo.token
          //   headers include Accept: 'application/json'
          //
          // The 401 response body is returned so you can see the exact NERIS error message.
          // ─────────────────────────────────────────────────────────────────────────────

          function doPost(e) {
          // --- Base44 validate branch ---
          try {
          var raw = e && e.postData && e.postData.contents;
          if (raw) {
          var data = JSON.parse(raw);
          if (data && data.action === 'validate') {
          return handleBase44Validate_(data);
          }
          }
          } catch(_) { /* not a Base44 JSON post — fall through */ }
          // --- end Base44 branch ---

          // ... your existing doPost logic continues unchanged ...
          }

          function handleBase44Validate_(data) {
          var validated_at = new Date().toISOString();

          try {
          var cfg = getNerisConfig();   // matches your FA NERIS tools (no underscore)

          var entityId = String((data.entity_id || cfg.NERIS_ENTITY_ID || '')).trim();
          var base     = String(cfg.NERIS_BASE_URL || '').replace(/\\/+$/, '');

          if (!entityId) return jsonResponse_({ success: false, http_status: null, validated_at: validated_at, error: 'Missing entity_id / NERIS_ENTITY_ID' });
          if (!base)     return jsonResponse_({ success: false, http_status: null, validated_at: validated_at, error: 'Missing NERIS_BASE_URL' });

          var body = data.body || {};
          if (typeof body !== 'object') body = {};

          // Shape exactly as the Forms path does
          if (typeof shapePayloadForRemoteValidate_ === 'function') {
          shapePayloadForRemoteValidate_(body);
          }

          var endpoint  = base + '/incident/' + encodeURIComponent(entityId) + '/validate';

          // ── Diagnostic: return non-secret cfg values so we can verify URLs are correct ──
          // NERIS_BASE_URL  must be https://api-test.neris.fsri.org/v1  (not a Drive/Docs URL)
          // NERIS_TOKEN_URL must be the real NERIS token endpoint        (not a Drive/Docs URL)
          var diagCfg = {
            NERIS_BASE_URL:  String(cfg.NERIS_BASE_URL  || '(not set)'),
            NERIS_TOKEN_URL: String(cfg.NERIS_TOKEN_URL || '(not set)'),
            NERIS_ENV:       String(cfg.NERIS_ENV       || '(not set)'),
            entity_id:       entityId,
            endpoint_used:   endpoint,
          };

          var tokenInfo = getNerisToken_(cfg);
          var token     = tokenInfo && tokenInfo.token;
          token = String(token || '').trim();
          diagCfg.token_present = token.length > 0;

          if (!token) return jsonResponse_({ success: false, http_status: null, validated_at: validated_at, cfg_diagnostic: diagCfg, error: 'NERIS token unavailable — check getNerisToken_() return value' });

          var res = UrlFetchApp.fetch(endpoint, {
            method: 'post',
            muteHttpExceptions: true,
            headers: {
              'Authorization': 'Bearer ' + token,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            payload: JSON.stringify(body),
          });

          var code = res.getResponseCode();
          var txt  = res.getContentText();
          // Cap at 500 chars so HTML error pages don't flood the result
          var txtPreview = txt ? txt.substring(0, 500) : '';
          var responseBody;
          try { responseBody = txt ? JSON.parse(txt) : ''; } catch(_) { responseBody = txtPreview; }

          var success = code >= 200 && code < 300;
          return jsonResponse_({
            success:               success,
            http_status:           code,
            validated_at:          validated_at,
            endpoint_used:         endpoint,
            cfg_diagnostic:        diagCfg,
            response_body:         responseBody,
            request_body_snapshot: body,
            environment_requested: data.environment || null,
            environment_used:      cfg.NERIS_ENV   || null,
            error: success ? null : (typeof responseBody === 'object' && (responseBody.detail || responseBody.message)) || ('HTTP ' + code),
          });

          } catch(err) {
          return jsonResponse_({
          success:               false,
          http_status:           null,
          validated_at:          validated_at,
          error:                 'Apps Script exception: ' + String(err),
          request_body_snapshot: (data && data.body) ? data.body : null,
          });
          }
          }`}</pre>
        </details>

        {/* Client-side result */}
        <ValidationResult result={validationResult} />

        {/* Live backend result (just ran) */}
        {backendValidationResult && (
          <NerisValidationStatusCard statusData={backendValidationResult} />
        )}

        {/* Persisted status card (loaded from record, shown only if no live result) */}
        {!backendValidationResult && form.neris_validation_status && form.neris_validation_status !== "NOT_VALIDATED" && (
          <NerisValidationStatusCard statusData={{
            status: form.neris_validation_status,
            validated_at: form.neris_last_validated_at,
            environment: form.neris_validation_environment,
            incident_id_source_used: form.neris_incident_id_source_used,
            incident_number_used: form.neris_incident_number_used,
            endpoint_used: form.neris_validation_endpoint,
            http_status: form.neris_validation_http_status,
            error_message: form.neris_validation_message,
            response_body: (() => { try { return JSON.parse(form.neris_validation_result_json || "null")?.response_body; } catch { return null; } })(),
          }} />
        )}
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