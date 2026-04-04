import { useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { getGraphQLClient, getWsClient } from "./graphql";
import { UnreadCountsQuery, MarkReadMutation } from "./queries";
import { getConfig } from "./config";

const MESSAGE_ADDED_GLOBAL = `
  subscription MessageAddedGlobal {
    messageAdded {
      id
      room
      user
      body
      timestamp
    }
  }
`;

/**
 * Hook that tracks unread counts for all rooms.
 * Subscribes to a global messageAdded subscription and maintains counts.
 */
export function useUnread(currentRoom?: string) {
  const config = getConfig();
  const username = config?.username;
  const queryClient = useQueryClient();

  // Fetch initial unread counts
  const { data } = useQuery({
    queryKey: ["unreadCounts", username],
    queryFn: () => getGraphQLClient().request(UnreadCountsQuery, { user: username! }),
    enabled: !!username,
    refetchInterval: 60_000,
  });

  // Mark-read mutation
  const markReadMut = useMutation({
    mutationFn: (vars: { room: string; messageID: string }) =>
      getGraphQLClient().request(MarkReadMutation, {
        room: vars.room,
        user: username!,
        messageID: vars.messageID,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unreadCounts", username] });
    },
  });

  // Subscribe to global messageAdded
  useEffect(() => {
    if (!username) return;

    const cleanup = getWsClient().subscribe(
      { query: MESSAGE_ADDED_GLOBAL },
      {
        next: (_result) => {
          // Refetch unread counts and messages for the affected room
          queryClient.invalidateQueries({ queryKey: ["unreadCounts", username] });
          const msg = _result.data?.messageAdded as { room: string } | undefined;
          if (msg) {
            queryClient.invalidateQueries({ queryKey: ["messages", msg.room] });
          }
        },
        error: (err) => {
          console.error("[unread] global subscription error", err);
        },
        complete: () => {
          console.log("[unread] global subscription completed");
        },
      },
    );

    return cleanup;
  }, [username, queryClient]);

  // Use a ref to avoid stale closure / infinite re-render loops
  const markReadRef = useRef(markReadMut.mutate);
  markReadRef.current = markReadMut.mutate;

  const markCurrentRoomRead = useCallback(
    (messageID: string) => {
      if (!username || !currentRoom) return;
      markReadRef.current({ room: currentRoom, messageID });
    },
    [username, currentRoom],
  );

  // Build the unread map
  const unreadMap = new Map<string, number>();
  if (data?.unreadCounts) {
    for (const uc of data.unreadCounts as { room: string; count: number }[]) {
      unreadMap.set(uc.room, uc.count);
    }
  }

  // Total unread
  let totalUnread = 0;
  for (const count of unreadMap.values()) {
    totalUnread += count;
  }

  return { unreadMap, totalUnread, markRead: markCurrentRoomRead };
}
