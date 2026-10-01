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
import type { CategoryOption } from "@/components/admin/product-form"

const STATUSES = [
  { value: "__all__", label: "All statuses" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
]

const STOCK = [
  { value: "__all__", label: "All stock" },
  { value: "low", label: "Low stock (≤ 10)" },
  { value: "out", label: "Out of stock" },
]

export function ProductsFilters({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(sp.toString())
      if (value === "__all__" || value === "") {
        params.delete(key)
      } else {
        params.set(key, value)
      }
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
          placeholder="Search by title, SKU or slug…"
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
      <Select value={sp.get("categoryId") ?? "__all__"} onValueChange={(v) => update("categoryId", v)}>
        <SelectTrigger className="w-full sm:w-52">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All categories</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.parentId ? "↳ " : ""}
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={sp.get("stock") ?? "__all__"} onValueChange={(v) => update("stock", v)}>
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STOCK.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
