/** Centered circular loading spinner used by loading.tsx route fallbacks. */
export function PageSpinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
      <span className="size-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  )
}
