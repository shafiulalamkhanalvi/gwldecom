import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export function AdminPagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number
  totalPages: number
  buildHref: (p: number) => string
}) {
  if (totalPages <= 1) return null
  const pages = pageRange(page, totalPages)
  return (
    <nav className="mt-4 flex items-center justify-center gap-1" aria-label="Pagination">
      <Link
        href={buildHref(Math.max(1, page - 1))}
        aria-label="Previous page"
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-md border bg-background text-sm transition-colors hover:bg-accent",
          page === 1 && "pointer-events-none opacity-50"
        )}
      >
        <ChevronLeft className="size-4" />
      </Link>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`gap-${i}`} className="px-2 text-sm text-muted-foreground">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={buildHref(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(
              "inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-sm transition-colors",
              p === page
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background hover:bg-accent"
            )}
          >
            {p}
          </Link>
        )
      )}
      <Link
        href={buildHref(Math.min(totalPages, page + 1))}
        aria-label="Next page"
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-md border bg-background text-sm transition-colors hover:bg-accent",
          page === totalPages && "pointer-events-none opacity-50"
        )}
      >
        <ChevronRight className="size-4" />
      </Link>
    </nav>
  )
}

function pageRange(current: number, total: number): (number | "...")[] {
  const delta = 1
  const range: (number | "...")[] = []
  const left = Math.max(2, current - delta)
  const right = Math.min(total - 1, current + delta)
  range.push(1)
  if (left > 2) range.push("...")
  for (let p = left; p <= right; p++) range.push(p)
  if (right < total - 1) range.push("...")
  if (total > 1) range.push(total)
  return range
}
