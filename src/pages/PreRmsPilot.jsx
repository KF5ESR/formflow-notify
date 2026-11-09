import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FlaskConical, RotateCcw } from "lucide-react";
import PilotBanner from "@/components/pilot/PilotBanner";
import ResponderPanel from "@/components/pilot/ResponderPanel";
import ReviewerPanel from "@/components/pilot/ReviewerPanel";
import {
  DEMO_QUEUE_KEY,
  PILOT_DEPARTMENT,
  SAMPLE_CAD_CALL,
  SAMPLE_CAD_UPDATE,
  approveHandoff,
  isStorageAvailable,
  loadCadRevision,
  readPilotState,
  resetPilotData,
  submitResponderReport,
} from "@/lib/pilot/preRmsPilotStore";

const TONES = {
  info: "bg-slate-50 border-slate-200 text-slate-700",
  success: "bg-green-50 border-green-200 text-green-800",
  warn: "bg-amber-50 border-amber-300 text-amber-900",
};

const LOAD_MESSAGES = {
  created: "Sample CAD call loaded. CFS and department run numbers are kept as separate fields on one queue item.",
  updated: "Newer CAD revision applied. Crew entry, staffing and narrative were left untouched.",
  reopened: "Newer CAD revision applied after approval. The approval was cleared and this call is back in Awaiting Review.",
  ignored: "That CAD revision is not newer than the stored one. Nothing changed and no duplicate was created.",
};

export default function PreRmsPilot() {
  const navigate = useNavigate();
  const [items, setItems] = useState(() => readPilotState().items);
  const [tab, setTab] = useState("responder");
  const [selectedKey, setSelectedKey] = useState(null);
  const [notice, setNotice] = useState(null);
  const [storageOk, setStorageOk] = useState(() => isStorageAvailable());

  const item = items.find((i) => i.key === DEMO_QUEUE_KEY) || null;
  const submitted = items.filter((i) => i.responder?.submittedAt);
  const pendingCount = submitted.filter((i) => i.status === "awaiting_review").length;

  useEffect(() => {
    if (selectedKey && !items.some((i) => i.key === selectedKey && i.responder?.submittedAt)) {
      setSelectedKey(null);
      return;
    }
    if (!selectedKey && submitted.length > 0) {
      setSelectedKey(submitted[0].key);
    }
  }, [items, selectedKey, submitted.length]);

  // Storage is optional: memory already holds the state, this only reports persistence.
  const trackPersistence = (res) => {
    if (typeof res?.persisted === "boolean") setStorageOk(res.persisted);
  };

  const handleLoad = (cad) => {
    const res = loadCadRevision(cad);
    setItems(res.items);
    trackPersistence(res);
    setNotice({
      tone: res.result === "ignored" ? "warn" : "success",
      text: LOAD_MESSAGES[res.result] || LOAD_MESSAGES.created,
    });
  };

  const handleSubmit = (data) => {
    const res = submitResponderReport(DEMO_QUEUE_KEY, data);
    if (res.result === "missing") {
      setNotice({ tone: "warn", text: "Load the sample CAD call before submitting a report." });
      return;
    }
    setItems(res.items);
    trackPersistence(res);
    setSelectedKey(DEMO_QUEUE_KEY);
    setNotice({
      tone: "success",
      text: "Submitted for review. One queue row exists for this agency, CFS number and incident date. No email was sent.",
    });
  };

  const handleApprove = (key) => {
    const res = approveHandoff(key);
    setItems(res.items);
    trackPersistence(res);
    if (res.result === "approved") {
      setNotice({
        tone: "success",
        text: "Handoff approved in the simulated Reviewer view. The RMS text is ready to copy and the approval is saved in this browser.",
      });
    } else {
      setNotice({
        tone: "warn",
        text: "Only a submitted, unapproved report can be approved.",
      });
    }
  };

  const handleReset = () => {
    if (!window.confirm("Clear the Pre-RMS pilot demo data stored in this browser? Live app records are not affected.")) {
      return;
    }
    const res = resetPilotData();
    setItems(res.items);
    trackPersistence(res);
    setSelectedKey(null);
    setNotice({ tone: "info", text: "Pilot demo data cleared from this browser." });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-start gap-3 mb-5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="rounded-full shrink-0"
            aria-label="Back to Fast Attack home"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center shrink-0">
              <FlaskConical className="w-5 h-5 text-amber-950" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900">Pre-RMS Pilot</h1>
                <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold tracking-[0.18em] text-amber-950">
                  TEST
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate">
                {PILOT_DEPARTMENT.name} · demo key {PILOT_DEPARTMENT.key}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="border-slate-300 text-slate-600 shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset demo data
          </Button>
        </div>

        <PilotBanner />

        {!storageOk && (
          <p
            role="status"
            className="mt-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px] text-slate-600"
          >
            Browser storage is unavailable in this embedded preview, so the demo is held in memory
            only. A full reload clears it.
          </p>
        )}

        <div role="status" aria-live="polite">
          {notice && (
            <div className={`mt-3 rounded-lg border px-3 py-2 text-xs ${TONES[notice.tone] || TONES.info}`}>
              {notice.text}
            </div>
          )}
        </div>

        <Tabs value={tab} onValueChange={setTab} className="mt-4">
          <TabsList className="h-auto gap-1 rounded-xl border border-slate-200 bg-white p-1">
            <TabsTrigger value="responder" className="rounded-lg px-3 py-1.5 text-sm">
              Responder
              <span className="ml-1.5 text-[10px] uppercase tracking-wide text-slate-500">demo role</span>
            </TabsTrigger>
            <TabsTrigger value="reviewer" className="rounded-lg px-3 py-1.5 text-sm">
              Reviewer
              <span className="ml-1.5 text-[10px] uppercase tracking-wide text-slate-500">demo role</span>
              {pendingCount > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-amber-950">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="responder" className="mt-4">
            <ResponderPanel
              item={item}
              onLoadSample={() => handleLoad(SAMPLE_CAD_CALL)}
              onLoadUpdate={() => handleLoad(SAMPLE_CAD_UPDATE)}
              onSubmitReport={handleSubmit}
              onOpenReviewer={() => setTab("reviewer")}
            />
          </TabsContent>

          <TabsContent value="reviewer" className="mt-4">
            <ReviewerPanel
              items={items}
              selectedKey={selectedKey}
              onSelect={setSelectedKey}
              onApprove={handleApprove}
            />
          </TabsContent>
        </Tabs>

        <p className="mt-6 text-[11px] leading-relaxed text-slate-500">
          Limits of this pilot: the Responder and Reviewer roles are demo labels for a single browser
          session. They simulate a handoff and do not enforce production authorization. Nothing is
          stored outside this browser, and no live incident, department, CAD, ESO, NERIS or email
          record is read, written or sent.
        </p>
      </div>
    </div>
  );
}