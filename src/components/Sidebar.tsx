import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useMatchRoute } from "@tanstack/react-router";
import { Settings, MoreHorizontal } from "lucide-react";
import { getGraphQLClient } from "../lib/graphql";
import { RoomsQuery } from "../lib/queries";
import { cn } from "@/lib/utils";
import { useUnread } from "../lib/useUnread";
import { useInstance } from "../lib/useInstance";
import { CreateChannelButton } from "./CreateChannelDialog";
import { roomPath } from "@/lib/chatroom";
import { ChannelSettingsDialog } from "./ChannelSettingsDialog";

interface RoomItem {
  name: string;
  folder?: string | null;
  description?: string | null;
  position: number;
}

interface FolderGroup {
  folder: string | null;
  rooms: RoomItem[];
}

function groupByFolder(rooms: RoomItem[]): FolderGroup[] {
  const folderMap = new Map<string | null, RoomItem[]>();
  for (const room of rooms) {
    const key = room.folder ?? null;
    const list = folderMap.get(key) ?? [];
    list.push(room);
    folderMap.set(key, list);
  }
  const groups: FolderGroup[] = [];
  const ungrouped = folderMap.get(null);
  if (ungrouped) {
    groups.push({ folder: null, rooms: ungrouped });
    folderMap.delete(null);
  }
  const sortedFolders = [...folderMap.keys()].sort((a, b) => (a ?? "").localeCompare(b ?? ""));
  for (const folder of sortedFolders) {
    groups.push({ folder, rooms: folderMap.get(folder)! });
  }
  return groups;
}

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps = {}) {
  const matchRoute = useMatchRoute();
  const { unreadMap } = useUnread();
  const title = useInstance();
  const [settingsTarget, setSettingsTarget] = useState<RoomItem | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => getGraphQLClient().request(RoomsQuery, {}),
    refetchInterval: 10000,
  });

  const groups = useMemo(
    () => groupByFolder((data?.rooms ?? []) as RoomItem[]),
    [data?.rooms],
  );

  return (
    <nav className="flex w-56 flex-col bg-sidebar font-mono h-full">
      {/* Brand */}
      <div className="flex items-center gap-2 px-4 py-3">
        <span className="text-terminal-green font-bold">$</span>
        <span className="font-bold tracking-tight text-terminal-green">{title}</span>
      </div>

      {/* Channels header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="font-semibold uppercase tracking-widest text-muted-foreground">
          # channels
        </span>
        <CreateChannelButton global />
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto px-2">
        {isLoading && (
          <div className="space-y-1 px-2 py-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-6 animate-pulse bg-sidebar-accent/50"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        )}
        {!isLoading && groups.length === 0 && (
          <p className="px-2 py-4 text-center text-muted-foreground">
            no channels yet
          </p>
        )}
        <div className="space-y-2">
          {groups.map((group) => (
            <div key={group.folder ?? "__ungrouped"}>
              {group.folder && (
                <div className="flex items-center gap-1 px-2 pt-2 pb-0.5">
                  <span className="font-semibold uppercase tracking-wider text-muted-foreground/80">
                    {group.folder}
                  </span>
                  <span className="ml-auto">
                    <CreateChannelButton defaultFolder={group.folder} />
                  </span>
                </div>
              )}
              <div className="space-y-px">
                {group.rooms.map((room) => {
                  const path = roomPath(room.folder, room.name);
                  const isActive = matchRoute({
                    to: "/rooms/$room",
                    params: { room: path },
                  });
                  const unreadCount = unreadMap.get(path) ?? 0;
                  return (
                    <div key={path} className="group relative flex items-center">
                      <Link
                        to="/rooms/$room"
                        params={{ room: path }}
                        onClick={onNavigate}
                        className={cn(
                          "flex flex-1 items-center gap-1.5 px-2 py-1 transition-colors",
                          "text-sidebar-foreground hover:bg-sidebar-accent hover:text-terminal-green",
                          isActive &&
                            "bg-sidebar-accent text-terminal-green border-l-2 border-terminal-green",
                          !isActive &&
                            unreadCount > 0 &&
                            "text-terminal-green font-medium",
                        )}
                      >
                        <span className="opacity-50">#</span>
                        <span className="truncate">{room.name}</span>
                        {!isActive && unreadCount > 0 && (
                          <span className="ml-auto font-semibold text-terminal-green">
                            [{unreadCount > 99 ? "99+" : unreadCount}]
                          </span>
                        )}
                      </Link>
                      <button
                        onClick={() => setSettingsTarget(room)}
                        className="absolute right-1 hidden group-hover:flex items-center justify-center h-5 w-5 text-muted-foreground hover:text-terminal-green transition-colors"
                        title="Channel settings"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="px-2 py-2">
        <Link
          to="/config"
          onClick={onNavigate}
          className="flex items-center gap-1.5 px-2 py-1 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-terminal-green"
        >
          <Settings className="h-3.5 w-3.5" />
          config
        </Link>
      </div>
      {settingsTarget && (
        <ChannelSettingsDialog
          room={settingsTarget}
          onClose={() => setSettingsTarget(null)}
        />
      )}
    </nav>
  );
}
