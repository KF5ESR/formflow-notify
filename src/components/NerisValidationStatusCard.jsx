/**
 * NerisValidationStatusCard — compact status card shown in the NERIS panel.
 * Displays the latest validation result, either live (just ran) or persisted (loaded from record).
 */
import { CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

const STATUS_CONFIG = {
  VALID:   { icon: CheckCircle,    color: "text-green-700", bg: "bg-green-50",  border: "border-green-300",  label: "VALIDATED" },
  INVALID: { icon: XCircle,        color: "text-red-700",   bg: "bg-red-50",    border: "border-red-300",    label: "INVALID"   },
  ERROR:   { icon: AlertTriangle,  color: "text-amber-700", bg: "bg-amber-50",  border: "border-amber-300",  label: "ERROR"     },
};

export default function NerisValidationStatusCard({ statusData }) {
  const [showBody, setShowBody] = useState(false);
  if (!statusData) return null;

  const {
    status, validated_at, environment, incident_id_source_used, incident_number_used,
    endpoint_used, http_status, error_message, response_body,
  } = statusData;

  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.ERROR;
  const Icon = cfg.icon;
  const showDetails = status === "INVALID" || status === "ERROR";

  return (
    <div className={`rounded-lg border ${cfg.border} ${cfg.bg} overflow-hidden`}>
      {/* Status header */}
      <div className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm ${cfg.color}`}>
        <Icon className="w-4 h-4 shrink-0" />
        {cfg.label}{environment ? ` IN ${environment}` : ""}
      </div>

      {/* Details grid */}
      <div className="px-4 pb-3 pt-2 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600 border-t border-white/60">
        {validated_at && (
          <div><span className="font-medium">Validated at:</span> {new Date(validated_at).toLocaleString()}</div>
        )}
        {http_status != null && (
          <div><span className="font-medium">HTTP:</span> {http_status}</div>
        )}
        {incident_id_source_used && (
          <div><span className="font-medium">Incident number source:</span> {incident_id_source_used}</div>
        )}
        {incident_number_used && (
          <div>
            <span className="font-medium">Incident number used:</span>{" "}
            <code className="bg-white/80 px-1 rounded font-mono">{incident_number_used}</code>
          </div>
        )}
        {endpoint_used && (
          <div className="md:col-span-2 truncate">
            <span className="font-medium">Endpoint:</span> {endpoint_used}
          </div>
        )}
      </div>

      {/* Error message */}
      {showDetails && error_message && (
        <div className={`px-4 py-2 text-xs border-t ${
          status === "INVALID"
            ? "border-red-200 bg-red-100/40 text-red-700"
            : "border-amber-200 bg-amber-100/40 text-amber-700"
        }`}>
          <span className="font-medium">Error:</span> {error_message}
        </div>
      )}

      {/* Response body toggle */}
      {showDetails && response_body && (
        <div className="border-t border-slate-200">
          <button
            type="button"
            onClick={() => setShowBody(!showBody)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs text-slate-500 hover:bg-white/40 transition-colors"
          >
            <span className="font-medium">Response body</span>
            {showBody ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showBody && (
            <pre className="text-xs font-mono bg-slate-900 text-green-300 p-3 overflow-auto max-h-48 whitespace-pre-wrap">
              {typeof response_body === "string" ? response_body : JSON.stringify(response_body, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}