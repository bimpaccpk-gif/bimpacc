"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Bell, CheckCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { Notification } from "@/app/actions/notifications"
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/app/actions/notifications"

/** Poll interval for new notifications while any chrome is mounted. */
const POLL_INTERVAL_MS = 30_000

/** Panel shows the most recent notifications only. */
const MAX_VISIBLE_NOTIFICATIONS = 15

const typeDotColor: Record<Notification["type"], string> = {
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-destructive",
}

export interface NotificationBellProps {
  notifications: Notification[]
}

export function NotificationBell({ notifications }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notification[]>(notifications)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Server-passed data wins whenever the layout refetches (e.g. navigation).
  useEffect(() => {
    setItems(notifications)
  }, [notifications])

  const refresh = useCallback(async () => {
    const { data, error } = await getUserNotifications()
    if (error || !data || !isMountedRef.current) return
    setItems(data.notifications)
  }, [])

  // Background poll so the badge stays fresh without a page reload.
  useEffect(() => {
    const intervalId = setInterval(() => {
      void refresh()
    }, POLL_INTERVAL_MS)
    return () => clearInterval(intervalId)
  }, [refresh])

  async function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen) await refresh()
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
    const { error } = await markAllNotificationsRead()
    if (error) return
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })
  }

  const unreadCount = items.filter((n) => !n.is_read).length

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        aria-label={`${unreadCount} unread notifications`}
        className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-expanded:bg-muted aria-expanded:text-foreground"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-80 overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-medium">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="xs"
              onClick={handleMarkAllRead}
              className="text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="mr-1 size-3" />
              Mark all read
            </Button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <Bell className="text-muted-foreground/50 size-8" />
              <p className="text-muted-foreground text-sm">No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-foreground/5">
              {items.slice(0, MAX_VISIBLE_NOTIFICATIONS).map((n) => (
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
                      <p className="truncate text-sm leading-snug font-medium">
                        {n.title}
                      </p>
                      <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                        {n.message}
                      </p>
                      <p className="text-muted-foreground mt-1 text-[11px]">
                        {formatDate(n.created_at)}
                      </p>
                    </div>
                  </div>
                  {!n.is_read && (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => handleMarkRead(n.id)}
                      className="text-muted-foreground hover:text-foreground mt-1 text-[11px]"
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
