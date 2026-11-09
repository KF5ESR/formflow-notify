import { formatPilotDate, formatStamp } from "@/lib/pilot/preRmsPilotStore";

function Row({ label, value }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">{label}</dt>
      <dd className="text-sm text-slate-800 font-medium break-words">{value || "—"}</dd>
    </div>
  );
}

export default function CadReadOnlyCard({ cad, title, subtitle }) {
  if (!cad) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        <span className="shrink-0 text-[10px] uppercase tracking-wide font-semibold text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">
          Read-only CAD
        </span>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
        <Row label="CAD agency" value={cad.agencyName} />
        <Row label="CFS number" value={cad.cfsNumber} />
        <Row label="Department run number" value={cad.departmentRunNumber} />
        <Row label="Incident date" value={formatPilotDate(cad.incidentDate)} />
        <Row label="Dispatched address" value={cad.dispatchedAddress} />
        <Row label="Dispatch reason" value={cad.dispatchReason} />
        <Row label="CAD call status" value={cad.callStatus} />
        <Row
          label="CAD revision"
          value={`Revision ${cad.revision} · received ${formatStamp(cad.receivedAt)}`}
        />
      </dl>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-xs">
          <caption className="sr-only">CAD unit dispatch, arrival and clear times</caption>
          <thead>
            <tr className="bg-slate-50 text-slate-500">
              <th scope="col" className="text-left font-semibold px-2 py-1.5 rounded-l">Unit</th>
              <th scope="col" className="text-left font-semibold px-2 py-1.5">Dispatched</th>
              <th scope="col" className="text-left font-semibold px-2 py-1.5">Arrived</th>
              <th scope="col" className="text-left font-semibold px-2 py-1.5 rounded-r">Cleared</th>
            </tr>
          </thead>
          <tbody>
            {(cad.units || []).map((u) => (
              <tr key={u.unit} className="border-t border-slate-100 text-slate-800">
                <td className="px-2 py-1.5 font-medium">{u.unit}</td>
                <td className="px-2 py-1.5 tabular-nums">{u.dispatched || "—"}</td>
                <td className="px-2 py-1.5 tabular-nums">{u.arrived || "—"}</td>
                <td className="px-2 py-1.5 tabular-nums">{u.cleared || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {cad.revisionNote && (
        <p className="mt-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1">
          {cad.revisionNote}
        </p>
      )}
    </div>
  );
}