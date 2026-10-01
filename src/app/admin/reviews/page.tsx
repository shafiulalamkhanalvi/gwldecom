import Link from "next/link"
import { db } from "@/lib/db"
import { formatDateTime, cn } from "@/lib/utils"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { AdminDeleteButton } from "@/components/admin/admin-delete-button"
import { Card, CardContent } from "@/components/ui/card"
import { Star } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const dynamic = "force-dynamic"

export default async function AdminReviewsPage() {
  const reviews = await db.review.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      product: { select: { id: true, title: true, slug: true } },
      user: { select: { id: true, fullName: true, email: true } },
    },
  })

  return (
    <div>
      <AdminPageHeader
        title="Reviews"
        description={`${reviews.length} customer review${reviews.length === 1 ? "" : "s"} to moderate.`}
      />
      <Card>
        <CardContent className="p-0">
          {reviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-sm text-muted-foreground">
              <Star className="size-6" />
              No reviews yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="pl-6">Product</TableHead>
                  <TableHead>Reviewer</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead className="min-w-[240px]">Comment</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="pl-6">
                      {r.product ? (
                        <Link href={`/admin/products/${r.product.id}`} className="line-clamp-2 text-sm font-medium hover:underline">
                          {r.product.title}
                        </Link>
                      ) : (
                        <span className="text-sm text-muted-foreground">Deleted product</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{r.user?.fullName ?? "—"}</span>
                        <span className="text-xs text-muted-foreground">{r.user?.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn("size-3.5", i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")}
                          />
                        ))}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[320px]">
                      <div className="space-y-0.5">
                        {r.title ? <p className="text-sm font-medium">{r.title}</p> : null}
                        {r.body ? <p className="line-clamp-2 text-xs text-muted-foreground">{r.body}</p> : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</TableCell>
                    <TableCell className="pr-6">
                      <div className="flex justify-end">
                        <AdminDeleteButton
                          apiPath={`/api/admin/reviews/${r.id}`}
                          description="Permanently delete this review?"
                          size="icon"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
