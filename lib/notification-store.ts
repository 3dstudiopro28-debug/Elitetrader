// ─── Notification Store ───────────────────────────────────────────────────────
const NOTIF_KEY   = "et_notifications"
const NOTIF_EVENT = "et-notification-update"

export type NotifType = "info" | "success" | "warning" | "trade_open" | "trade_close" | "account"

export interface Notification {
  id: string
  type: NotifType
  title: string
  message: string
  read: boolean
  createdAt: string
}

function uid(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36)
}

function readAll(): Notification[] {
  if (typeof window === "undefined") return []
  try { return JSON.parse(localStorage.getItem(NOTIF_KEY) ?? "[]") } catch { return [] }
}

function writeAll(data: Notification[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(NOTIF_KEY, JSON.stringify(data.slice(0, 50)))
  window.dispatchEvent(new CustomEvent(NOTIF_EVENT))
}

export const notificationStore = {
  getAll(): Notification[] {
    return readAll()
  },

  getUnreadCount(): number {
    return readAll().filter(n => !n.read).length
  },

  add(type: NotifType, title: string, message: string): void {
    const notif: Notification = {
      id: uid(),
      type,
      title,
      message,
      read: false,
      createdAt: new Date().toISOString(),
    }
    const all = readAll()
    all.unshift(notif)
    writeAll(all)
  },

  markRead(id: string): void {
    writeAll(readAll().map(n => n.id === id ? { ...n, read: true } : n))
  },

  markAllRead(): void {
    writeAll(readAll().map(n => ({ ...n, read: true })))
  },

  clear(): void {
    writeAll([])
  },

  subscribe(cb: () => void): () => void {
    if (typeof window === "undefined") return () => {}
    window.addEventListener(NOTIF_EVENT, cb)
    return () => window.removeEventListener(NOTIF_EVENT, cb)
  },
}
