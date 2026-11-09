import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CloudDownload, RefreshCw, Send, ClipboardList } from "lucide-react";
import CadReadOnlyCard from "./CadReadOnlyCard";
import PilotStatusBadge from "./PilotStatusBadge";
import { formatStamp } from "@/lib/pilot/preRmsPilotStore";

export default function ResponderPanel({ item, onLoadSample, onLoadUpdate, onSubmitReport, onOpenReviewer }) {
  const [actualAddress, setActualAddress] = useState("");
  const [staffing, setStaffing] = useState("");
  const [narrative, setNarrative] = useState("");

  // Seed the crew fields once per call; a CAD revision never overwrites them.
  useEffect(() => {
    if (!item) {
      setActualAddress("");
      setStaffing("");
      setNarrative("");
      return;
    }
    setActualAddress(item.responder?.actualAddress || "");
    setStaffing(item.responder?.staffing ?? "");
    setNarrative(item.responder?.narrative || "");
  }, [item?.key]);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmitReport({ actualAddress, staffing, narrative });
  };

  const hasCad = !!item;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-slate-800">Responder view</h3>
          <span className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
            Demo role
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Simulated crew entry. Load the fictional CAD call, record what the crew actually found,
          then submit for review. No email or external system is contacted.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={onLoadSample}
            className="bg-slate-900 hover:bg-slate-800 text-white"
          >
            <CloudDownload className="w-4 h-4 mr-2" /> Load sample CAD call
          </Button>
          <Button type="button" variant="outline" onClick={onLoadUpdate} className="border-slate-300">
            <RefreshCw className="w-4 h-4 mr-2" /> Load sample CAD update
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          The update is the same call at a newer CAD revision with a corrected clear time.
        </p>
      </div>

      {!hasCad ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-8 text-center">
          <ClipboardList className="w-9 h-9 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-medium text-slate-600">No CAD call loaded</p>
          <p className="text-xs text-slate-500 mt-1">
            Load the sample CAD call to start the demo handoff.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <PilotStatusBadge status={item.status} />
            <span className="text-xs text-slate-500">
              CAD revisions received: {item.latestCad.revision}
              {item.latestCad.revision > item.initialCad.revision && " · initial snapshot retained"}
            </span>
          </div>

          <CadReadOnlyCard
            cad={item.latestCad}
            title="CAD call details"
            subtitle={`Latest CAD revision ${item.latestCad.revision} · loaded read-only from the demo CAD fixture`}
          />

          <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-800">Crew entry</h4>
              <p className="text-xs text-slate-500">
                Stored separately from the CAD record, so a CAD revision cannot overwrite it.
              </p>
            </div>

            <div>
              <Label htmlFor="pilot-actual-address" className="text-sm font-medium text-slate-700">
                Actual address
              </Label>
              <Input
                id="pilot-actual-address"
                value={actualAddress}
                onChange={(e) => setActualAddress(e.target.value)}
                placeholder="Street, city, state"
                className="mt-1.5"
                autoComplete="off"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Leave blank if the crew used the dispatched address.
              </p>
            </div>

            <div>
              <Label htmlFor="pilot-staffing" className="text-sm font-medium text-slate-700">
                Crew staffing count
              </Label>
              <Input
                id="pilot-staffing"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={staffing}
                onChange={(e) => setStaffing(e.target.value)}
                placeholder="e.g. 4"
                className="mt-1.5 w-32"
              />
            </div>

            <div>
              <Label htmlFor="pilot-narrative" className="text-sm font-medium text-slate-700">
                Crew narrative
              </Label>
              <Textarea
                id="pilot-narrative"
                rows={4}
                value={narrative}
                onChange={(e) => setNarrative(e.target.value)}
                placeholder="What the crew found and did"
                className="mt-1.5"
              />
            </div>

            {item.responder?.submittedAt && (
              <p className="text-[11px] text-slate-500">
                Last submitted {formatStamp(item.responder.submittedAt)}. Submitting again updates the
                same queue row.
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white">
                <Send className="w-4 h-4 mr-2" /> Submit for Review
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onOpenReviewer}
                className="border-slate-300 text-slate-600"
              >
                Open simulated Reviewer view
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}