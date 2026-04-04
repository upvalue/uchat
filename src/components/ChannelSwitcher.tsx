import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getGraphQLClient } from "../lib/graphql";
import { RoomsQuery } from "../lib/queries";
import { cn } from "@/lib/utils";
import { roomPath } from "@/lib/chatroom";

interface RoomItem {
  name: string;
  folder?: string | null;
}

export function ChannelSwitcher() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => getGraphQLClient().request(RoomsQuery, {}),
    refetchInterval: 10000,
  });

  const rooms = (data?.rooms ?? []) as RoomItem[];
  const filtered = rooms.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      (r.folder ?? "").toLowerCase().includes(q)
    );
  });

  // Cmd+K / Ctrl+K to toggle
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setSearch("");
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (selectedIndex >= filtered.length) {
      setSelectedIndex(Math.max(0, filtered.length - 1));
    }
  }, [filtered.length, selectedIndex]);

  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-item]");
    items[selectedIndex]?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const selectRoom = useCallback(
    (name: string) => {
      setOpen(false);
      navigate({ to: "/rooms/$room", params: { room: name } });
    },
    [navigate],
  );

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        const r = filtered[selectedIndex];
        selectRoom(roomPath(r.folder, r.name));
      }
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div
        className="fixed inset-0 bg-black/70 animate-in fade-in-0"
        onClick={() => setOpen(false)}
      />

      <div className="relative z-10 w-full max-w-md overflow-hidden border border-border bg-popover animate-in fade-in-0 zoom-in-95 slide-in-from-top-2">
        <div className="flex items-center gap-2 border-b border-border px-4">
          <span className="text-terminal-green">$</span>
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={onInputKeyDown}
            placeholder="goto #channel"
            className="h-11 w-full bg-transparent text-foreground placeholder:text-muted-foreground outline-none font-mono"
          />
          <kbd className="hidden sm:inline-flex h-5 items-center border border-border bg-muted px-1.5 text-muted-foreground">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-72 overflow-y-auto p-1">
          {filtered.length === 0 && (
            <p className="py-6 text-center text-muted-foreground">
              no channels found
            </p>
          )}
          {filtered.map((room, i: number) => {
            const path = roomPath(room.folder, room.name);
            return (
            <button
              key={path}
              data-item
              onClick={() => selectRoom(path)}
              onMouseEnter={() => setSelectedIndex(i)}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-1.5 transition-colors font-mono",
                "text-foreground",
                i === selectedIndex
                  ? "bg-accent text-terminal-green"
                  : "hover:bg-accent/50",
              )}
            >
              <span className="opacity-50">#</span>
              <span className="truncate">
                {room.folder && (
                  <span className="text-muted-foreground">{room.folder} / </span>
                )}
                {room.name}
              </span>
            </button>
          );
          })}
        </div>
      </div>
    </div>
  );
}
