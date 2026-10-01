"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

const ORDER_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
]

const PAYMENT_STATUSES = [
  { value: "unpaid", label: "Unpaid" },
  { value: "paid", label: "Paid" },
  { value: "refunded", label: "Refunded" },
]

export function OrderStatusManager({
  orderId,
  status,
  paymentStatus,
}: {
  orderId: string
  status: string
  paymentStatus: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [nextStatus, setNextStatus] = useState(status)
  const [nextPayment, setNextPayment] = useState(paymentStatus)

  const dirty = nextStatus !== status || nextPayment !== paymentStatus

  function onSave() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/orders/${orderId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus, paymentStatus: nextPayment }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast.error(data?.error ?? "Failed to update order")
          return
        }
        toast.success("Order updated")
        router.refresh()
      } catch {
        toast.error("Network error — please try again")
      }
    })
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="order-status">Order status</Label>
        <Select value={nextStatus} onValueChange={setNextStatus}>
          <SelectTrigger id="order-status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="payment-status">Payment status</Label>
        <Select value={nextPayment} onValueChange={setNextPayment}>
          <SelectTrigger id="payment-status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="sm:col-span-2">
        <Button onClick={onSave} disabled={!dirty || pending} className="w-full sm:w-auto">
          <Save className="size-4" />
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  )
}
