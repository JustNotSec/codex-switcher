import { useEffect, useMemo, useState } from "react";
import { isTauriRuntime, openExternalUrl } from "../lib/platform";
import type { AccountInfo, AccountWithUsage } from "../types";

interface MassAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: AccountWithUsage[];
  onStartOAuth: (name: string) => Promise<{ auth_url: string }>;
  onCompleteOAuth: () => Promise<AccountInfo>;
  onCancelOAuth: () => Promise<void>;
}

type Phase = "idle" | "awaiting" | "between" | "error" | "done";

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function MassAddModal({
  isOpen,
  onClose,
  accounts,
  onStartOAuth,
  onCompleteOAuth,
  onCancelOAuth,
}: MassAddModalProps) {
  const [prefix, setPrefix] = useState("Acc-");
  const [startNumber, setStartNumber] = useState(1);
  const [phase, setPhase] = useState<Phase>("idle");
  const [currentName, setCurrentName] = useState<string>("");
  const [authUrl, setAuthUrl] = useState<string>("");
  const [addedNames, setAddedNames] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [counter, setCounter] = useState(0);
  const [copied, setCopied] = useState(false);

  const tauriRuntime = isTauriRuntime();

  const detectedNextNumber = useMemo(() => {
    if (!prefix) return 1;
    const re = new RegExp(`^${escapeRegex(prefix)}(\\d+)$`);
    let max = 0;
    for (const a of accounts) {
      const m = a.name.match(re);
      if (m) {
        const n = parseInt(m[1], 10);
        if (Number.isFinite(n) && n > max) max = n;
      }
    }
    return max + 1;
  }, [prefix, accounts]);

  useEffect(() => {
    if (phase === "idle") {
      setStartNumber(detectedNextNumber);
    }
  }, [detectedNextNumber, phase]);

  const reset = () => {
    setPhase("idle");
    setCurrentName("");
    setAuthUrl("");
    setAddedNames([]);
    setErrorMessage(null);
    setCounter(0);
    setCopied(false);
  };

  const handleClose = async () => {
    if (phase === "awaiting") {
      try {
        await onCancelOAuth();
      } catch {
        // ignore
      }
    }
    reset();
    onClose();
  };

  const launchNumber = async (number: number) => {
    const name = `${prefix}${number}`;
    setCurrentName(name);
    setAuthUrl("");
    setErrorMessage(null);
    setCopied(false);
    setPhase("awaiting");

    try {
      const info = await onStartOAuth(name);
      setAuthUrl(info.auth_url);
      void openExternalUrl(info.auth_url);

      await onCompleteOAuth();
      setAddedNames((prev) => [...prev, name]);
      setCounter((c) => c + 1);
      setPhase("between");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      setPhase("error");
    }
  };

  const handleStart = async () => {
    if (!prefix.trim()) {
      setErrorMessage("Prefix tidak boleh kosong");
      return;
    }
    if (!Number.isFinite(startNumber) || startNumber < 0) {
      setErrorMessage("Start number tidak valid");
      return;
    }
    setAddedNames([]);
    setCounter(0);
    await launchNumber(startNumber);
  };

  const handleNext = async () => {
    await launchNumber(startNumber + counter);
  };

  const handleRetry = async () => {
    await launchNumber(startNumber + counter);
  };

  const handleSkip = () => {
    setCounter((c) => c + 1);
    setErrorMessage(null);
    setPhase("between");
  };

  const handleStop = async () => {
    if (phase === "awaiting") {
      try {
        await onCancelOAuth();
      } catch {
        // ignore
      }
    }
    setPhase("done");
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(authUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  if (!isOpen) return null;

  const nextNumber = startNumber + counter;
  const nextName = `${prefix}${nextNumber}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="animate-fade-slide-up mx-4 w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-5 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900">
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 11h-6M19 8v6" />
              </svg>
            </span>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Mass Add Accounts
            </h2>
          </div>
          <button
            onClick={() => void handleClose()}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            aria-label="Close"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {phase === "idle" && (
            <div className="space-y-4">
              <div className="grid grid-cols-[minmax(0,1fr)_100px] gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Prefix
                  </label>
                  <input
                    type="text"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    placeholder="Acc-"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-gray-500 dark:focus:ring-gray-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Start #
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={startNumber}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setStartNumber(Number.isFinite(v) ? v : 0);
                    }}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-mono tabular-nums text-gray-900 transition-colors focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-gray-500 dark:focus:ring-gray-500"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 dark:border-gray-800 dark:bg-gray-800/50">
                <div className="text-xs text-gray-500 dark:text-gray-400">Preview</div>
                <div className="mt-1 font-mono text-sm text-gray-800 dark:text-gray-200">
                  {prefix}
                  {startNumber}, {prefix}
                  {startNumber + 1}, {prefix}
                  {startNumber + 2}
                  <span className="text-gray-400 dark:text-gray-500"> …</span>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-amber-200/70 bg-amber-50/70 px-3 py-2.5 dark:border-amber-700/40 dark:bg-amber-900/20">
                <svg
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v5M12 17h.01" />
                </svg>
                <p className="text-[11px] leading-snug text-amber-900 dark:text-amber-200">
                  Logout dari ChatGPT atau buka link berikutnya di
                  incognito/profile lain — kalau tidak, semua link akan login
                  ke akun yang sama.
                </p>
              </div>

              {errorMessage && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200">
                  {errorMessage}
                </div>
              )}
            </div>
          )}

          {phase === "awaiting" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative flex h-9 w-9 items-center justify-center">
                  <div className="absolute inset-0 animate-ping rounded-full bg-sky-400/30 dark:bg-sky-500/30" />
                  <div className="relative h-2 w-2 rounded-full bg-sky-500 dark:bg-sky-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Waiting for login
                  </div>
                  <div className="truncate font-mono text-xs text-gray-500 dark:text-gray-400">
                    {currentName}
                  </div>
                </div>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 font-mono text-[11px] text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  #{counter + 1}
                </span>
              </div>

              {authUrl && (
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800">
                  <input
                    type="text"
                    readOnly
                    value={authUrl}
                    className="min-w-0 flex-1 truncate border-none bg-transparent text-xs text-gray-600 focus:outline-none dark:text-gray-300"
                  />
                  <button
                    onClick={() => void handleCopyUrl()}
                    className={`shrink-0 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                      copied
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                        : "bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                    }`}
                  >
                    {copied ? "✓" : "Copy"}
                  </button>
                  <button
                    onClick={() => void openExternalUrl(authUrl)}
                    className="shrink-0 rounded bg-gray-900 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
                  >
                    Open
                  </button>
                </div>
              )}

              {!tauriRuntime && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  OAuth callback redirect ke localhost — login harus selesai di
                  mesin yang sama.
                </p>
              )}

              {addedNames.length > 0 && (
                <div className="space-y-1 border-t border-gray-100 pt-3 dark:border-gray-800">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Sudah ditambahkan ({addedNames.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {addedNames.map((n) => (
                      <span
                        key={n}
                        className="rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-[11px] text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                      >
                        ✓ {n}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {phase === "between" && (
            <div className="space-y-4">
              {addedNames.length > 0 && (
                <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 dark:border-emerald-700/50 dark:bg-emerald-900/20">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <svg
                      className="h-3.5 w-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                      {addedNames[addedNames.length - 1]} berhasil ditambahkan
                    </div>
                    <div className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
                      Total: {addedNames.length} akun
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-800/50">
                <div className="text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Berikutnya
                </div>
                <div className="mt-0.5 font-mono text-base font-semibold text-gray-900 dark:text-gray-100">
                  {nextName}
                </div>
                <p className="mt-1 text-[11px] leading-snug text-gray-500 dark:text-gray-400">
                  Logout dari ChatGPT, atau klik tombol di bawah lalu paste URL
                  ke incognito/browser lain.
                </p>
              </div>

              {addedNames.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {addedNames.map((n) => (
                    <span
                      key={n}
                      className="rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-[11px] text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    >
                      ✓ {n}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {phase === "error" && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-700/50 dark:bg-red-900/20">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-red-900 dark:text-red-100">
                    {currentName} gagal
                  </div>
                  <div className="mt-0.5 break-words text-[11px] text-red-700 dark:text-red-300">
                    {errorMessage}
                  </div>
                </div>
              </div>

              {addedNames.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {addedNames.map((n) => (
                    <span
                      key={n}
                      className="rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-[11px] text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    >
                      ✓ {n}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {phase === "done" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                <div>
                  <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    Selesai
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {addedNames.length} akun ditambahkan
                  </div>
                </div>
              </div>

              {addedNames.length > 0 ? (
                <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800/50">
                  <div className="flex flex-wrap gap-1.5">
                    {addedNames.map((n) => (
                      <span
                        key={n}
                        className="rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-[11px] text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                      >
                        ✓ {n}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Tidak ada akun yang berhasil ditambahkan.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-gray-100 p-4 dark:border-gray-800">
          {phase === "idle" && (
            <>
              <button
                onClick={() => void handleClose()}
                className="flex-1 rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleStart()}
                disabled={!prefix.trim()}
                className="flex-1 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
              >
                Start
              </button>
            </>
          )}

          {phase === "awaiting" && (
            <button
              onClick={() => void handleStop()}
              className="w-full rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Cancel & Stop
            </button>
          )}

          {phase === "between" && (
            <>
              <button
                onClick={() => void handleStop()}
                className="flex-1 rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Stop
              </button>
              <button
                onClick={() => void handleNext()}
                className="flex-[2] rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
              >
                Open Next: {nextName} →
              </button>
            </>
          )}

          {phase === "error" && (
            <>
              <button
                onClick={() => void handleStop()}
                className="flex-1 rounded-lg bg-gray-100 px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Stop
              </button>
              <button
                onClick={() => handleSkip()}
                className="flex-1 rounded-lg bg-gray-100 px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Skip
              </button>
              <button
                onClick={() => void handleRetry()}
                className="flex-1 rounded-lg bg-gray-900 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
              >
                Retry
              </button>
            </>
          )}

          {phase === "done" && (
            <button
              onClick={() => void handleClose()}
              className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
