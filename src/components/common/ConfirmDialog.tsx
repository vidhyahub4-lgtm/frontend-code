import { useEffect, useRef, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

type Tone = "danger" | "slate" | "success" | "neutral";

const TONE_CLASSES: Record<Tone, string> = {
  danger: "bg-red-500 text-white hover:bg-red-600",
  slate: "bg-slate-600 text-white hover:bg-slate-700",
  success: "bg-emerald-600 text-white hover:bg-emerald-700",
  neutral: "bg-marigold text-chalkboard hover:bg-marigold-dark",
};

interface ConfirmDialogProps {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  tone?: Tone;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Small themed confirmation modal. Esc or a click on the backdrop cancels. */
export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  tone = "neutral",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center" role="presentation">
      <div className="absolute inset-0 bg-chalkboard/60" onClick={busy ? undefined : onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="relative w-full max-w-md rounded-lg border border-line bg-white p-5 shadow-xl animate-rise motion-reduce:animate-none"
      >
        <h2 id="confirm-title" className="font-display text-xl text-ink">{title}</h2>
        <div className="mt-3 space-y-2 text-sm text-ink-soft">{children}</div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-md border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:bg-chalk disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-marigold-dark focus-visible:ring-offset-2 disabled:opacity-60 ${TONE_CLASSES[tone]}`}
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
