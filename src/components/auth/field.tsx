import type { InputHTMLAttributes } from "react";

export const buttonClass = "inline-flex min-h-11 items-center justify-center rounded-xl bg-action px-5 py-3 font-semibold text-white transition hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-60";
export function Field({ label, error, id, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return <div className="space-y-2">
    <label htmlFor={id} className="block text-sm font-medium">{label}</label>
    <input {...props} id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
      className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30" />
    {error && <p id={`${id}-error`} className="text-sm text-red-600 dark:text-red-400">{error}</p>}
  </div>;
}
