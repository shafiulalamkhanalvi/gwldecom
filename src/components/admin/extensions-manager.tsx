"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Puzzle, ChevronRight, Users } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"

type ExtensionRow = {
  id: string
  name: string
  description: string
  version: string
  developer: string
  apiVersion: string
  permissions: string[]
  enabled: boolean
  activeConnections: number
}

export function ExtensionsManager({ extensions }: { extensions: ExtensionRow[] }) {
  const [items, setItems] = useState(extensions)
  const [, startTransition] = useTransition()

  function toggleEnabled(id: string, enabled: boolean) {
    setItems((prev) => prev.map((e) => (e.id === id ? { ...e, enabled } : e)))
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/extensions/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled }),
        })
        if (!res.ok) throw new Error()
        toast.success(enabled ? "Extension enabled" : "Extension disabled — all its connections are now blocked")
      } catch {
        setItems((prev) => prev.map((e) => (e.id === id ? { ...e, enabled: !enabled } : e)))
        toast.error("Couldn't update extension")
      }
    })
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center text-sm text-muted-foreground">
          <Puzzle className="size-6" />
          No extensions registered yet.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((ext) => (
        <Card key={ext.id}>
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <Link href={`/admin/extensions/${ext.id}`} className="flex min-w-0 flex-1 items-start gap-3">
              <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Puzzle className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{ext.name}</span>
                  <Badge variant="secondary" className="text-xs">v{ext.version}</Badge>
                  <Badge variant="outline" className="text-xs">{ext.apiVersion}</Badge>
                  {!ext.enabled && <Badge variant="destructive" className="text-xs">Disabled</Badge>}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{ext.description}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>{ext.developer || "Unknown developer"}</span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="size-3.5" /> {ext.activeConnections} connected
                  </span>
                  <span>{ext.permissions.length} permission{ext.permissions.length === 1 ? "" : "s"}</span>
                </div>
              </div>
            </Link>
            <div className="flex shrink-0 items-center gap-4 self-end sm:self-center">
              <div className="flex items-center gap-2">
                <Switch checked={ext.enabled} onCheckedChange={(v) => toggleEnabled(ext.id, v)} aria-label={`Enable ${ext.name}`} />
                <span className="text-xs text-muted-foreground">{ext.enabled ? "Enabled" : "Disabled"}</span>
              </div>
              <Link href={`/admin/extensions/${ext.id}`} className="text-muted-foreground hover:text-foreground">
                <ChevronRight className="size-5" />
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
