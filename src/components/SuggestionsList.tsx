import React, { useState } from "react";
import { SubjectSuggestion } from "../types";
import { Sparkles, Check, Copy, HardDriveDownload, Gift, Star } from "lucide-react";
import { motion } from "motion/react";

interface SuggestionsListProps {
  suggestions: SubjectSuggestion[];
  onApply: (subject: string) => void;
  isLoading: boolean;
  selectedDraftId: string | null;
}

export default function SuggestionsList({
  suggestions,
  onApply,
  isLoading,
  selectedDraftId,
}: SuggestionsListProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleCopy = (subject: string, idx: number) => {
    navigator.clipboard.writeText(subject);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col items-center justify-center text-center py-12" id="suggestions-loader">
        <div className="relative">
          <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin" />
          <Star className="w-3.5 h-3.5 text-amber-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        </div>
        <h4 className="text-xs font-bold text-slate-800 mt-4 animate-pulse uppercase tracking-wider">
          Crafting Elite Headlines...
        </h4>
        <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
          Scanning custom outbox metrics for tone symmetry.
        </p>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4" id="suggestions-container">
      <div className="flex flex-col gap-1 px-1">
        <h4 className="text-sm font-bold text-slate-800">
          Recommended Subjects
        </h4>
        <p className="text-xs text-slate-500">
          Generated based on your discovered Executive writing profile.
        </p>
      </div>

      <div className="space-y-3" id="suggestions-rendered-list">
        {suggestions.map((s, idx) => {
          // Preset elegant scores matching design HTML
          const matchPercentage = idx === 0 ? "98%" : idx === 1 ? "94%" : idx === 2 ? "89%" : "85%";
          const patternLabel = idx === 0 ? "Direct Match" : idx === 1 ? "Action Tone" : "Structured Context";

          return (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={idx}
              className={`cursor-pointer rounded-xl border p-5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                selectedIndex === idx
                  ? "bg-[#f0f7ff] border-blue-500 ring-1 ring-blue-200 shadow-xs"
                  : "bg-white border-slate-200/80 hover:border-blue-400 hover:bg-[#f0f7ff]/30 shadow-2xs"
              }`}
              onClick={() => setSelectedIndex(idx)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider font-mono">
                    {matchPercentage} Match
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Pattern: {patternLabel}
                  </span>
                </div>
                
                <h3 className="text-sm font-bold text-slate-900 mt-2 select-all tracking-tight leading-snug">
                  {s.subject}
                </h3>
                
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  <span className="font-semibold text-slate-600">Tone index:</span> {s.reason}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 self-end md:self-auto flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy(s.subject, idx);
                  }}
                  className="p-2 border border-slate-200 hover:bg-slate-55 rounded-lg text-slate-500 transition-colors cursor-pointer"
                  title="Copy Header Line"
                  id={`copy-subject-btn-${idx}`}
                >
                  {copiedIndex === idx ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onApply(s.subject);
                  }}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-3xs uppercase tracking-wide"
                  id={`apply-subject-btn-${idx}`}
                >
                  <HardDriveDownload className="w-3 h-3" />
                  <span>
                    {selectedDraftId ? "Save Draft" : "Add Draft"}
                  </span>
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="p-4 bg-slate-50 border border-slate-200 border-dashed rounded-xl text-center text-[11px] text-slate-500 mt-4">
        <span>Click 'Save Draft' to write this subject directly to Gmail, or copy to clipboard.</span>
      </div>
    </div>
  );
}
