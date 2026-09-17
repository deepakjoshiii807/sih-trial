"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  Check,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { studentApi } from "@/lib/student-api";
import { celebrate } from "@/components/ui/confetti";
import { useModalA11y } from "@/components/ui/use-modal-a11y";

interface EvidenceUploadModalProps {
  open: boolean;
  onClose: () => void;
}

type Step = "form" | "uploading" | "done" | "error";

const KIND_OPTIONS = [
  "Certificate",
  "Project",
  "Transcript",
  "Internship",
  "Publication",
  "Portfolio",
  "Log",
] as const;

export default function EvidenceUploadModal({
  open,
  onClose,
}: EvidenceUploadModalProps) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<string>("Certificate");
  const [issuer, setIssuer] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>("form");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    id: string;
    status: string;
    extractedSkills: string[];
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setTitle("");
    setKind("Certificate");
    setIssuer("");
    setDescription("");
    setFile(null);
    setStep("form");
    setError(null);
    setResult(null);
  }, []);

  const handleClose = useCallback(() => {
    if (step === "uploading") return;
    reset();
    onClose();
  }, [reset, onClose, step]);

  // Celebrate a completed evidence submission (queued for verification).
  useEffect(() => {
    if (step === "done") celebrate({ particleCount: 90 });
  }, [step]);

  const dialogRef = useModalA11y<HTMLDivElement>(open, handleClose);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      setError("Title is required.");
      setStep("error");
      return;
    }
    setStep("uploading");
    setError(null);
    try {
      const res = await studentApi.uploadEvidence({
        title: title.trim(),
        kind,
        issuer: issuer.trim(),
        description: description.trim(),
        file: file ?? undefined,
        documentText: !file ? description.trim() : undefined,
      });
      setResult(res);
      setStep("done");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      const isOffline = /cannot reach|failed to fetch|network|503|502|api running/i.test(
        msg
      );
      if (isOffline) {
        // Offline demo — persist locally so flow completes
        try {
          const key = "l2l.offline_evidence";
          const prev = JSON.parse(localStorage.getItem(key) || "[]");
          prev.push({
            at: new Date().toISOString(),
            title: title.trim(),
            kind,
            issuer: issuer.trim(),
            description: description.trim(),
            fileName: file?.name ?? null,
          });
          localStorage.setItem(key, JSON.stringify(prev));
        } catch {
          /* quota */
        }
        setResult({ id: "offline", status: "offline", extractedSkills: [] });
        setStep("done");
        return;
      }
      setError(msg);
      setStep("error");
    }
  }, [title, kind, issuer, description, file]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.25 }}
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Upload evidence"
            tabIndex={-1}
            className="w-full max-w-xl max-h-[88vh] overflow-y-auto rounded-[20px] border bg-white shadow-2xl"
            style={{ borderColor: "#E6E3D7" }}
          >
            {/* Header */}
            <div
              className="sticky top-0 z-10 flex items-center justify-between p-5 border-b bg-white/95 backdrop-blur-sm"
              style={{ borderColor: "#E6E3D7" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, #244B35, #1C3D2B)",
                  }}
                >
                  <Upload size={18} style={{ color: "#DCE6D0" }} />
                </div>
                <div>
                  <div
                    className="font-semibold text-[16px] tracking-tight"
                    style={{ color: "#171A18" }}
                  >
                    Upload Evidence
                  </div>
                  <div className="text-xs" style={{ color: "#6B6F68" }}>
                    Add a certificate, transcript, or project to your passport
                  </div>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#EDEBE0] transition-colors"
              >
                <X size={16} style={{ color: "#6B6F68" }} />
              </button>
            </div>

            <div className="p-5">
              {step === "form" && (
                <div className="flex flex-col gap-4">
                  <div>
                    <label
                      className="font-mono text-[11px] font-bold tracking-widest uppercase mb-1.5 block"
                      style={{ color: "#6B6F68" }}
                    >
                      Title *
                    </label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Python for Research Certificate"
                      className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#244B35]/20"
                      style={{
                        borderColor: "#E6E3D7",
                        background: "#FAFAF7",
                        color: "#171A18",
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        className="font-mono text-[11px] font-bold tracking-widest uppercase mb-1.5 block"
                        style={{ color: "#6B6F68" }}
                      >
                        Kind
                      </label>
                      <select
                        value={kind}
                        onChange={(e) => setKind(e.target.value)}
                        className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                        style={{
                          borderColor: "#E6E3D7",
                          background: "#FAFAF7",
                          color: "#171A18",
                        }}
                      >
                        {KIND_OPTIONS.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        className="font-mono text-[11px] font-bold tracking-widest uppercase mb-1.5 block"
                        style={{ color: "#6B6F68" }}
                      >
                        Issuer
                      </label>
                      <input
                        value={issuer}
                        onChange={(e) => setIssuer(e.target.value)}
                        placeholder="e.g. NPTEL, AIIA"
                        className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                        style={{
                          borderColor: "#E6E3D7",
                          background: "#FAFAF7",
                          color: "#171A18",
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      className="font-mono text-[11px] font-bold tracking-widest uppercase mb-1.5 block"
                      style={{ color: "#6B6F68" }}
                    >
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Briefly describe what this evidence proves..."
                      rows={3}
                      className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none resize-none"
                      style={{
                        borderColor: "#E6E3D7",
                        background: "#FAFAF7",
                        color: "#171A18",
                      }}
                    />
                  </div>

                  {/* File drop */}
                  <div>
                    <label
                      className="font-mono text-[11px] font-bold tracking-widest uppercase mb-1.5 block"
                      style={{ color: "#6B6F68" }}
                    >
                      File (optional)
                    </label>
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragging(true);
                      }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={handleDrop}
                      onClick={() => fileRef.current?.click()}
                      className={`rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                        dragging
                          ? "border-[#244B35] bg-[#F0F5EC]"
                          : "border-[#E6E3D7] hover:border-[#244B35] hover:bg-[#FAFCF7]"
                      }`}
                    >
                      <input
                        ref={fileRef}
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.txt,.md,.csv,.json,.png,.jpg,.jpeg"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) setFile(f);
                        }}
                      />
                      {file ? (
                        <div className="flex items-center justify-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: "#F0F5EC" }}
                          >
                            <FileText size={18} style={{ color: "#244B35" }} />
                          </div>
                          <div className="text-left min-w-0">
                            <div
                              className="text-sm font-medium truncate max-w-[200px]"
                              style={{ color: "#171A18" }}
                            >
                              {file.name}
                            </div>
                            <div
                              className="text-xs"
                              style={{ color: "#6B6F68" }}
                            >
                              {(file.size / 1024).toFixed(1)} KB — click to
                              change
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setFile(null);
                              if (fileRef.current) fileRef.current.value = "";
                            }}
                            className="ml-2 w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#EDEBE0]"
                          >
                            <X size={14} style={{ color: "#6B6F68" }} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2"
                            style={{ background: "#F0F5EC", color: "#244B35" }}
                          >
                            <Upload size={20} />
                          </div>
                          <div
                            className="text-sm font-medium"
                            style={{ color: "#171A18" }}
                          >
                            Drop a file or click to browse
                          </div>
                          <div
                            className="text-xs mt-1"
                            style={{ color: "#6B6F68" }}
                          >
                            .pdf, .docx, .txt, .png, .jpg — max 8 MB
                          </div>
                        </>
                      )}
                    </div>
                    <div
                      className="text-[11px] mt-1.5"
                      style={{ color: "#9A9D94" }}
                    >
                      PDFs are parsed server-side; images need a text export. Works
                      offline via local save when API is unreachable.
                    </div>
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={!title.trim()}
                    className="w-full font-mono text-sm font-bold py-3 rounded-xl text-white transition-all hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed mt-1"
                    style={{
                      background: "linear-gradient(135deg, #244B35, #1C3D2B)",
                    }}
                  >
                    Save Evidence
                  </button>
                </div>
              )}

              {step === "uploading" && (
                <div className="py-12 text-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                    style={{ background: "#F0F5EC" }}
                  >
                    <Loader2 size={24} style={{ color: "#244B35" }} />
                  </motion.div>
                  <div
                    className="font-semibold text-sm mb-1"
                    style={{ color: "#171A18" }}
                  >
                    Saving evidence...
                  </div>
                  <div className="text-xs" style={{ color: "#6B6F68" }}>
                    {file ? `Uploading "${file.name}"` : `Saving "${title}"`}
                  </div>
                </div>
              )}

              {step === "done" && (
                <div className="py-10 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{ background: "#DCE6D0" }}
                  >
                    <Check size={24} style={{ color: "#244B35" }} />
                  </motion.div>
                  <div
                    className="font-semibold text-sm mb-1"
                    style={{ color: "#171A18" }}
                  >
                    Evidence saved!
                  </div>
                  <div className="text-xs mb-1" style={{ color: "#6B6F68" }}>
                    {result?.id === "offline"
                      ? "Saved locally (API was offline). It will sync when the backend is available."
                      : result?.extractedSkills?.length
                        ? `Detected ${result.extractedSkills.length} skill(s): ${result.extractedSkills.join(", ")} — queued for review.`
                        : "Queued for academician review — verified skills appear in your passport after approval."}
                  </div>
                  {result?.status && result.status !== "offline" && (
                    <div
                      className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-[11px] font-medium"
                      style={{ background: "#F0F5EC", color: "#244B35" }}
                    >
                      Status: {result.status}
                    </div>
                  )}
                  <button
                    onClick={handleClose}
                    className="mt-6 font-mono text-xs font-bold px-5 py-2.5 rounded-xl text-white"
                    style={{
                      background: "linear-gradient(135deg, #244B35, #1C3D2B)",
                    }}
                  >
                    Done
                  </button>
                </div>
              )}

              {step === "error" && (
                <div className="py-8 text-center">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                    style={{ background: "#F0E8DD" }}
                  >
                    <AlertCircle size={24} style={{ color: "#C98B5F" }} />
                  </div>
                  <div
                    className="font-semibold text-sm mb-1"
                    style={{ color: "#171A18" }}
                  >
                    Upload failed
                  </div>
                  <div className="text-xs mb-4" style={{ color: "#6B6F68" }}>
                    {error || "Something went wrong."}
                  </div>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => setStep("form")}
                      className="font-mono text-xs font-bold px-4 py-2 rounded-lg border"
                      style={{ borderColor: "#E6E3D7", color: "#6B6F68" }}
                    >
                      Go back
                    </button>
                    <button
                      onClick={handleSubmit}
                      className="font-mono text-xs font-bold px-4 py-2 rounded-lg text-white"
                      style={{ background: "#244B35" }}
                    >
                      Try again
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
