"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Copy, KeyRound, ShieldOff, RefreshCw, CheckCircle2, XCircle, Link2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { SCOPE_LABELS, type ExtensionScope } from "@/lib/extensions/scopes"
import { formatDateTime } from "@/lib/utils"

type Extension = {
  id: string
  name: string
  version: string
  developer: string
  apiVersion: string
  permissions: string[]
  allowedOrigins: string[]
  enabled: boolean
}
type Connection = {
  id: string
  user: { id: string; fullName: string | null; email: string }
  permissions: string[]
  status: string
  connectedAt: string
  lastActivityAt: string | null
  tokenPrefix: string | null
  tokenExpiresAt: string | null
}
type Activity = {
  id: string
  action: string
  status: string
  errorCode: string | null
  sourceUrl: string | null
  productId: string | null
  createdAt: string
}

function scopeLabel(scope: string): string {
  return SCOPE_LABELS[scope as ExtensionScope] ?? scope
}

export function ExtensionDetail({
  extension,
  connections: initialConnections,
  activity,
  myConnectionId,
}: {
  extension: Extension
  connections: Connection[]
  activity: Activity[]
  myConnectionId: string | null
}) {
  const [connections, setConnections] = useState(initialConnections)
  const [isPending, startTransition] = useTransition()
  const [issuedToken, setIssuedToken] = useState<{ token: string; expiresAt: string } | null>(null)

  function connect() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/extensions/${extension.id}/connect`, { method: "POST" })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || "Failed to connect")
        setIssuedToken({ token: json.token, expiresAt: json.expiresAt })
        toast.success("Extension connected")
        location.reload()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Couldn't connect extension")
      }
    })
  }

  function revoke(connectionId: string) {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/extensions/connections/${connectionId}/revoke`, { method: "POST" })
        if (!res.ok) throw new Error()
        setConnections((prev) => prev.map((c) => (c.id === connectionId ? { ...c, status: "revoked" } : c)))
        toast.success("Access revoked")
      } catch {
        toast.error("Couldn't revoke access")
      }
    })
  }

  function rotate(connectionId: string) {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/extensions/connections/${connectionId}/rotate`, { method: "POST" })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || "Failed to rotate")
        setIssuedToken({ token: json.token, expiresAt: json.expiresAt })
        toast.success("Token rotated — the old token no longer works")
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Couldn't rotate token")
      }
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="secondary">v{extension.version}</Badge>
            <Badge variant="outline">{extension.apiVersion}</Badge>
            <Badge variant={extension.enabled ? "default" : "destructive"}>{extension.enabled ? "Enabled" : "Disabled"}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Developer: {extension.developer || "Unknown"}</p>
          <div>
            <p className="mb-2 text-sm font-medium">Requested permissions</p>
            <div className="flex flex-wrap gap-1.5">
              {extension.permissions.map((p) => (
                <Badge key={p} variant="outline" className="text-xs font-normal">
                  {scopeLabel(p)}
                </Badge>
              ))}
            </div>
          </div>
          {!myConnectionId && (
            <Button onClick={connect} disabled={isPending || !extension.enabled}>
              <Link2 className="size-4" /> Connect this extension
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connected users</CardTitle>
          <CardDescription>Everyone who has authorized this extension, and what it can do.</CardDescription>
        </CardHeader>
        <CardContent>
          {connections.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No one has connected this extension yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Connected</TableHead>
                  <TableHead>Last activity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {connections.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">{c.user.fullName || c.user.email}</div>
                      <div className="text-xs text-muted-foreground">{c.user.email}</div>
                    </TableCell>
                    <TableCell className="max-w-[220px] text-xs text-muted-foreground">{c.permissions.map(scopeLabel).join(", ")}</TableCell>
                    <TableCell className="text-sm">{formatDateTime(c.connectedAt)}</TableCell>
                    <TableCell className="text-sm">{c.lastActivityAt ? formatDateTime(c.lastActivityAt) : "Never"}</TableCell>
                    <TableCell>
                      {c.status === "active" ? (
                        <Badge variant="default" className="gap-1"><CheckCircle2 className="size-3" /> Active</Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1"><XCircle className="size-3" /> Revoked</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{c.tokenPrefix ? `${c.tokenPrefix}…` : "—"}</TableCell>
                    <TableCell className="text-right">
                      {c.status === "active" && (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => rotate(c.id)} disabled={isPending}>
                            <RefreshCw className="size-3.5" /> Rotate
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
                                <ShieldOff className="size-3.5" /> Revoke
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Revoke access?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {c.user.fullName || c.user.email} will immediately lose API access for this extension. This cannot be undone —
                                  reconnecting issues a new token.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => revoke(c.id)}>Revoke access</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
          <CardDescription>Import jobs and API actions from this extension, most recent first.</CardDescription>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source URL</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activity.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{a.action}</TableCell>
                    <TableCell>
                      {a.status === "success" ? (
                        <Badge variant="default" className="gap-1"><CheckCircle2 className="size-3" /> Success</Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1" title={a.errorCode ?? undefined}><XCircle className="size-3" /> {a.errorCode ?? "Error"}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[280px] truncate text-xs text-muted-foreground">{a.sourceUrl ?? "—"}</TableCell>
                    <TableCell className="text-sm">{formatDateTime(a.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!issuedToken} onOpenChange={(open) => !open && setIssuedToken(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="size-4" /> Copy this token now</DialogTitle>
            <DialogDescription>
              This is the only time the full token is shown. Paste it into the extension&apos;s settings. It expires{" "}
              {issuedToken ? formatDateTime(issuedToken.expiresAt) : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3">
            <code className="flex-1 overflow-x-auto whitespace-nowrap text-xs">{issuedToken?.token}</code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (issuedToken) {
                  navigator.clipboard.writeText(issuedToken.token)
                  toast.success("Copied")
                }
              }}
            >
              <Copy className="size-3.5" /> Copy
            </Button>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIssuedToken(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
