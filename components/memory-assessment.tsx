"use client";

import { useState } from "react";
import {
  assessmentQuestions,
  determineProfile,
  memoryProfiles,
  type MemoryProfileType
} from "@/lib/memory-profile";

type Props = {
  currentType: MemoryProfileType;
  onSelect: (type: MemoryProfileType) => void;
  onClose: () => void;
};

export function MemoryAssessment({ currentType, onSelect, onClose }: Props) {
  const [step, setStep] = useState<"quiz" | "result">("quiz");
  const [answers, setAnswers] = useState<MemoryProfileType[]>([]);
  const [result, setResult] = useState<MemoryProfileType | null>(null);

  const handleAnswer = (profile: MemoryProfileType) => {
    const next = [...answers, profile];
    setAnswers(next);

    if (next.length >= assessmentQuestions.length) {
      const detected = determineProfile(next);
      setResult(detected);
      setStep("result");
    }
  };

  const handleConfirm = () => {
    if (result) onSelect(result);
    onClose();
  };

  const qIndex = answers.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f8f3ea]/95 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg space-y-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-fog/60 bg-white/80 px-4 py-1.5 text-xs font-semibold text-ink/40 transition hover:border-accent hover:text-accent"
          >
            ✕ 退出测评
          </button>
        </div>
        {step === "quiz" && qIndex < assessmentQuestions.length && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                <span className="text-2xl">🧠</span>
              </div>
              <h2 className="font-display text-2xl text-ink">记忆画像测评</h2>
              <p className="mt-2 text-sm text-ink/50">
                第 {qIndex + 1}/{assessmentQuestions.length} 题
              </p>
              <div className="mt-3 flex justify-center gap-1.5">
                {assessmentQuestions.map((_, i) => (
                  <div
                    key={i}
                    className={
                      "h-1.5 w-8 rounded-full " +
                      (i < qIndex ? "bg-accent" : "bg-fog")
                    }
                  />
                ))}
              </div>
            </div>

            <h3 className="text-center text-lg font-semibold leading-relaxed text-ink">
              {assessmentQuestions[qIndex].question}
            </h3>

            <div className="space-y-3">
              {assessmentQuestions[qIndex].options.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleAnswer(opt.profile)}
                  className="w-full rounded-[1rem] border border-fog/60 bg-white px-5 py-4 text-left text-sm leading-7 text-ink/75 shadow-sm transition hover:border-accent hover:shadow-md"
                >
                  <span className="mr-2 font-semibold text-accent">
                    {String.fromCharCode(65 + i)}.
                  </span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "result" && result && (
          <div className="space-y-6 text-center">
            <div className="text-5xl">{memoryProfiles[result].icon}</div>
            <h2 className="font-display text-3xl text-ink">
              {memoryProfiles[result].label}
            </h2>
            <p className="text-sm leading-7 text-ink/65">
              {memoryProfiles[result].description}
            </p>

            <div className="rounded-[1.25rem] border border-fog/60 bg-white px-5 py-4 text-left">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                记忆特征
              </div>
              <div className="mt-3 space-y-2">
                {memoryProfiles[result].lens.map((item) => (
                  <div key={item} className="flex gap-2 text-sm leading-7 text-ink/70">
                    <span>•</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              {result !== currentType && (
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="flex-1 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent/90"
                >
                  使用此画像
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setAnswers([]);
                  setResult(null);
                  setStep("quiz");
                }}
                className="flex-1 rounded-full border border-ink/15 bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:border-accent"
              >
                重新测评
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
