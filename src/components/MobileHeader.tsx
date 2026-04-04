import { useMatchRoute } from "@tanstack/react-router";
import { Menu, Settings, X } from "lucide-react";

interface MobileHeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function MobileHeader({ sidebarOpen, onToggleSidebar }: MobileHeaderProps) {
  const matchRoute = useMatchRoute();

  // Try to extract current room name
  const roomMatch = matchRoute({ to: "/rooms/$room", params: {} as any });
  const roomName = roomMatch ? (roomMatch as { room?: string }).room : null;
  const configMatch = matchRoute({ to: "/config" });

  let title = "uchat";
  if (roomName) title = `#${roomName}`;
  else if (configMatch) title = "config";

  return (
    <div className="flex md:hidden items-center gap-2 bg-sidebar px-3 py-2 border-b border-border">
      <button
        onClick={onToggleSidebar}
        className="flex items-center justify-center h-8 w-8 text-muted-foreground hover:text-terminal-green transition-colors"
        aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <button
        onClick={onToggleSidebar}
        className="flex-1 text-left font-semibold text-terminal-green truncate"
      >
        {roomName && <span className="opacity-50 mr-0.5">#</span>}
        {roomName ?? title}
      </button>
    </div>
  );
}
