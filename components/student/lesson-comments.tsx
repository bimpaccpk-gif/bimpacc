"use client"

import { useState } from "react"
import { Send, Edit2, Trash2, MoreHorizontal, Reply } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  createLessonComment,
  updateLessonComment,
  deleteLessonComment,
  type LessonComment,
} from "@/app/actions/lesson-comments"

export interface LessonCommentsProps {
  lessonId: string
  userId: string
  comments: LessonComment[]
  onUpdate?: () => void
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()

  if (diffMs < 0) return "just now"
  if (diffMs < 60_000) return "just now"
  if (diffMs < 3_600_000) {
    const m = Math.floor(diffMs / 60_000)
    return `${m} minute${m > 1 ? "s" : ""} ago`
  }
  if (diffMs < 86_400_000) {
    const h = Math.floor(diffMs / 3_600_000)
    return `${h} hour${h > 1 ? "s" : ""} ago`
  }
  const d = Math.floor(diffMs / 86_400_000)
  if (d < 7) return `${d} day${d > 1 ? "s" : ""} ago`
  return new Date(dateStr).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
}

const roleBadgeColor: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  instructor: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  student: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
}

export function LessonComments({ lessonId, userId, comments, onUpdate }: LessonCommentsProps) {
  const [newComment, setNewComment] = useState("")
  const [posting, setPosting] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [submittingReply, setSubmittingReply] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [localComments, setLocalComments] = useState(comments)

  const rootComments = localComments.filter((c) => c.parent_id === null)
  const replyMap = new Map<string, LessonComment[]>()
  localComments.filter((c) => c.parent_id).forEach((r) => {
    const key = r.parent_id!
    if (!replyMap.has(key)) replyMap.set(key, [])
    replyMap.get(key)!.push(r)
  })

  async function handlePostComment(parentId?: string) {
    const content = parentId ? replyContent : newComment
    if (!content.trim()) return

    const setter = parentId ? setSubmittingReply : setPosting
    setter(true)

    const { data, error } = await createLessonComment(lessonId, content.trim(), parentId)

    setter(false)

    if (error) {
      alert(error)
      return
    }

    if (data) {
      const newCommentItem: LessonComment = {
        id: data.id,
        lesson_id: lessonId,
        user_id: data.user_id,
        content: data.content,
        parent_id: data.parent_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
        user: data.user,
      }
      setLocalComments((prev) => [newCommentItem, ...prev])

      if (parentId) {
        setReplyingTo(null)
        setReplyContent("")
      } else {
        setNewComment("")
      }
      onUpdate?.()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this comment?")) return
    const { error } = await deleteLessonComment(id)
    if (error) {
      alert(error)
      return
    }
    setLocalComments((prev) => prev.filter((c) => c.id !== id))
    setOpenMenu(null)
    onUpdate?.()
  }

  async function handleSaveEdit(id: string) {
    if (!editContent.trim()) return
    const { error } = await updateLessonComment(id, editContent.trim())
    if (error) {
      alert(error)
      return
    }
    setLocalComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, content: editContent.trim() } : c))
    )
    setEditingId(null)
    setEditContent("")
    onUpdate?.()
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-base font-medium">Discussion</h3>

      {/* New comment box */}
      <div className="flex flex-col gap-2">
        <Textarea
          placeholder="Share your thoughts or ask a question..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          maxLength={2000}
          disabled={posting}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {newComment.length}/2000
          </span>
          <Button
            variant="default"
            size="sm"
            disabled={!newComment.trim() || posting}
            onClick={() => handlePostComment()}
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            Post Comment
          </Button>
        </div>
      </div>

      {/* Comments list */}
      {rootComments.length === 0 && !localComments.length ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/50 px-4 py-10 text-center">
          <Reply className="h-6 w-6 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            No comments yet. Start the discussion!
          </p>
        </div>
      ) : localComments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/50 px-4 py-10 text-center">
          <Reply className="h-6 w-6 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            No comments yet. Start the discussion!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {[...rootComments].reverse().map((comment) => (
            <div key={comment.id} className="rounded-lg border border-border/50 p-3">
              <div className="flex items-start gap-2.5">
                <Avatar size="sm">
                  {comment.user.avatar_url && (
                    <AvatarImage src={comment.user.avatar_url} alt={comment.user.full_name} />
                  )}
                  <AvatarFallback className="text-xs">
                    {getInitials(comment.user.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {comment.user.full_name}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                        roleBadgeColor[comment.user.role] ?? roleBadgeColor.student
                      )}
                    >
                      {comment.user.role}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(comment.created_at)}
                    </span>

                    {/* 3-dot menu for own comments */}
                    {comment.user_id === userId && (
                      <div className="relative ml-auto">
                        <button
                          type="button"
                          className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted"
                          onClick={() => setOpenMenu(openMenu === comment.id ? null : comment.id)}
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                        {openMenu === comment.id && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setOpenMenu(null)}
                            />
                            <div className="absolute right-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-lg border border-foreground/10 bg-popover p-1 shadow-lg">
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                                onClick={() => {
                                  setEditingId(comment.id)
                                  setEditContent(comment.content)
                                  setOpenMenu(null)
                                }}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                                Edit
                              </button>
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                onClick={() => handleDelete(comment.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Edit mode */}
                  {editingId === comment.id ? (
                    <div className="mt-2 flex flex-col gap-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={2}
                        maxLength={2000}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSaveEdit(comment.id)}>
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingId(null)
                            setEditContent("")
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  )}
                </div>
              </div>

              {/* Reply button + inline reply box */}
              {replyingTo === comment.id ? (
                <div className="mt-3 ml-8 flex flex-col gap-2">
                  <Textarea
                    placeholder="Write a reply..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    rows={2}
                    maxLength={2000}
                    autoFocus
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={!replyContent.trim() || submittingReply}
                      onClick={() => handlePostComment(comment.id)}
                    >
                      <Send className="mr-1.5 h-3 w-3" />
                      Reply
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReplyingTo(null)
                        setReplyContent("")
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="mt-2 ml-8 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setReplyingTo(comment.id)}
                >
                  <Reply className="h-3 w-3" />
                  Reply
                </button>
              )}

              {/* Replies to this comment */}
              {(replyMap.get(comment.id) ?? []).length > 0 && (
                <div className="mt-3 ml-8 flex flex-col gap-2 border-l-2 border-border/30 pl-3">
                  {(replyMap.get(comment.id) ?? []).reverse().map((reply) => (
                    <div key={reply.id} className="py-1">
                      <div className="flex items-center gap-2">
                        <Avatar size="sm">
                          {reply.user.avatar_url && (
                            <AvatarImage src={reply.user.avatar_url} alt={reply.user.full_name} />
                          )}
                          <AvatarFallback className="text-xs">
                            {getInitials(reply.user.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">
                          {reply.user.full_name}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                            roleBadgeColor[reply.user.role] ?? roleBadgeColor.student
                          )}
                        >
                          {reply.user.role}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {timeAgo(reply.created_at)}
                        </span>

                        {reply.user_id === userId && (
                          <div className="relative ml-auto">
                            <button
                              type="button"
                              className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted"
                              onClick={() => setOpenMenu(openMenu === reply.id ? null : reply.id)}
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </button>
                            {openMenu === reply.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={() => setOpenMenu(null)}
                                />
                                <div className="absolute right-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-lg border border-foreground/10 bg-popover p-1 shadow-lg">
                                  <button
                                    type="button"
                                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                                    onClick={() => {
                                      setEditingId(reply.id)
                                      setEditContent(reply.content)
                                      setOpenMenu(null)
                                    }}
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    onClick={() => handleDelete(reply.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      {editingId === reply.id ? (
                        <div className="mt-2 flex flex-col gap-2">
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={2}
                            maxLength={2000}
                            autoFocus
                            className="text-sm"
                          />
                          <div className="flex gap-2">
                            <Button size="xs" onClick={() => handleSaveEdit(reply.id)}>Save</Button>
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => {
                                setEditingId(null)
                                setEditContent("")
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">
                          {reply.content}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
