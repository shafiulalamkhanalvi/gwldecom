"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"

/**
 * Global navigation indicator: a thin progress bar across the top plus a
 * small circular spinner, shown the instant an internal link is clicked and
 * hidden once the destination route has rendered.
 *
 * Deliberately simple: no history.pushState patching (fragile — depends on
 * load order). It only listens for clicks on internal <a> links (which is
 * what next/link renders) and watches pathname/searchParams to know when
 * navigation finished. A safety timeout guarantees it can never get stuck.
 *
 * For programmatic navigation (router.push), call:
 *   window.dispatchEvent(new Event("toploader:start"))
 */
export function TopLoader() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const routeKey = `${pathname}?${searchParams?.toString() ?? ""}`

  const [active, setActive] = useState(false)
  const [progress, setProgress] = useState(0)
  const activeRef = useRef(false)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const safetyRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startedAtRef = useRef(0)
  const routeKeyRef = useRef(routeKey)

  useEffect(() => {
    function stop() {
      activeRef.current = false
      if (tickRef.current) clearInterval(tickRef.current)
      if (safetyRef.current) clearTimeout(safetyRef.current)
      tickRef.current = null
      safetyRef.current = null
      setProgress(100)
      setTimeout(() => {
        if (!activeRef.current) {
          setActive(false)
          setProgress(0)
        }
      }, 250)
    }

    function start() {
      if (activeRef.current) return
      activeRef.current = true
      startedAtRef.current = Date.now()
      setActive(true)
      setProgress(10)
      tickRef.current = setInterval(() => {
        setProgress((p) => (p >= 90 ? p : p + (90 - p) * 0.1))
      }, 150)
      safetyRef.current = setTimeout(stop, 15000) // never stay stuck
    }

    function onClick(e: MouseEvent) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const anchor = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null
      if (!anchor) return
      if ((anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return
      let url: URL
      try {
        url = new URL(anchor.href, window.location.href)
      } catch {
        return
      }
      if (url.origin !== window.location.origin) return
      if (url.pathname + url.search === window.location.pathname + window.location.search) return
      start()
    }

    // Route changed => navigation finished. Keep the indicator up for at
    // least 300ms so fast navigations don't just flicker.
    function onRouteChanged() {
      if (!activeRef.current) return
      const wait = Math.max(0, 300 - (Date.now() - startedAtRef.current))
      setTimeout(stop, wait)
    }

    ;(window as unknown as { __tlRouteChanged?: () => void }).__tlRouteChanged = onRouteChanged
    document.addEventListener("click", onClick, true)
    window.addEventListener("toploader:start", start)
    return () => {
      document.removeEventListener("click", onClick, true)
      window.removeEventListener("toploader:start", start)
      if (tickRef.current) clearInterval(tickRef.current)
      if (safetyRef.current) clearTimeout(safetyRef.current)
    }
  }, [])

  // Fires whenever the URL actually changes.
  useEffect(() => {
    if (routeKeyRef.current === routeKey) return
    routeKeyRef.current = routeKey
    ;(window as unknown as { __tlRouteChanged?: () => void }).__tlRouteChanged?.()
  }, [routeKey])

  if (!active) return null

  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[3px]">
        <div
          className="h-full bg-primary transition-[width] duration-200 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div
        aria-hidden
        className="pointer-events-none fixed right-4 top-4 z-[9999] flex size-10 items-center justify-center rounded-full bg-background shadow-lg ring-1 ring-border"
      >
        <span className="size-5 animate-spin rounded-full border-[3px] border-primary/25 border-t-primary" />
      </div>
    </>
  )
}
