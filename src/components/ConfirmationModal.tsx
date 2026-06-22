import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, X, Check, ArrowRight } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  details?: {
    subject: string;
    isNew: boolean;
  };
  isLoading?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  details,
  isLoading = false,
}: ConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-neutral-900/60 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-xl border border-neutral-100"
          >
            <button
              onClick={onClose}
              disabled={isLoading}
              className="absolute top-4 right-4 p-1 text-neutral-400 hover:text-neutral-600 rounded-full transition-colors disabled:opacity-50"
              id="close-confirmation-modal-btn"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4" id="confirm-modal-content">
              <div className="flex-shrink-0 p-2 rounded-xl bg-amber-50 text-amber-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-neutral-900 leading-6">
                  {title}
                </h3>
                <p className="mt-2 text-sm text-neutral-500">
                  {description}
                </p>

                {details && (
                  <div className="mt-4 p-3.5 rounded-xl bg-neutral-50 border border-neutral-100 text-xs text-neutral-700 space-y-2">
                    <div className="flex items-center justify-between text-neutral-500 uppercase tracking-wider font-mono">
                      <span>Action Type</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${details.isNew ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {details.isNew ? "Create Custom Draft" : "Update Existing Draft"}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-neutral-500 block">Proposed Subject Line:</span>
                      <span className="font-semibold text-neutral-900 italic font-sans text-sm mt-0.5 block">
                        "{details.subject}"
                      </span>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex flex-col sm:flex-row-reverse gap-2">
                  <button
                    onClick={onConfirm}
                    disabled={isLoading}
                    className="w-full sm:w-auto px-4 py-2.5 bg-neutral-900 text-white text-sm font-medium rounded-xl hover:bg-neutral-800 transition-colors flex items-center justify-center gap-1.5 focus:outline-hidden disabled:bg-neutral-400 disabled:cursor-not-allowed"
                    id="confirm-action-modal-btn"
                  >
                    {isLoading ? (
                      <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>Confirm Action</span>
                  </button>
                  <button
                    onClick={onClose}
                    disabled={isLoading}
                    className="w-full sm:w-auto px-4 py-2.5 bg-white text-neutral-700 text-sm font-medium rounded-xl hover:bg-neutral-50 border border-neutral-200 transition-colors flex items-center justify-center focus:outline-hidden disabled:opacity-50"
                    id="cancel-action-modal-btn"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
