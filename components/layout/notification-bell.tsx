"use client"

import { useState, useRef, useEffect } from "react"
import { Bell, CheckCheck, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Notification } from "@/app/actions/notifications"
import { markNotificationRead, markAllNotificationsRead } from "@/app/actions/notifications"

const typeDotColor: Record<string, string> = {
  info: "bg-blue-500",
  success: "bg-green-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
}

export interface NotificationBellProps {
  notifications: Notification[]
}

export function NotificationBell({ notifications }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notification[]>(notifications)

  const unreadCount = items.filter((n) => !n.is_read).length

  async function handleToggle() {
    setOpen((v) => !v)
  }

  async function handleMarkRead(notificationId: string) {
    const { error } = await markNotificationRead(notificationId)
    if (error) return
    setItems((prev) =>
      prev.map((n) =>
        n.id === notificationId ? { ...n, is_read: true } : n
      )
    )
  }

  async function handleMarkAllRead() {
    const { data: count, error } = await markAllNotificationsRead()
    if (error) return
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`${unreadCount} unread notifications`}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-foreground/10 bg-popover text-popover-foreground shadow-xl">
            <div className="flex items-center justify-between border-b border-foreground/10 px-3 py-2">
              <span className="text-sm font-medium">Notifications</span>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handleMarkAllRead}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <CheckCheck className="mr-1 h-3 w-3" />
                  Mark all read
                </Button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                  <Bell className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-foreground/5">
                  {items.slice(0, 10).map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        "relative px-3 py-2.5 text-sm transition-colors",
                        !n.is_read && "bg-muted/50"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={cn(
                            "mt-1 h-2 w-2 shrink-0 rounded-full",
                            typeDotColor[n.type]
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-sm leading-snug">
                            {n.title}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {n.message}
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {formatDate(n.created_at)}
                          </p>
                        </div>
                      </div>
                      {!n.is_read && (
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleMarkRead(n.id)}
                          className="mt-1 text-[11px] text-muted-foreground hover:text-foreground"
                        >
                          Mark read
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
