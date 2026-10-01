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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { slugify } from "@/lib/utils"

export type CategoryNode = {
  id: string
  name: string
  slug: string
  parentId: string | null
  imageUrl: string | null
}

function CategoryFormBody({
  category,
  categories,
  mode,
  onDone,
}: {
  category?: CategoryNode
  categories: CategoryNode[]
  mode: "create" | "edit"
  onDone: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState(category?.name ?? "")
  const [slug, setSlug] = useState(category?.slug ?? "")
  const [slugTouched, setSlugTouched] = useState(mode === "edit")
  const [parentId, setParentId] = useState<string>(category?.parentId ?? "__none__")
  const [imageUrl, setImageUrl] = useState(category?.imageUrl ?? "")

  function onNameChange(v: string) {
    setName(v)
    if (!slugTouched) setSlug(slugify(v))
  }

  // exclude self + descendants from parent options
  const forbidden = new Set<string>()
  if (mode === "edit" && category) {
    forbidden.add(category.id)
    let changed = true
    while (changed) {
      changed = false
      for (const c of categories) {
        if (c.parentId && forbidden.has(c.parentId) && !forbidden.has(c.id)) {
          forbidden.add(c.id)
          changed = true
        }
      }
    }
  }
  const parentOptions = categories.filter((c) => !forbidden.has(c.id))

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return toast.error("Name is required")
    const payload = {
      name: name.trim(),
      slug: slug.trim() || slugify(name),
      parentId: parentId === "__none__" ? null : parentId,
      imageUrl: imageUrl.trim() || null,
    }
    const url = mode === "create" ? "/api/admin/categories" : `/api/admin/categories/${category?.id}`
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
          toast.error(data?.error ?? "Failed to save category")
          return
        }
        toast.success(mode === "create" ? "Category created" : "Category updated")
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
        <Label htmlFor="cat-name">Name *</Label>
        <Input id="cat-name" value={name} onChange={(e) => onNameChange(e.target.value)} placeholder="e.g. Smartphones" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cat-slug">Slug *</Label>
        <Input
          id="cat-slug"
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value)
            setSlugTouched(true)
          }}
          placeholder="auto-from-name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cat-parent">Parent category</Label>
        <Select value={parentId} onValueChange={setParentId}>
          <SelectTrigger id="cat-parent" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— Top level —</SelectItem>
            {parentOptions.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="cat-image">Image URL</Label>
        <Input id="cat-image" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…/category.jpg" />
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

export function CategoryDialog({
  mode,
  category,
  categories,
  trigger,
}: {
  mode: "create" | "edit"
  category?: CategoryNode
  categories: CategoryNode[]
  trigger: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New category" : "Edit category"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a category or sub-category to organise products."
              : "Update the category details."}
          </DialogDescription>
        </DialogHeader>
        <CategoryFormBody
          category={category}
          categories={categories}
          mode={mode}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
