import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageList } from "../../components/MessageList";
import { SendForm } from "../../components/SendForm";
import { DeleteChannelButton } from "../../components/DeleteChannelButton";
import { useUnread } from "../../lib/useUnread";
import { getGraphQLClient } from "../../lib/graphql";
import { RoomsQuery } from "../../lib/queries";
import { roomPath } from "../../lib/chatroom";

export const Route = createFileRoute("/rooms/$room")({
  component: RoomPage,
});

function RoomPage() {
  const { room } = Route.useParams();
  const { markRead } = useUnread(room);
  const [scrollToBottomSeq, setScrollToBottomSeq] = useState(0);
  const handleSent = useCallback(() => setScrollToBottomSeq((s) => s + 1), []);

  const { data: roomsData } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => getGraphQLClient().request(RoomsQuery, {}),
  });
  const roomInfo = roomsData?.rooms?.find((r) => roomPath(r.folder, r.name) === room);
  const roomDescription = roomInfo?.description;
  const roomDisplayName = roomInfo?.name ?? room;

  useEffect(() => {
    document.title = `#${roomDisplayName} - uchat`;
    localStorage.setItem("uchat-last-room", room);
    return () => {
      document.title = "uchat";
    };
  }, [room, roomDisplayName]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Channel header - hidden on mobile since MobileHeader shows it */}
      <div className="hidden md:block shrink-0 bg-muted px-4 py-2">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 shrink-0 text-center">
            <span className="text-terminal-green">#</span>
          </div>
          <h2 className="font-semibold text-foreground">{roomDisplayName}</h2>
          {roomDescription && (
            <span className="truncate text-sm text-muted-foreground" style={{ maxWidth: "255ch" }}>
              {roomDescription}
            </span>
          )}
          {roomInfo && (
            <div className="ml-auto shrink-0">
              <DeleteChannelButton
                name={roomInfo.name}
                folder={roomInfo.folder}
                isActive
              />
            </div>
          )}
        </div>
      </div>
      <MessageList room={room} onLastMessage={markRead} scrollToBottomSeq={scrollToBottomSeq} />
      <SendForm room={room} onSent={handleSent} />
    </div>
  );
}
