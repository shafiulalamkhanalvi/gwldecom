import dns from "dns/promises"
import net from "net"

/**
 * Blocks the server from being tricked into fetching internal/private
 * network resources on an extension's behalf (SSRF). Used before any
 * server-side `fetch()` of a URL supplied by an extension — currently
 * product image URLs.
 */

const BLOCKED_HOSTNAMES = new Set(["localhost", "0.0.0.0"])

// IPv4 ranges that must never be reachable from a URL an extension supplies.
const PRIVATE_V4_RANGES: [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local (incl. cloud metadata endpoints)
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved
]

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0
}

function isIpv4InRange(ip: string, base: string, prefix: number): boolean {
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask)
}

function isBlockedIpv4(ip: string): boolean {
  return PRIVATE_V4_RANGES.some(([base, prefix]) => isIpv4InRange(ip, base, prefix))
}

function isBlockedIpv6(ip: string): boolean {
  const lower = ip.toLowerCase()
  return (
    lower === "::1" || // loopback
    lower === "::" ||
    lower.startsWith("fc") || // unique local fc00::/7
    lower.startsWith("fd") ||
    lower.startsWith("fe80") // link-local
  )
}

export type SsrfCheckResult = { safe: true; resolvedIp: string } | { safe: false; reason: string }

/**
 * Validates a URL is http(s), points at a public hostname, and resolves to
 * a public IP address — then returns the resolved IP so the caller can
 * (optionally) connect directly to that IP rather than re-resolving DNS at
 * fetch time, which would reopen a DNS-rebinding window.
 */
export async function checkUrlIsSafeToFetch(rawUrl: string): Promise<SsrfCheckResult> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return { safe: false, reason: "Not a valid URL" }
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { safe: false, reason: "Only http(s) URLs are allowed" }
  }
  if (url.username || url.password) {
    return { safe: false, reason: "URLs with embedded credentials are not allowed" }
  }
  const hostname = url.hostname.toLowerCase()
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { safe: false, reason: "Requests to local hosts are not allowed" }
  }

  // A literal IP in the URL — validate directly, no DNS involved.
  if (net.isIP(hostname)) {
    if (net.isIP(hostname) === 4 && isBlockedIpv4(hostname)) return { safe: false, reason: "Private/internal address blocked" }
    if (net.isIP(hostname) === 6 && isBlockedIpv6(hostname)) return { safe: false, reason: "Private/internal address blocked" }
    return { safe: true, resolvedIp: hostname }
  }

  let addresses: { address: string; family: number }[]
  try {
    addresses = await dns.lookup(hostname, { all: true })
  } catch {
    return { safe: false, reason: "Could not resolve hostname" }
  }
  if (!addresses.length) return { safe: false, reason: "Hostname did not resolve" }

  for (const { address, family } of addresses) {
    if (family === 4 && isBlockedIpv4(address)) return { safe: false, reason: "Domain resolves to a private/internal address" }
    if (family === 6 && isBlockedIpv6(address)) return { safe: false, reason: "Domain resolves to a private/internal address" }
  }

  return { safe: true, resolvedIp: addresses[0].address }
}
