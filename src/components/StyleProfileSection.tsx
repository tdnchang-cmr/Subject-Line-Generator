import React from "react";
import { StyleProfile } from "../types";
import { Sparkles, Check, RefreshCw, Mail, HelpCircle, AlignLeft, ArrowRight, ShieldCheck, Calendar } from "lucide-react";
import { motion } from "motion/react";

interface StyleProfileSectionProps {
  styleProfile: StyleProfile | null;
  onAnalyze: () => void;
  isLoading: boolean;
  hasSentEmails: boolean | null;
}

export default function StyleProfileSection({
  styleProfile,
  onAnalyze,
  isLoading,
  hasSentEmails,
}: StyleProfileSectionProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs flex flex-col gap-5" id="style-profile-container">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50/80 border border-blue-100 flex items-center justify-center text-blue-600">
              <Sparkles className="w-4 h-4 fill-blue-500 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 font-sans">
                Linguistic Profiler
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Analyzes sent outbox patterns using AI.
              </p>
            </div>
          </div>
          <button
            onClick={onAnalyze}
            disabled={isLoading}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-all cursor-pointer disabled:opacity-50"
            id="analyze-style-btn"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
            {styleProfile ? "Sync Outbox" : "Analyze Outbox"}
          </button>
        </div>
      </div>

      {/* Progress & Stat Widget */}
      <div className="p-4 bg-slate-50 border border-slate-200/50 rounded-xl space-y-2.5">
        <div className="flex justify-between items-center text-xs">
          <span className="font-semibold text-slate-700">Sent Mail Scanned</span>
          <span className="font-bold text-blue-600 font-mono">
            {styleProfile ? "25 / 25 Messages" : "0 / 25 Messages"}
          </span>
        </div>
        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-700"
            style={{ width: styleProfile ? "100%" : "0%" }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-500" /> Authorized Scan
          </span>
          <span>{styleProfile ? "Last sync: Just now" : "Outbox not analyzed"}</span>
        </div>
      </div>

      {isLoading && (
        <div className="py-8 flex flex-col items-center justify-center text-center">
          <div className="w-7 h-7 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mb-3" />
          <p className="text-xs font-semibold text-slate-700 animate-pulse">
            Deep-profiling writing tone, casing, and emojis...
          </p>
          <p className="text-[10px] text-slate-400 mt-1 max-w-xs">
            Scanning 25 messages. This takes a few seconds.
          </p>
        </div>
      )}

      {!isLoading && !styleProfile && (
        <div className="py-6 text-center flex flex-col items-center">
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <Mail className="w-5 h-5" />
          </div>
          <h3 className="text-xs font-bold text-slate-800">No profile analyzed yet</h3>
          <p className="text-[11px] text-slate-400 mt-1 max-w-[240px] leading-relaxed">
            Click 'Analyze Outbox' to authorize scan of recently sent headers and build your professional SubjectScribe template profile.
          </p>
        </div>
      )}

      {!isLoading && styleProfile && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-5"
          id="profile-details"
        >
          {/* Overall Summary Card */}
          <div className="p-4 rounded-xl bg-blue-50/40 border border-blue-100/60 text-slate-700 text-xs leading-relaxed">
            <p className="font-bold text-blue-900 mb-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block animate-pulse" />
              Executive Stylistic Persona:
            </p>
            {styleProfile.overallSummary}
          </div>

          {/* Core Insights Grid */}
          <div className="grid grid-cols-1 gap-2.5">
            <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/40 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] font-mono">
                Typical Length
              </span>
              <span className="font-semibold text-slate-800 text-right">
                {styleProfile.averageLength}
              </span>
            </div>
            <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/40 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] font-mono">
                Capitalization Choice
              </span>
              <span className="font-semibold text-slate-800 text-right">
                {styleProfile.capitalizationStyle}
              </span>
            </div>
            <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/40 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] font-mono">
                Punctuation & Emojis
              </span>
              <span className="font-semibold text-slate-800 text-right">
                {styleProfile.punctuationAndEmojis}
              </span>
            </div>
          </div>

          {/* Key Characteristics as Styled Tags */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-2">
              Discovered Writing Blueprints
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {styleProfile.keyCharacteristics?.map((char, i) => (
                <span
                  key={i}
                  className="inline-block px-2.5 py-1 bg-slate-55 border border-slate-200/60 rounded-md text-[11px] font-semibold text-slate-600 shadow-3xs"
                >
                  {char}
                </span>
              ))}
            </div>
          </div>

          {/* Recent Source Examples */}
          {styleProfile.examples && styleProfile.examples.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-2 flex items-center justify-between">
                <span>Outbox Subject Benchmarks</span>
                <span className="text-[9px] text-blue-600 font-normal">Reference list</span>
              </h4>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {styleProfile.examples.map((ex, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border border-slate-100 bg-white flex items-start gap-2.5 hover:border-slate-200 transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-xs font-semibold text-slate-800 truncate">
                        {ex.subject || <span className="text-slate-300 italic">(No Subject)</span>}
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {ex.snippet}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

