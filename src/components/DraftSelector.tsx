import React, { useState } from "react";
import { GmailDraft } from "../types";
import { RefreshCw, Clipboard, FileText, Sparkles, MessageSquare } from "lucide-react";

interface DraftSelectorProps {
  drafts: GmailDraft[];
  selectedDraftId: string | null;
  onSelectDraft: (draftId: string | null) => void;
  isLoadingDrafts: boolean;
  onRefreshDrafts: () => void;
  draftBody: string;
  onChangeDraftBody: (body: string) => void;
  customContext: string;
  onChangeCustomContext: (context: string) => void;
  onSuggest: () => void;
  isSuggesting: boolean;
  canSuggest: boolean;
}

export default function DraftSelector({
  drafts,
  selectedDraftId,
  onSelectDraft,
  isLoadingDrafts,
  onRefreshDrafts,
  draftBody,
  onChangeDraftBody,
  customContext,
  onChangeCustomContext,
  onSuggest,
  isSuggesting,
  canSuggest,
}: DraftSelectorProps) {
  const [showDraftsList, setShowDraftsList] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden" id="draft-manager-container">
      {/* Editor Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-sans">
            Draft Body Content
          </h3>
        </div>
        <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-full uppercase tracking-wider">
          Drafting
        </span>
      </div>

      <div className="p-6 space-y-5">
        {/* Sync Controls Option */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200/60">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="font-bold text-slate-400 font-mono text-[10px] uppercase">Connection:</span>
            {selectedDraftId ? (
              <span className="text-xs bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md font-bold border border-emerald-100">
                Connected to Draft #{selectedDraftId.slice(-6)}
              </span>
            ) : (
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold">
                Editing Local Sandbox
              </span>
            )}
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => {
                setShowDraftsList(!showDraftsList);
                if (!showDraftsList && drafts.length === 0) {
                  onRefreshDrafts();
                }
              }}
              className="px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
              id="toggle-drafts-list-btn"
            >
              {showDraftsList ? "Hide Drafts" : "Load Gmail Drafts"}
            </button>
            <button
              onClick={onRefreshDrafts}
              disabled={isLoadingDrafts}
              className="p-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-500 transition-colors disabled:opacity-50 cursor-pointer"
              title="Refresh Drafts"
              id="refresh-drafts-btn"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDrafts ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* List of drafts */}
        {showDraftsList && (
          <div className="border border-slate-100 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto mb-4 bg-slate-50/50" id="drafts-selection-list">
            {isLoadingDrafts && drafts.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <span className="w-3 h-3 rounded-full border border-blue-600 border-t-transparent animate-spin" />
                Looking up active drafts from Gmail outbox...
              </div>
            ) : drafts.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">No active draft emails found in your Gmail inbox.</div>
            ) : (
              drafts.map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    onSelectDraft(d.id);
                    onChangeDraftBody(d.body);
                    setShowDraftsList(false);
                  }}
                  className={`w-full text-left p-3 flex items-start gap-3 transition-colors hover:bg-slate-100 ${
                    selectedDraftId === d.id ? "bg-blue-50/40 border-l-2 border-blue-500" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-800 truncate">
                        {d.subject || <span className="text-slate-400 italic">(Untitled Draft)</span>}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono">
                        {d.id.slice(-6)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{d.snippet}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* Text Area for Email Body */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              Email Content
            </span>
            {selectedDraftId && (
              <button
                onClick={() => {
                  onSelectDraft(null);
                  onChangeDraftBody("");
                }}
                className="text-[10px] text-blue-600 hover:underline font-bold"
                id="clear-selected-draft-btn"
              >
                Create local copy
              </button>
            )}
          </div>
          <div className="relative">
            <textarea
              id="draft-content-textarea"
              value={draftBody}
              onChange={(e) => onChangeDraftBody(e.target.value)}
              placeholder="Hi Marcus, Let me know if you are free tomorrow morning for a brief budget update..."
              rows={8}
              className="w-full text-[15px] text-slate-700 bg-white border border-slate-200 rounded-xl p-4.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-hidden transition-all placeholder:text-slate-400 font-serif leading-relaxed"
            />
          </div>
        </div>

        {/* Custom Context block */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5 mb-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Tone context / Personal touches (Optional)</span>
          </label>
          <input
            id="prompt-context-input"
            type="text"
            value={customContext}
            onChange={(e) => onChangeCustomContext(e.target.value)}
            placeholder="e.g. 'Use Title Case', 'Mention Q4 Southeast performance reports', 'Make it brief and professional'"
            className="w-full text-xs text-slate-850 bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 focus:border-blue-500 focus:outline-hidden transition-colors placeholder:text-slate-400"
          />
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            onClick={onSuggest}
            disabled={!canSuggest || isSuggesting}
            className="px-5 py-2.5 bg-[#3b82f6] text-white text-xs font-semibold rounded-lg hover:bg-blue-600 transition-all flex items-center justify-center gap-1.5 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer shadow-xs font-sans uppercase tracking-wider"
            id="generate-subjects-btn"
          >
            {isSuggesting ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border border-white border-t-transparent animate-spin" />
                <span>Scanning Patterns...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Regenerate Suggestions</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

