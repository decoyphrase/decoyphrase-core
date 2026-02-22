"use client";

import React, { useState, useEffect, type ChangeEvent } from "react";
import { FileLock2 } from "lucide-react";

export const PERMANENT_STORAGE_DISCLAIMER_KEY =
  "decoyphrase_permanent_storage_accepted_v1";

interface DisclaimerModalProps {
  onAccept: () => void;
}

export default function DisclaimerModal({ onAccept }: DisclaimerModalProps) {
  const [isChecked, setIsChecked] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  useEffect(() => {
    const accepted = localStorage.getItem(PERMANENT_STORAGE_DISCLAIMER_KEY);
    if (!accepted) {
      const timer = setTimeout(() => setIsOpen(true), 0);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleConfirm = () => {
    if (!isChecked) return;
    localStorage.setItem(PERMANENT_STORAGE_DISCLAIMER_KEY, "true");
    setIsOpen(false);
    onAccept();
  };

  const handleCheckboxChange = (e: ChangeEvent<HTMLInputElement>) => {
    setIsChecked(e.target.checked);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-zinc-900 border border-zinc-700 shadow-2xl rounded-xl max-w-lg w-full flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300 max-h-[85vh]">
        <div className="bg-gradient-to-r from-red-900/40 to-orange-900/40 p-6 border-b border-zinc-800 flex items-center gap-4">
          <div className="bg-red-500/10 p-3 rounded-full border border-red-500/20">
            <FileLock2 size={32} className="text-red-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-100">
              Important Notice Before Uploading
            </h2>
            <p className="text-red-400 text-sm font-medium">
              Permanent Storage Warning
            </p>
          </div>
        </div>

        <div className="p-6 space-y-6 text-zinc-300 text-sm leading-relaxed overflow-y-auto flex-1 min-h-0">
          <ul className="list-disc pl-5 space-y-3 marker:text-zinc-500">
            <li>
              This Permanent Storage is intended only for storing your mapping
              file.
            </li>
            <li>
              Do not store any decoy text and its related mapping file together
              or in the same storage.
            </li>
            <li>
              Only upload plain text documents that do NOT contain any sensitive
              information, including seed phrases, private keys, passwords, or
              confidential data.
            </li>
            <li>
              Decoy Phrase is not responsible for any loss, exposure, or damage
              caused by user negligence, misuse, or failure to follow these
              guidelines.
            </li>
          </ul>

          <p className="text-zinc-400 border-t border-zinc-800 pt-4">
            By continuing, you acknowledge that you fully understand how
            Permanent Storage works and accept full responsibility for the files
            you upload.
          </p>
        </div>

        <div className="p-6 pt-2 bg-zinc-900/50">
          <label className="flex items-start gap-3 cursor-pointer group mb-6 select-none">
            <div className="relative flex items-center mt-0.5">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={isChecked}
                onChange={handleCheckboxChange}
              />
              <div className="w-5 h-5 border-2 border-zinc-600 rounded peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all"></div>
              <CheckIcon className="w-3.5 h-3.5 text-white absolute left-0.5 opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
            </div>
            <span className="text-zinc-400 group-hover:text-zinc-300 transition-colors text-sm font-medium">
              I have read, understood, and agree to the{" "}
              <a
                href="https://decoy-phrase.gitbook.io/documentation-decoy-phrase/legal/terms-of-service"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-400 underline underline-offset-2"
                onClick={(e) => e.stopPropagation()}
              >
                Terms of Service
              </a>
            </span>
          </label>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isChecked}
            className={`w-full py-3 rounded-lg font-bold text-sm transition-all duration-200
              ${
                isChecked
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              }
            `}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
