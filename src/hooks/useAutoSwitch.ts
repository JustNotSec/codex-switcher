import { useEffect, useRef, useState } from "react";
import type { AccountWithUsage, CodexProcessInfo } from "../types";

export interface AutoSwitchSettings {
  enabled: boolean;
  thresholdPercent: number;
}

export interface UseAutoSwitchArgs {
  accounts: AccountWithUsage[];
  processInfo: CodexProcessInfo | null;
  settings: AutoSwitchSettings;
  switchAccount: (accountId: string) => Promise<void>;
  onToast: (message: string, isError?: boolean) => void;
}

const COOLDOWN_MS = 90_000;
const NO_CANDIDATE_REPEAT_MS = 5 * 60_000;

export function useAutoSwitch({
  accounts,
  processInfo,
  settings,
  switchAccount,
  onToast,
}: UseAutoSwitchArgs) {
  const { enabled, thresholdPercent } = settings;
  const [pendingTargetName, setPendingTargetName] = useState<string | null>(null);

  const lastAutoSwitchAtRef = useRef(0);
  const lastNoCandidateNotifyAtRef = useRef(0);
  const inFlightRef = useRef(false);

  const onToastRef = useRef(onToast);
  useEffect(() => {
    onToastRef.current = onToast;
  });

  useEffect(() => {
    if (!enabled) {
      setPendingTargetName(null);
      return;
    }
    if (inFlightRef.current) return;

    const now = Date.now();
    if (now - lastAutoSwitchAtRef.current < COOLDOWN_MS) return;

    const active = accounts.find((a) => a.is_active);
    if (!active) return;
    if (active.auth_mode === "api_key") return;

    const activePct = active.usage?.primary_used_percent;
    if (activePct == null) return;
    if (activePct < thresholdPercent) {
      setPendingTargetName(null);
      return;
    }

    const candidates = accounts
      .filter((a) => {
        if (a.id === active.id) return false;
        if (a.auth_mode === "api_key") return false;
        const pct = a.usage?.primary_used_percent;
        if (pct == null) return false;
        return pct < thresholdPercent;
      })
      .sort((a, b) => {
        const aPct = a.usage!.primary_used_percent as number;
        const bPct = b.usage!.primary_used_percent as number;
        return aPct - bPct;
      });

    if (candidates.length === 0) {
      if (now - lastNoCandidateNotifyAtRef.current > NO_CANDIDATE_REPEAT_MS) {
        lastNoCandidateNotifyAtRef.current = now;
        onToastRef.current(
          `Auto-switch: ${active.name} ${Math.round(activePct)}% — tidak ada akun lain di bawah ${thresholdPercent}%`,
          true
        );
      }
      setPendingTargetName(null);
      return;
    }

    const target = candidates[0];

    if (!processInfo?.can_switch) {
      setPendingTargetName(target.name);
      return;
    }

    inFlightRef.current = true;
    setPendingTargetName(null);
    const sourceName = active.name;
    const sourcePct = activePct;
    const targetId = target.id;
    const targetName = target.name;
    void (async () => {
      try {
        await switchAccount(targetId);
        lastAutoSwitchAtRef.current = Date.now();
        onToastRef.current(
          `Auto-switched: ${sourceName} (${Math.round(sourcePct)}%) → ${targetName}`
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        onToastRef.current(`Auto-switch failed: ${msg}`, true);
      } finally {
        inFlightRef.current = false;
      }
    })();
  }, [accounts, processInfo, enabled, thresholdPercent, switchAccount]);

  return { isPending: pendingTargetName !== null, pendingTargetName };
}
