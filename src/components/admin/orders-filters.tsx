"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const STATUSES = [
  { value: "__all__", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
]

const PAYMENT = [
  { value: "__all__", label: "All payments" },
  { value: "unpaid", label: "Unpaid" },
  { value: "paid", label: "Paid" },
  { value: "refunded", label: "Refunded" },
]

export function OrdersFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(sp.toString())
      if (value === "__all__" || value === "") params.delete(key)
      else params.set(key, value)
      params.delete("page")
      router.push(`${pathname}?${params.toString()}`)
    },
    [sp, pathname, router]
  )

  const onSearch = (value: string) => {
    const params = new URLSearchParams(sp.toString())
    if (value) params.set("search", value)
    else params.delete("search")
    params.delete("page")
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          defaultValue={sp.get("search") ?? ""}
          placeholder="Search by order ID, customer name or email…"
          className="pl-9"
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      <Select value={sp.get("status") ?? "__all__"} onValueChange={(v) => update("status", v)}>
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={sp.get("paymentStatus") ?? "__all__"} onValueChange={(v) => update("paymentStatus", v)}>
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PAYMENT.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
