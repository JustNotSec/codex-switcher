interface AutoSwitchSettingsProps {
  enabled: boolean;
  thresholdPercent: number;
  onChange: (next: { enabled: boolean; thresholdPercent: number }) => void;
}

export function AutoSwitchSettings({
  enabled,
  thresholdPercent,
  onChange,
}: AutoSwitchSettingsProps) {
  const sliderProgress = ((thresholdPercent - 50) / (99 - 50)) * 100;

  return (
    <div className="mt-1 border-t border-gray-200 px-3 pb-2 pt-3 dark:border-neutral-800">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
              enabled
                ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                : "bg-gray-100 text-gray-500 dark:bg-neutral-900 dark:text-gray-400"
            }`}
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M13 2 4 13h7l-1 9 9-11h-7z" />
            </svg>
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Auto-switch
            </div>
            <div className="truncate text-[11px] text-gray-500 dark:text-gray-400">
              Pindah saat akun mendekati limit
            </div>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Toggle auto-switch"
          onClick={() => onChange({ enabled: !enabled, thresholdPercent })}
          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-1 dark:focus-visible:ring-gray-500 ${
            enabled
              ? "bg-gray-900 dark:bg-gray-100"
              : "bg-gray-300 dark:bg-neutral-700"
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 dark:bg-gray-900 ${
              enabled ? "translate-x-[18px]" : "translate-x-[3px]"
            }`}
          />
        </button>
      </div>

      <div
        className={`mt-3 transition-opacity duration-200 ${
          enabled ? "opacity-100" : "pointer-events-none opacity-40"
        }`}
      >
        <div className="mb-1.5 flex items-center justify-between text-[11px]">
          <span className="font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Threshold
          </span>
          <span className="font-mono text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
            {thresholdPercent}
            <span className="text-gray-400 dark:text-gray-500">%</span>
          </span>
        </div>
        <input
          type="range"
          min={50}
          max={99}
          step={1}
          value={thresholdPercent}
          disabled={!enabled}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (!Number.isFinite(v)) return;
            onChange({ enabled, thresholdPercent: v });
          }}
          className="switcher-slider"
          style={
            {
              "--slider-progress": `${sliderProgress}%`,
            } as React.CSSProperties
          }
        />
        <div className="mt-1 flex justify-between text-[10px] text-gray-400 dark:text-gray-600">
          <span>50%</span>
          <span>99%</span>
        </div>
      </div>
    </div>
  );
}
