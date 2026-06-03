/**
 * NerisValidationResult — displays the result of a backend /validate call
 */
import { CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

export default function NerisValidationResult({ result }) {
  const [showBody, setShowBody] = useState(false);
  const [showSnapshot, setShowSnapshot] = useState(false);

  if (!result) return null;

  const { success, http_status, validated_at, environment, endpoint_used,
          response_body, error_message, request_body_snapshot, route } = result;

  return (
    <div className={`border rounded-lg overflow-hidden ${success
      ? "border-green-200 bg-green-50"
      : "border-red-200 bg-red-50"}`}>

      {/* Header */}
      <div className="flex items-start gap-2 px-4 py-3">
        {success
          ? <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
          : <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${success ? "text-green-700" : "text-red-700"}`}>
            {success ? "Validation passed" : "Validation failed"}
          </p>
          {error_message && (
            <p className="text-xs text-red-600 mt-0.5">{error_message}</p>
          )}
        </div>
        {http_status && (
          <span className={`text-xs font-mono px-2 py-0.5 rounded shrink-0 ${
            success ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            HTTP {http_status}
          </span>
        )}
      </div>

      {/* Meta */}
      <div className="px-4 pb-3 space-y-1 text-xs text-slate-500 border-t border-slate-100 pt-2">
        {environment && <div><span className="font-medium">Environment:</span> {environment}</div>}
        {endpoint_used && <div className="truncate"><span className="font-medium">Endpoint:</span> <code className="bg-slate-100 px-1 rounded">{endpoint_used}</code></div>}
        {route && <div><span className="font-medium">Route:</span> {route === "apps_script" ? "Base44 → Apps Script → NERIS" : route === "direct" ? "Base44 → NERIS direct" : route}</div>}
        {validated_at && <div><span className="font-medium">Validated at:</span> {new Date(validated_at).toLocaleString()}</div>}
      </div>

      {/* Response body toggle */}
      {response_body && (
        <div className="border-t border-slate-200">
          <button
            type="button"
            onClick={() => setShowBody(!showBody)}
            className="w-full flex items-center justify-between px-4 py-2 bg-white/50 hover:bg-white/80 text-xs text-slate-600 transition-colors">
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

      {/* Request snapshot toggle */}
      {request_body_snapshot && (
        <div className="border-t border-slate-200">
          <button
            type="button"
            onClick={() => setShowSnapshot(!showSnapshot)}
            className="w-full flex items-center justify-between px-4 py-2 bg-white/50 hover:bg-white/80 text-xs text-slate-600 transition-colors">
            <span className="font-medium">Request body snapshot (exact payload sent)</span>
            {showSnapshot ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showSnapshot && (
            <pre className="text-xs font-mono bg-slate-900 text-amber-300 p-3 overflow-auto max-h-48 whitespace-pre-wrap">
              {JSON.stringify(request_body_snapshot, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}