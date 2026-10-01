"use client"
import { useState } from "react"
import { ChevronLeft, ChevronRight, Expand } from "lucide-react"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
export function ProductGallery({ images, title }: { images: { id: string; url: string; altText?: string | null }[]; title: string }) {
  const [active, setActive] = useState(0)
  const [zoom, setZoom] = useState(false)
  if (images.length === 0) return <div className="grid aspect-square place-items-center rounded-xl bg-muted text-muted-foreground">No image</div>
  const current = images[active]
  return (
    <div className="space-y-3">
      <Dialog open={zoom} onOpenChange={setZoom}>
        <div className="group relative aspect-square overflow-hidden rounded-xl border bg-muted">
          <img src={current.url} alt={current.altText || title} className="h-full w-full object-cover" />
          <DialogTrigger asChild><button className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-background/90 shadow backdrop-blur hover:bg-background" aria-label="Zoom"><Expand className="h-4 w-4" /></button></DialogTrigger>
          {images.length > 1 && (
            <>
              <button onClick={() => setActive((a) => (a - 1 + images.length) % images.length)} className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-background/90 shadow opacity-0 transition-opacity group-hover:opacity-100" aria-label="Previous"><ChevronLeft className="h-5 w-5" /></button>
              <button onClick={() => setActive((a) => (a + 1) % images.length)} className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-background/90 shadow opacity-0 transition-opacity group-hover:opacity-100" aria-label="Next"><ChevronRight className="h-5 w-5" /></button>
            </>
          )}
        </div>
        <DialogContent className="max-w-3xl"><img src={current.url} alt={current.altText || title} className="h-auto w-full rounded-lg" /></DialogContent>
      </Dialog>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {images.map((img, i) => (
            <button key={img.id} onClick={() => setActive(i)} className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${i === active ? "border-primary" : "border-transparent hover:border-muted-foreground/30"}`} aria-label={`View image ${i + 1}`}>
              <img src={img.url} alt={img.altText || title} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
