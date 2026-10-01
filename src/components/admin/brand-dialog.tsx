"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { slugify } from "@/lib/utils"

export type BrandRow = {
  id: string
  name: string
  slug: string
  logoUrl: string | null
}

function BrandFormBody({
  brand,
  mode,
  onDone,
}: {
  brand?: BrandRow
  mode: "create" | "edit"
  onDone: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState(brand?.name ?? "")
  const [slug, setSlug] = useState(brand?.slug ?? "")
  const [slugTouched, setSlugTouched] = useState(mode === "edit")
  const [logoUrl, setLogoUrl] = useState(brand?.logoUrl ?? "")

  function onNameChange(v: string) {
    setName(v)
    if (!slugTouched) setSlug(slugify(v))
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return toast.error("Name is required")
    const payload = {
      name: name.trim(),
      slug: slug.trim() || slugify(name),
      logoUrl: logoUrl.trim() || null,
    }
    const url = mode === "create" ? "/api/admin/brands" : `/api/admin/brands/${brand?.id}`
    const method = mode === "create" ? "POST" : "PUT"

    startTransition(async () => {
      try {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast.error(data?.error ?? "Failed to save brand")
          return
        }
        toast.success(mode === "create" ? "Brand created" : "Brand updated")
        onDone()
        router.refresh()
      } catch {
        toast.error("Network error — please try again")
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="brand-name">Name *</Label>
        <Input id="brand-name" value={name} onChange={(e) => onNameChange(e.target.value)} placeholder="e.g. Samsung" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="brand-slug">Slug *</Label>
        <Input
          id="brand-slug"
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value)
            setSlugTouched(true)
          }}
          placeholder="auto-from-name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="brand-logo">Logo URL</Label>
        <Input id="brand-logo" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…/logo.png" />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : mode === "create" ? "Create" : "Save"}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function BrandDialog({
  mode,
  brand,
  trigger,
}: {
  mode: "create" | "edit"
  brand?: BrandRow
  trigger: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New brand" : "Edit brand"}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Add a brand to assign to products." : "Update the brand details."}
          </DialogDescription>
        </DialogHeader>
        <BrandFormBody brand={brand} mode={mode} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
