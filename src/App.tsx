import React, { useState, useEffect } from "react";
import { initAuth, googleSignIn, logout } from "./firebase";
import { User } from "firebase/auth";
import { StyleProfile, SubjectSuggestion, GmailDraft, UserInfo } from "./types";
import StyleProfileSection from "./components/StyleProfileSection";
import DraftSelector from "./components/DraftSelector";
import SuggestionsList from "./components/SuggestionsList";
import ConfirmationModal from "./components/ConfirmationModal";
import { motion, AnimatePresence } from "motion/react";
import { Mail, Sparkles, LogOut, CheckCircle, AlertCircle, Info, Lock } from "lucide-react";

export default function App() {
  // Authentication states
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Application Data States
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null);
  const [drafts, setDrafts] = useState<GmailDraft[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [draftBody, setDraftBody] = useState("");
  const [customContext, setCustomContext] = useState("");
  const [suggestions, setSuggestions] = useState<SubjectSuggestion[]>([]);

  // Loading & error flags
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Save draft state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingSubject, setPendingSubject] = useState("");

  // Initialize Auth state listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setNeedsAuth(false);
        // Load style from localStorage if present
        const savedProfile = localStorage.getItem("gmail_style_profile");
        if (savedProfile) {
          try {
            setStyleProfile(JSON.parse(savedProfile));
          } catch (_) {}
        }
      },
      () => {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch drafts when authenticated
  useEffect(() => {
    if (token && !needsAuth) {
      fetchDrafts();
    }
  }, [token, needsAuth]);

  const handleLogin = async () => {
    setError(null);
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      setError("Failed to sign in with Google. Make sure to allow popups in your browser.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setToken(null);
      setNeedsAuth(true);
      setDrafts([]);
      setStyleProfile(null);
      setSuggestions([]);
      setDraftBody("");
      setSelectedDraftId(null);
      localStorage.removeItem("gmail_style_profile");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Fetch drafts list
  const fetchDrafts = async () => {
    if (!token) return;
    setIsLoadingDrafts(true);
    setError(null);
    try {
      const res = await fetch("/api/drafts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const data = await res.json();
      setDrafts(data.drafts || []);
    } catch (err: any) {
      console.error("Fetch drafts failed:", err);
      setError("Failed to fetch Gmail drafts. Your login token might be expired. Try re-authenticating.");
    } finally {
      setIsLoadingDrafts(false);
    }
  };

  // Analyze style
  const handleAnalyzeStyle = async () => {
    if (!token) return;
    setIsAnalyzing(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/style/analyze", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setStyleProfile(data.styleProfile);
      localStorage.setItem("gmail_style_profile", JSON.stringify(data.styleProfile));
      setSuccessMsg("Linguistic writing style has been extracted successfully based on 25 sent emails!");
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error("Analyze style error:", err);
      setError(err.message || "Linguistic style analysis failed.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Suggest subject lines
  const handleSuggest = async () => {
    if (!draftBody.trim()) return;
    setIsSuggesting(true);
    setError(null);
    setSuccessMsg(null);

    // Fallback profile if style is not analyzed yet
    const profileToUse = styleProfile || {
      overallSummary: "Simple, highly professional tone focusing on clarity and straightforwardness.",
      averageLength: "Short to medium (3 to 6 words)",
      capitalizationStyle: "Sentence case",
      punctuationAndEmojis: "No punctuation or emojis",
      keyCharacteristics: ["Direct", "Polite", "Brief"],
      examples: [],
    };

    try {
      const res = await fetch("/api/subject/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftBody,
          styleProfile: profileToUse,
          context: customContext,
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setSuggestions(data.suggestions || []);
    } catch (err: any) {
      console.error("Suggest subjects failed:", err);
      setError(err.message || "Failed to generate suggestions.");
    } finally {
      setIsSuggesting(false);
    }
  };

  // Trigger apply (shows custom confirmation screen first)
  const handleApplySubject = (subject: string) => {
    setPendingSubject(subject);
    setIsConfirmOpen(true);
  };

  // Save/Update draft inside Gmail (runs ONLY after user confirms in the custom dialog)
  const executeSaveDraft = async () => {
    if (!token || !pendingSubject) return;
    setIsSavingDraft(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/drafts/save", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          draftId: selectedDraftId, // will create a new draft if null
          subject: pendingSubject,
          body: draftBody,
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      if (data.isNew) {
        setSuccessMsg(`Perfect! A brand new Gmail draft has been successfully created with subject: "${pendingSubject}"`);
      } else {
        setSuccessMsg(`Wonderful! Your existing Gmail draft has been successfully updated with the subject: "${pendingSubject}"`);
      }

      setIsConfirmOpen(false);
      setPendingSubject("");
      fetchDrafts(); // Reload list to see changes

      // Remove success notice after some seconds
      setTimeout(() => setSuccessMsg(null), 8000);
    } catch (err: any) {
      console.error("Save draft failed:", err);
      setError(err.message || "Error saving draft to Gmail.");
    } finally {
      setIsSavingDraft(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-900 font-sans flex flex-col antialiased">
      {/* Premium Dark Slate Header with Nav Items */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-[#0f172a] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-1 cursor-pointer">
              <span className="font-extrabold text-white text-[20px] tracking-tight font-sans">
                SubjectScribe
              </span>
              <span className="text-blue-500 font-extrabold text-[20px] tracking-tight">
                .AI
              </span>
              <span className="hidden sm:inline bg-slate-800 text-[9px] text-slate-300 px-2 py-0.5 rounded-md uppercase tracking-wider font-mono ml-3 border border-slate-700">
                Linguistic
              </span>
            </div>

            {/* Inactive navigational aids as requested in design layout */}
            <nav className="hidden md:flex items-center gap-8 text-[13px] font-semibold text-slate-450">
              <span className="text-white border-b-2 border-blue-500 pb-5 pt-5 cursor-pointer">Dashboard</span>
              <span className="hover:text-blue-400 cursor-pointer pb-5 pt-5 transition-colors">Writing Style</span>
              <span className="hover:text-blue-400 cursor-pointer pb-5 pt-5 transition-colors">Integrations</span>
              <span className="hover:text-blue-400 cursor-pointer pb-5 pt-5 transition-colors">Settings</span>
            </nav>
          </div>

          {/* User Section / Logout */}
          {!needsAuth && user && (
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <span className="text-xs font-semibold text-slate-100 block">
                  {user.displayName || "James Doe"}
                </span>
                <span className="text-[10px] text-slate-400 block font-mono">
                  {user.email}
                </span>
              </div>
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  referrerPolicy="no-referrer"
                  alt="Avatar"
                  className="w-8 h-8 rounded-full border border-blue-500 shadow-xs"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-600 border border-blue-500 flex items-center justify-center font-bold text-xs text-white">
                  {user.email.slice(0, 1).toUpperCase()}
                </div>
              )}
              <button
                onClick={handleLogout}
                className="p-1 px-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 flex items-center gap-1 transition-all text-xs cursor-pointer"
                title="Sign out"
                id="signout-btn"
              >
                <LogOut className="w-3 h-3" />
                <span className="hidden sm:inline font-medium">Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Workspace Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Success / Error Notification Bar */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-850 text-xs flex items-center gap-2.5"
              id="error-banner"
            >
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <div className="flex-1">{error}</div>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-850 text-xs flex items-center gap-2.5"
              id="success-banner"
            >
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <div className="flex-1 font-semibold">{successMsg}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Landing Page (Requires login) */}
        {needsAuth ? (
          <div className="max-w-xl mx-auto my-12 bg-white rounded-2xl border border-slate-300/80 p-10 shadow-sm text-center" id="landing-pane">
            <div className="w-16 h-16 rounded-2xl bg-blue-55 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto mb-6">
              <Sparkles className="w-8 h-8 fill-blue-500 text-blue-600" />
            </div>
            
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight leading-8">
              Write subjects in your personal voice.
            </h1>
            
            <p className="text-sm text-slate-500 mt-3 leading-relaxed">
              Log in securely with your Google Account. We'll analyze your recently sent email headers to understand your tone, emojis, and capitalization, and generate subject lines that match perfectly.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-4">
              <button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="gsi-material-button text-xs w-full max-w-sm rounded-xl py-3 border border-slate-300/80 bg-white hover:bg-slate-50 text-slate-700 font-semibold flex items-center justify-center gap-3 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                id="google-signin-btn"
              >
                <div className="gsi-material-button-icon flex-shrink-0">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block", width: "20px", height: "20px" }}>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span>{isLoggingIn ? "Signing you in..." : "Connect Google Account"}</span>
              </button>

              <div className="flex items-center gap-1.5 text-[10px] text-slate-450 font-mono text-center">
                <Lock className="w-3.5 h-3.5 text-slate-300" />
                <span>Authorized secure connection kept in sandbox memory</span>
              </div>
            </div>
          </div>
        ) : (
          /* Workspace Layout */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="workspace-layout">
            
            {/* Left Column (Style Analysis Profile) */}
            <div className="col-span-1 lg:col-span-5 space-y-6">
              
              <StyleProfileSection
                styleProfile={styleProfile}
                onAnalyze={handleAnalyzeStyle}
                isLoading={isAnalyzing}
                hasSentEmails={styleProfile !== null}
              />

              {/* Informative tips widget */}
              <div className="p-5 rounded-xl border border-blue-200 bg-blue-50/20 text-slate-700 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800 font-mono flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-blue-500" />
                  Pro Writing Tip
                </h3>
                <p className="text-xs text-slate-650 leading-relaxed">
                  Our executive model indicates that you typically prepend casual greetings with customer first names to maintain rapport. Match patterns above to preserve this signature.
                </p>
                <div className="pt-1 text-[10px] text-slate-400 font-mono">
                  Sync status: verified • 100% Secure
                </div>
              </div>
            </div>

            {/* Right Column (Mail Workspace, Suggestions) */}
            <div className="col-span-1 lg:col-span-7 space-y-6" id="mail-workspace-right">
              
              <DraftSelector
                drafts={drafts}
                selectedDraftId={selectedDraftId}
                onSelectDraft={setSelectedDraftId}
                isLoadingDrafts={isLoadingDrafts}
                onRefreshDrafts={fetchDrafts}
                draftBody={draftBody}
                onChangeDraftBody={setDraftBody}
                customContext={customContext}
                onChangeCustomContext={setCustomContext}
                onSuggest={handleSuggest}
                isSuggesting={isSuggesting}
                canSuggest={draftBody.trim().length > 0}
              />

              <SuggestionsList
                suggestions={suggestions}
                onApply={handleApplySubject}
                isLoading={isSuggesting}
                selectedDraftId={selectedDraftId}
              />
            </div>
          </div>
        )}
      </main>

      {/* Confirmation Safeguard Dialog before Gmail mutations */}
      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setPendingSubject("");
        }}
        onConfirm={executeSaveDraft}
        title={selectedDraftId ? "Update your Gmail Draft?" : "Save New Gmail Draft?"}
        description={
          selectedDraftId
            ? "You are about to modify your active Gmail Draft. This will overwrite its current subject line with your selected style recommendation. The draft content itself will remain intact."
            : "You are about to create a brand new draft message in your Gmail drafts folder using the recommended subject line and custom mail body."
        }
        details={{
          subject: pendingSubject,
          isNew: !selectedDraftId,
        }}
        isLoading={isSavingDraft}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200/60 py-6 bg-white text-center">
        <span className="text-[10px] text-slate-400 font-mono tracking-wider">
          SubjectScribe.AI • Sandbox Secured Workspace
        </span>
      </footer>
    </div>
  );
}
