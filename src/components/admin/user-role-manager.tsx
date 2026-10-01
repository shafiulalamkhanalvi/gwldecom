"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Staff" },
  { value: "customer", label: "Customer" },
]

const roleStyle: Record<string, string> = {
  admin: "bg-primary/10 text-primary",
  staff: "bg-violet-100 text-violet-800",
  customer: "bg-muted text-muted-foreground",
}

export function UserRoleManager({
  userId,
  role,
  isSelf,
}: {
  userId: string
  role: string
  isSelf: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [current, setCurrent] = useState(role)

  function onChange(next: string) {
    if (next === current) return
    if (isSelf && next !== "admin") {
      toast.error("You cannot change your own role.")
      return
    }
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/users/${userId}/role`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: next }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast.error(data?.error ?? "Failed to update role")
          return
        }
        setCurrent(next)
        toast.success(`Role updated to ${next}`)
        router.refresh()
      } catch {
        toast.error("Network error — please try again")
      }
    })
  }

  return (
    <Select value={current} onValueChange={onChange} disabled={pending || isSelf}>
      <SelectTrigger className={("h-8 w-32 border-transparent text-xs capitalize " + (roleStyle[current] ?? ""))}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((r) => (
          <SelectItem key={r.value} value={r.value} className="capitalize">
            {r.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
