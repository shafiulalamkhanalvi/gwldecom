"use client"
import Link from "next/link"
import { useEffect, useState, useCallback } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
export type Slide = { id: string; title: string; imageUrl: string; linkUrl: string }
export function HeroCarousel({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0)
  const n = slides.length
  const go = useCallback((d: number) => setI((p) => (p + d + n) % n), [n])
  useEffect(() => { if (n <= 1) return; const t = setInterval(() => setI((p) => (p + 1) % n), 5000); return () => clearInterval(t) }, [n])
  if (n === 0) return null
  return (
    <div className="relative overflow-hidden rounded-2xl bg-muted">
      <div className="flex transition-transform duration-700 ease-out" style={{ transform: `translateX(-${i * 100}%)` }}>
        {slides.map((s) => (
          <div key={s.id} className="relative min-w-full">
            <Link href={s.linkUrl} className="block">
              <img src={s.imageUrl} alt={s.title} className="h-[220px] w-full object-cover sm:h-[340px] md:h-[420px]" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
              <div className="absolute inset-0 flex items-center"><div className="max-w-md px-6 text-white sm:px-10"><span className="inline-block rounded-full bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-wide">Featured</span><h2 className="mt-3 text-2xl font-extrabold leading-tight drop-shadow sm:text-4xl">{s.title}</h2></div></div>
            </Link>
          </div>
        ))}
      </div>
      {n > 1 && (
        <>
          <button onClick={() => go(-1)} className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/80 shadow hover:bg-white" aria-label="Previous"><ChevronLeft className="h-5 w-5" /></button>
          <button onClick={() => go(1)} className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/80 shadow hover:bg-white" aria-label="Next"><ChevronRight className="h-5 w-5" /></button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">{slides.map((_, idx) => <button key={idx} onClick={() => setI(idx)} className={`h-1.5 rounded-full transition-all ${idx === i ? "w-6 bg-white" : "w-1.5 bg-white/50"}`} />)}</div>
        </>
      )}
    </div>
  )
}
