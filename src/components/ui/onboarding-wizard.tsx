import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Sparkles, Target, X } from "lucide-react";
import { celebrate } from "@/components/ui/confetti";
import { useModalA11y } from "@/components/ui/use-modal-a11y";

/** Target roles offered in the onboarding flow, with the skills each needs. */
export const ONBOARDING_ROLES: { id: string; name: string; desc: string; skills: string[] }[] = [
  { id: "clinical-research", name: "Clinical Research", desc: "Trials, data capture, GCP & regulatory basics", skills: ["Clinical Research", "Statistical Analysis", "Research Methodology", "Data Management"] },
  { id: "data-analytics", name: "Data Analytics", desc: "Python, statistics, dashboards & SQL", skills: ["Python", "Data Analysis", "Statistical Analysis", "Machine Learning"] },
  { id: "ayush-research", name: "AYUSH Research", desc: "Evidence-based Ayurveda research & documentation", skills: ["Clinical Research", "Scientific Writing", "Ayurvedic Therapeutics", "Documentation"] },
  { id: "pharmacovigilance", name: "Pharmacovigilance", desc: "Drug safety & adverse-event reporting", skills: ["Pharmacology", "Documentation", "Clinical Research", "Statistical Analysis"] },
  { id: "clinical-ops", name: "Clinical Operations", desc: "Site coordination, patient data & trial logistics", skills: ["Clinical Research", "Data Management", "Documentation", "Communication"] },
];

interface OnboardingWizardProps {
  open: boolean;
  onClose: () => void;
  /** Skills the student already holds — excluded from the generated gap plan. */
  existingSkills?: string[];
  onComplete: (selectedRoles: string[]) => void;
}

const STEP_KEYS = ["Choose roles", "Plan created"];

/**
 * First-login onboarding: pick 1–3 target roles and get an initial skill gap
 * plan generated from their required skills. Works fully offline (localStorage).
 */
export default function OnboardingWizard({ open, onClose, existingSkills = [], onComplete }: OnboardingWizardProps) {
  const [selected, setSelected] = React.useState<string[]>([]);
  const [step, setStep] = React.useState<0 | 1>(0);

  React.useEffect(() => {
    if (open) {
      setStep(0);
      setSelected([]);
    }
  }, [open]);

  const dialogRef = useModalA11y<HTMLDivElement>(open, onClose);

  if (!open) return null;

  const owned = new Set(existingSkills.map((s) => s.toLowerCase()));
  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const derivedGapSkills = (() => {
    const byRole = selected
      .map((id) => ONBOARDING_ROLES.find((r) => r.id === id))
      .filter(Boolean) as typeof ONBOARDING_ROLES;
    const counts = new Map<string, number>();
    for (const role of byRole) {
      for (const sk of role.skills) {
        if (owned.has(sk.toLowerCase())) continue;
        counts.set(sk, (counts.get(sk) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([skill, hits]) => ({ skill, priority: hits > 1 ? "High" : "Medium" }));
  })();

  const finish = () => {
    onComplete(selected);
    celebrate({ particleCount: 110 });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="l2l-onboarding-title">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px]" onClick={onClose} aria-hidden />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        ref={dialogRef}
        tabIndex={-1}
        className="relative w-full sm:max-w-lg rounded-t-[20px] sm:rounded-[20px] bg-white max-h-[88vh] overflow-y-auto shadow-2xl border"
        style={{ borderColor: "#E6E3D7" }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white p-5 pb-4 border-b" style={{ borderColor: "#EDEBE0" }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-mono text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-md" style={{ background: "#DCE6D0", color: "#16301F" }}>Setup</span>
                <span className="font-mono text-[10px]" style={{ color: "#9A9D94" }}>{STEP_KEYS[step]}</span>
              </div>
              <h2 id="l2l-onboarding-title" className="font-semibold text-[20px] tracking-tight" style={{ color: "#171A18" }}>
                {step === 0 ? "What roles are you targeting?" : "Your initial skill gap plan"}
              </h2>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-[#FAFAF7] flex-shrink-0" style={{ borderColor: "#E6E3D7" }}>
              <X size={15} />
            </button>
          </div>
          {/* Progress dots */}
          <div className="flex gap-1.5 mt-3">
            {STEP_KEYS.map((_, i) => (
              <div key={i} className="h-1.5 rounded-full transition-all" style={{ width: i === step ? 28 : 8, background: i <= step ? "#244B35" : "#EDEBE0" }} />
            ))}
          </div>
        </div>

        <div className="p-5">
          <AnimatePresence mode="wait">
            {step === 0 ? (
              <motion.div key="roles" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p className="text-xs mb-4" style={{ color: "#6B6F68" }}>
                  {"Pick up to 3 roles. We'll build your skill passport plan around their requirements."}
                </p>
                <div className="flex flex-col gap-2.5">
                  {ONBOARDING_ROLES.map((role) => {
                    const active = selected.includes(role.id);
                    const disabled = !active && selected.length >= 3;
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => toggle(role.id)}
                        disabled={disabled}
                        aria-pressed={active}
                        className="flex items-start gap-3 rounded-xl border p-4 text-left transition-all disabled:opacity-45"
                        style={{
                          borderColor: active ? "#244B35" : "#E6E3D7",
                          background: active ? "linear-gradient(135deg, #F0F5EC, #E8F0E2)" : "#FAFAF7",
                          boxShadow: active ? "0 0 0 3px rgba(36,75,53,.12)" : undefined,
                        }}
                      >
                        <span
                          className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border"
                          style={{ borderColor: active ? "#244B35" : "#E6E3D7", background: active ? "#244B35" : "transparent" }}
                        >
                          {active && <Check size={12} style={{ color: "#DCE6D0" }} />}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold text-sm" style={{ color: "#171A18" }}>{role.name}</span>
                          <span className="mt-0.5 block text-xs" style={{ color: "#6B6F68" }}>{role.desc}</span>
                          <span className="mt-1.5 flex flex-wrap gap-1">
                            {role.skills.map((sk) => (
                              <span key={sk} className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#EDEBE0", color: "#6B6F68" }}>{sk}</span>
                            ))}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <span className="font-mono text-[10px]" style={{ color: "#9A9D94" }}>{selected.length}/3 {"selected"}</span>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={selected.length === 0}
                    className="font-mono text-xs font-bold px-5 py-2.5 rounded-lg text-white inline-flex items-center gap-2 transition-all hover:shadow-md disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #244B35, #1C3D2B)" }}
                  >
                    {"Generate my plan"} <ArrowRight size={13} />
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="plan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex items-center gap-3 rounded-xl p-4" style={{ background: "#F0F5EC", border: "1px solid #D6E3CE" }}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "#DCE6D0", color: "#244B35" }}>
                    <Target size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold" style={{ color: "#171A18" }}>Plan ready for {selected.length} {selected.length > 1 ? "roles" : "role"}</div>
                    <div className="text-xs" style={{ color: "#6B6F68" }}>{selected.map((id) => ONBOARDING_ROLES.find((r) => r.id === id)?.name).filter(Boolean).join(" · ")}</div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles size={13} style={{ color: "#8A6FB8" }} />
                    <span className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: "#8A6FB8" }}>Initial skill gaps to close</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {derivedGapSkills.length === 0 ? (
                      <div className="rounded-xl border p-4 text-center text-sm" style={{ borderColor: "#D6E3CE", background: "#FAFCF7", color: "#244B35" }}>
                        {"Great — you already hold every skill these roles need."}
                      </div>
                    ) : (
                      derivedGapSkills.map((g, i) => (
                        <div key={g.skill} className="flex items-center justify-between gap-3 rounded-xl border p-3.5" style={{ borderColor: "#E6E3D7", background: "#FAFAF7" }}>
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-mono text-[10px] font-bold" style={{ color: "#9A9D94" }}>{String(i + 1).padStart(2, "0")}</span>
                            <span className="text-sm font-semibold truncate" style={{ color: "#171A18" }}>{g.skill}</span>
                          </div>
                          <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded-md flex-shrink-0" style={{ background: g.priority === "High" ? "#E8C7AE" : "#E8D36B", color: g.priority === "High" ? "#7a3f1a" : "#5c4a08" }}>{g.priority}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <p className="text-[11px] mt-3" style={{ color: "#9A9D94" }}>
                    {"These appear in your Skill Gap tab — complete recommended projects to turn them into verified evidence."}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-end gap-3">
                  <button type="button" onClick={() => setStep(0)} className="font-semibold text-xs px-4 py-2.5 rounded-lg" style={{ color: "#6B6F68" }}>Back</button>
                  <button
                    type="button"
                    onClick={finish}
                    className="font-mono text-xs font-bold px-5 py-2.5 rounded-lg text-white inline-flex items-center gap-2 transition-all hover:shadow-md"
                    style={{ background: "linear-gradient(135deg, #244B35, #1C3D2B)" }}
                  >
                    {"Start my journey"} <Check size={13} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}