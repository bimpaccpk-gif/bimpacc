"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type ChatMessage } from "@/app/actions/ai-admin";
import {
  Sparkles,
  Send,
  Loader2,
  Bot,
  User,
  Trash2,
  Lightbulb,
} from "lucide-react";

const SUGGESTED_QUERIES = [
  "How many students enrolled this week?",
  "Show me students with low quiz scores",
  "What is the overall platform health?",
  "Which course has the most enrollments?",
  "List students who haven't logged in recently",
  "How many courses are currently published?",
];

export default function AdminChatAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  const sendMessage = async (message?: string) => {
    const text = message || input.trim();
    if (!text || streaming) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setStreaming(true);
    setStreamingContent("");
    setError(null);

    try {
      // Build messages array for API (include conversation history)
      const apiMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("/api/admin/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.error ?? `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let accumulatedContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedContent += chunk;
        setStreamingContent(accumulatedContent);
      }

      // Add completed assistant message
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: accumulatedContent,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setStreamingContent("");
    } catch (err: any) {
      setError(err.message ?? "Failed to get response");
      setStreamingContent("");
    } finally {
      setStreaming(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setStreamingContent("");
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const displayMessages = [...messages];
  if (streaming && streamingContent) {
    displayMessages.push({
      role: "assistant",
      content: streamingContent,
      timestamp: new Date().toISOString(),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <Bot className="h-5 w-5 text-brand-600" />
            AI Admin Assistant
          </h2>
          <p className="text-sm text-muted-foreground">
            Ask questions about your LMS data in natural language
          </p>
        </div>
        {messages.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearChat}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Clear Chat
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-600" />
            Chat Interface
          </CardTitle>
          <CardDescription>
            Type a question or use a suggested query below
          </CardDescription>
        </CardHeader>

        {/* Messages Area */}
        <div className="h-[400px] overflow-y-auto border-b px-4 py-3">
          {displayMessages.length === 0 && !streaming ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Bot className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-3 text-sm font-medium text-foreground">
                Welcome to the AI Admin Assistant
              </p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                Ask questions about your students, courses, enrollments, and platform analytics.
                The assistant has access to your LMS data.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`flex max-w-[85%] items-start gap-2 rounded-lg px-3 py-2 ${
                      msg.role === "user"
                        ? "bg-brand-600 text-white"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <Bot className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                    ) : (
                      <User className="mt-0.5 h-4 w-4 shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                      {msg.role === "assistant" && i === displayMessages.length - 1 && streaming && (
                        <span className="inline-block ml-1 h-4 w-2 bg-brand-600 animate-pulse rounded-sm" />
                      )}
                      <p
                        className={`mt-1 text-[10px] ${
                          msg.role === "user"
                            ? "text-white/70"
                            : "text-muted-foreground"
                        }`}
                      >
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="border-b bg-destructive/5 px-4 py-2">
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your LMS data..."
              disabled={streaming}
              className="flex-1"
            />
            <Button onClick={() => sendMessage()} disabled={streaming || !input.trim()}>
              {streaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Suggested Queries */}
        {displayMessages.length === 0 && !streaming && (
          <div className="border-t px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Lightbulb className="h-3.5 w-3.5" />
              Suggested queries:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_QUERIES.map((query, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="h-auto rounded-full px-3 py-1.5 text-xs"
                  onClick={() => sendMessage(query)}
                  disabled={streaming}
                >
                  {query}
                </Button>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
