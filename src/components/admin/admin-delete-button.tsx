"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export function AdminDeleteButton({
  apiPath,
  label = "Delete",
  description = "This action cannot be undone.",
  onSuccess,
  size = "icon",
  variant = "ghost",
}: {
  apiPath: string
  label?: string
  description?: string
  onSuccess?: (res: { archived?: boolean; reason?: string; deleted?: boolean }) => void
  size?: "default" | "sm" | "icon"
  variant?: "default" | "outline" | "ghost" | "destructive"
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  function doDelete() {
    startTransition(async () => {
      try {
        const res = await fetch(apiPath, { method: "DELETE" })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast.error(data?.error ?? "Failed to delete")
          return
        }
        if (data?.archived) {
          toast.success(data?.reason ?? "Item archived (referenced by orders).")
        } else {
          toast.success("Deleted successfully")
        }
        setOpen(false)
        onSuccess?.(data)
        router.refresh()
      } catch {
        toast.error("Network error — please try again")
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size={size} aria-label={label} disabled={pending}>
          <Trash2 className={size === "icon" ? "size-4 text-destructive" : "size-4"} />
          {size === "icon" ? null : label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={doDelete}
            disabled={pending}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {pending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
