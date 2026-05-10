import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AnsiMessage } from "./AnsiMessage";
import { UserAvatar } from "./UserAvatar";
import { getGraphQLClient } from "../lib/graphql";
import { MessagesQuery, UsersQuery } from "../lib/queries";
import { useMessageSubscription } from "../lib/useSubscription";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MessageItem {
  id: string;
  user: string;
  body: Record<string, unknown>;
  timestamp: string;
  source: string;
  revision: number;
  streaming: string | null;
}

const STREAMING_TIMEOUT_MS = 5 * 60 * 1000;

function isStreaming(streaming: string | null): boolean {
  if (!streaming) return false;
  return Date.now() - new Date(streaming).getTime() < STREAMING_TIMEOUT_MS;
}

interface ToolCallInfo {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: "running" | "done" | "error";
  durationMs?: number;
}

function formatArgs(args: Record<string, unknown>): string {
  const entries = Object.entries(args);
  if (entries.length === 0) return "";
  if (entries.length === 1) {
    const val = String(entries[0][1]);
    return val.length > 80 ? val.slice(0, 77) + "..." : val;
  }
  return entries
    .map(([k, v]) => {
      const val = String(v);
      return `${k}: ${val.length > 60 ? val.slice(0, 57) + "..." : val}`;
    })
    .join(", ");
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function ToolCallsBlock({ toolCalls }: { toolCalls: ToolCallInfo[] }) {
  return (
    <div className="my-1.5 space-y-0.5 text-xs font-mono">
      {toolCalls.map((tc) => (
        <div key={tc.id} className="flex items-center gap-1.5 text-muted-foreground">
          <span>
            {tc.status === "running" ? (
              <RunningSpinner />
            ) : tc.status === "error" ? (
              <span className="text-destructive">✗</span>
            ) : (
              <span className="text-terminal-green">✓</span>
            )}
          </span>
          <span className="text-terminal-cyan">{tc.name}</span>
          <span className="truncate opacity-70">{formatArgs(tc.args)}</span>
          {tc.durationMs != null && (
            <span className="ml-auto shrink-0 opacity-50">{formatDuration(tc.durationMs)}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="my-1.5 rounded border border-destructive/50 bg-destructive/10 px-2 py-1.5 text-xs font-mono text-destructive">
      <div className="mb-1 font-semibold">[error] inference failed</div>
      <pre className="whitespace-pre-wrap break-words text-destructive/90">{message}</pre>
    </div>
  );
}

function RunningSpinner() {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % BRAILLE_FRAMES.length), 80);
    return () => clearInterval(id);
  }, []);
  return <span className="text-terminal-yellow">{BRAILLE_FRAMES[frame]}</span>;
}

const BRAILLE_FRAMES = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];

function StreamingSpinner() {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % BRAILLE_FRAMES.length), 80);
    return () => clearInterval(id);
  }, []);
  return <span className="text-terminal-cyan ml-1">{BRAILLE_FRAMES[frame]}</span>;
}

export function MessageList({ room, onLastMessage, scrollToBottomSeq }: { room: string; onLastMessage?: (messageID: string) => void; scrollToBottomSeq?: number }) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const onLastMessageRef = useRef(onLastMessage);
  onLastMessageRef.current = onLastMessage;
  const [showScrollArrow, setShowScrollArrow] = useState(false);
  // Track whether the user was near bottom before the last content change
  const wasNearBottomRef = useRef(true);

  useMessageSubscription(room);

  const { data, isLoading, error } = useQuery({
    queryKey: ["messages", room],
    queryFn: () => getGraphQLClient().request(MessagesQuery, { room }),
    refetchInterval: 30_000,
  });

  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: () => getGraphQLClient().request(UsersQuery),
    staleTime: 60_000,
  });

  const avatarMap = useMemo(() => {
    const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
    const map = new Map<string, string>();
    for (const u of (usersData?.users ?? []) as { name: string; avatar?: string | null }[]) {
      if (u.avatar) map.set(u.name, base + u.avatar);
    }
    return map;
  }, [usersData]);

  const messages = (data?.messages ?? []) as MessageItem[];

  const lastMsg = messages[messages.length - 1];
  const scrollTrigger = lastMsg ? `${lastMsg.id}-${lastMsg.revision}` : "";

  const forceScrollRef = useRef(false);
  const initialScrollDone = useRef<string | null>(null);

  const NEAR_BOTTOM_THRESHOLD = 150; // px from bottom

  const checkNearBottom = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return true;
    return vp.scrollHeight - vp.scrollTop - vp.clientHeight < NEAR_BOTTOM_THRESHOLD;
  }, []);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const vp = viewportRef.current;
      if (vp) {
        vp.scrollTo({ top: vp.scrollHeight, behavior: "smooth" });
      }
    });
  }, []);

  // Track scroll position to show/hide the arrow and update near-bottom state
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onScroll = () => {
      const nearBottom = checkNearBottom();
      wasNearBottomRef.current = nearBottom;
      setShowScrollArrow(!nearBottom);
    };
    vp.addEventListener("scroll", onScroll, { passive: true });
    return () => vp.removeEventListener("scroll", onScroll);
  }, [checkNearBottom]);

  // When the user sends a message, set a flag so the next render scrolls unconditionally
  useEffect(() => {
    if (scrollToBottomSeq) {
      forceScrollRef.current = true;
    }
  }, [scrollToBottomSeq]);

  // Scroll to bottom on initial channel load
  useEffect(() => {
    if (messages.length > 0 && initialScrollDone.current !== room) {
      initialScrollDone.current = room;
      requestAnimationFrame(() => {
        const vp = viewportRef.current;
        if (vp) {
          vp.scrollTop = vp.scrollHeight;
        }
      });
    }
  }, [messages.length, room]);

  // Mark last message as read when messages load/update
  useEffect(() => {
    if (messages.length > 0 && onLastMessageRef.current) {
      onLastMessageRef.current(messages[messages.length - 1].id);
    }
  }, [scrollTrigger]);

  // Auto-scroll when new content arrives if user was near bottom
  useEffect(() => {
    if (forceScrollRef.current || wasNearBottomRef.current) {
      forceScrollRef.current = false;
      scrollToBottom();
    }
  }, [scrollTrigger, scrollToBottom]);

  // Also auto-scroll during streaming: use a ResizeObserver on the content
  // so that as streaming messages grow, we keep scrolling if the user was near bottom
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const inner = vp.firstElementChild as HTMLElement | null;
    if (!inner) return;
    const ro = new ResizeObserver(() => {
      if (wasNearBottomRef.current || forceScrollRef.current) {
        forceScrollRef.current = false;
        vp.scrollTo({ top: vp.scrollHeight, behavior: "instant" });
        setShowScrollArrow(false);
      }
    });
    ro.observe(inner);
    return () => ro.disconnect();
  }, [room, messages.length > 0]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-muted-foreground animate-pulse">loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-destructive">[error] failed to load messages</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">~ empty channel. say something. ~</p>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      <ScrollArea className="h-full" viewportRef={viewportRef}>
        <div className="mt-auto space-y-0 px-2 py-3 md:px-4">
          {messages.map((msg, i) => {
          const prev = messages[i - 1];
          const showHeader = !prev || prev.user !== msg.user;
          const isError =
            typeof msg.body === "object" && msg.body !== null && msg.body.error === true;
          const errorMessage =
            isError && typeof msg.body.errorMessage === "string"
              ? msg.body.errorMessage
              : isError
                ? "(no error message provided)"
                : null;

          const bodyText =
            typeof msg.body === "object" && msg.body !== null && "body" in msg.body
              ? String(msg.body.body)
              : isError
                ? ""
                : JSON.stringify(msg.body);

          const toolCalls = (
            typeof msg.body === "object" && msg.body !== null && Array.isArray(msg.body.toolCalls)
              ? msg.body.toolCalls as ToolCallInfo[]
              : null
          );

          return (
            <div
              key={msg.id}
              className={`group flex gap-3 pl-4 sm:pl-2 pr-2 py-0.5 transition-colors hover:bg-accent/40 ${showHeader ? "mt-2 pt-1" : ""}`}
            >
              <div className="hidden sm:block w-12 shrink-0 text-center">
                {showHeader && (
                  <UserAvatar username={msg.user} avatarUrl={avatarMap.get(msg.user)} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                {showHeader && (
                  <div className="mb-0.5 flex items-baseline gap-2">
                    <span className="font-semibold text-terminal-green">{msg.user}</span>
                    <span className="text-muted-foreground">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </span>
                    {msg.source === "api" && (
                      <span className="text-terminal-cyan">[api]</span>
                    )}
                  </div>
                )}
                {toolCalls && <ToolCallsBlock toolCalls={toolCalls} />}
                <div className={`prose-chat leading-relaxed text-foreground/90${isStreaming(msg.streaming) ? ' streaming-msg' : ''}`}>
                  {msg.body?.format === "ansi" ? (
                    <AnsiMessage text={bodyText} cols={msg.body?.cols as number | undefined} />
                  ) : bodyText ? (
                    <Markdown remarkPlugins={[remarkGfm]}>{bodyText}</Markdown>
                  ) : null}
                  {isError && errorMessage != null && <ErrorBlock message={errorMessage} />}
                  {isStreaming(msg.streaming) && <StreamingSpinner />}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
    {showScrollArrow && (
      <button
        onClick={scrollToBottom}
        className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Scroll to bottom"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3v10M4 9l4 4 4-4" />
        </svg>
      </button>
    )}
    </div>
  );
}
