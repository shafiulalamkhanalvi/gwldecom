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

const ENTITY_TYPES = [
  { value: "__all__", label: "All types" },
  { value: "Product", label: "Product" },
  { value: "Category", label: "Category" },
  { value: "Brand", label: "Brand" },
  { value: "Order", label: "Order" },
  { value: "Review", label: "Review" },
  { value: "User", label: "User" },
]

export function AuditFilters() {
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
          placeholder="Search by action or entity ID…"
          className="pl-9"
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      <Select value={sp.get("entityType") ?? "__all__"} onValueChange={(v) => update("entityType", v)}>
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ENTITY_TYPES.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
