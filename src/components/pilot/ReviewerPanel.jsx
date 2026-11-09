import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ClipboardCopy, Gavel, Inbox, ShieldAlert } from "lucide-react";
import CadReadOnlyCard from "./CadReadOnlyCard";
import PilotStatusBadge from "./PilotStatusBadge";
import { formatPilotDate, formatStamp } from "@/lib/pilot/preRmsPilotStore";

function SubmittedRow({ item, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item.key)}
      aria-current={selected ? "true" : undefined}
      className={`w-full text-left px-4 py-3 transition-colors ${
        selected ? "bg-amber-50" : "bg-white hover:bg-slate-50"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
          CFS {item.cfsNumber}
        </span>
        <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
          Run {item.departmentRunNumber}
        </span>
        <PilotStatusBadge status={item.status} />
      </div>
      <div className="mt-1 text-xs text-slate-500">
        {formatPilotDate(item.incidentDate)} · submitted {formatStamp(item.responder.submittedAt)} ·
        CAD revision {item.latestCad.revision}
      </div>
      <div className="mt-0.5 text-sm font-medium text-slate-800 truncate">
        {item.responder.actualAddress || item.latestCad.dispatchedAddress}
      </div>
    </button>
  );
}

export default function ReviewerPanel({ items, selectedKey, onSelect, onApprove }) {
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  const handoffRef = useRef(null);

  const submitted = items
    .filter((i) => i.responder?.submittedAt)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  const pendingCount = submitted.filter((i) => i.status === "awaiting_review").length;
  const selected = submitted.find((i) => i.key === selectedKey) || null;

  const copyHandoff = () => {
    const text = selected?.approval?.handoffText || "";
    const flash = () => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    };
    const fallback = () => {
      const el = handoffRef.current;
      if (el) {
        el.focus();
        el.select();
        try {
          document.execCommand("copy");
        } catch (_) {
          /* manual copy still available */
        }
      }
      flash();
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(flash).catch(fallback);
    } else {
      fallback();
    }
  };

  const approve = () => {
    onApprove(selected.key);
    setConfirming(false);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-800">Awaiting Review queue</h3>
              <span className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                Demo role
              </span>
            </div>
            <p className="text-xs text-slate-500">
              One row per submitted call. Simulated reviewer handoff inside this browser only.
            </p>
          </div>
          <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
            {pendingCount} awaiting
          </span>
        </div>

        {submitted.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <Inbox className="w-9 h-9 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-600">Nothing submitted yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Submit the crew entry from the Responder view to fill this queue.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {submitted.map((item) => (
              <li key={item.key}>
                <SubmittedRow
                  item={item}
                  selected={item.key === selectedKey}
                  onSelect={onSelect}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected && (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <CadReadOnlyCard
              cad={selected.initialCad}
              title="Original CAD"
              subtitle={`Initial snapshot · revision ${selected.initialCad.revision}`}
            />
            <CadReadOnlyCard
              cad={selected.latestCad}
              title="Latest CAD"
              subtitle={
                selected.latestCad.revision > selected.initialCad.revision
                  ? `Revision ${selected.latestCad.revision} · newer data received`
                  : "No newer revision received"
              }
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h4 className="text-sm font-semibold text-slate-800">Responder information</h4>
              <span className="text-[10px] uppercase tracking-wide font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
                Source: simulated crew entry · this browser
              </span>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Crew staffing</dt>
                <dd className="text-sm text-slate-800 font-medium">
                  {selected.responder.staffing === "" || selected.responder.staffing == null
                    ? "Not entered"
                    : selected.responder.staffing}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Submitted</dt>
                <dd className="text-sm text-slate-800 font-medium">
                  {formatStamp(selected.responder.submittedAt)}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Crew narrative</dt>
                <dd className="text-sm text-slate-800 whitespace-pre-wrap">
                  {selected.responder.narrative || "No narrative entered."}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h4 className="text-sm font-semibold text-slate-800 mb-3">Location comparison</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
                  Dispatched location (CAD)
                </div>
                <p className="text-sm text-slate-800 font-medium mt-0.5">
                  {selected.latestCad.dispatchedAddress}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Source: latest CAD revision {selected.latestCad.revision}
                </p>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wide text-blue-500 font-semibold">
                  Crew-reported actual location
                </div>
                <p className="text-sm text-slate-800 font-medium mt-0.5">
                  {selected.responder.actualAddress || selected.latestCad.dispatchedAddress}
                </p>
                <p className="text-[11px] text-blue-700/80 mt-1">
                  {selected.responder.actualAddress
                    ? "Source: crew entry"
                    : "Blank crew entry - crew used the dispatched address"}
                </p>
              </div>
            </div>
          </div>

          {selected.status === "approved" && selected.approval?.handoffText ? (
            <div className="rounded-xl border-2 border-green-300 bg-green-50 p-4">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-green-900">
                    Approved in the simulated Reviewer view
                  </h4>
                  <p className="text-xs text-green-800 mt-0.5">
                    Approved {formatStamp(selected.approval.approvedAt)}. Approval is stored in this
                    browser only and does not create or change a live RMS incident.
                  </p>
                </div>
              </div>

              <div className="mt-3">
                <label
                  htmlFor="pilot-handoff-text"
                  className="block text-[11px] font-semibold uppercase tracking-wide text-green-900 mb-1"
                >
                  Manual handoff to existing RMS incident
                </label>
                <textarea
                  id="pilot-handoff-text"
                  ref={handoffRef}
                  readOnly
                  rows={14}
                  value={selected.approval.handoffText}
                  className="w-full rounded-lg border border-green-300 bg-white px-3 py-2 font-mono text-[11px] leading-relaxed text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button type="button" onClick={copyHandoff} className="bg-green-700 hover:bg-green-800 text-white">
                    <ClipboardCopy className="w-4 h-4 mr-2" /> {copied ? "Copied" : "Copy handoff text"}
                  </Button>
                  <span className="text-[11px] text-green-800">
                    Plain text, ready to paste into the existing RMS.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-amber-900">Approval pending</h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Approving is available only in this simulated Reviewer view and only for a
                    submitted report. It does not enforce production authorization.
                  </p>
                </div>
              </div>

              {confirming ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2">
                  <span className="text-xs text-slate-700 flex-1">
                    Approve this handoff and generate the RMS text?
                  </span>
                  <Button type="button" size="sm" onClick={approve} className="bg-green-700 hover:bg-green-800 text-white">
                    Approve handoff
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setConfirming(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  onClick={() => setConfirming(true)}
                  disabled={selected.status !== "awaiting_review"}
                  className="mt-3 bg-green-700 hover:bg-green-800 text-white"
                >
                  <Gavel className="w-4 h-4 mr-2" /> Approve Handoff
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}