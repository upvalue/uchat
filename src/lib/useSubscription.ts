import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getWsClient } from "./graphql";

const MESSAGE_ADDED_SUBSCRIPTION = `
  subscription MessageAdded($room: String!) {
    messageAdded(room: $room) {
      id
      room
      user
      body
      timestamp
      source
      streaming
    }
  }
`;

/**
 * Subscribe to new messages in a room via GraphQL subscriptions.
 * On each event, invalidates the messages query so react-query refetches.
 */
export function useMessageSubscription(room: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!room) return;

    console.log(`[subscription] subscribing to messageAdded for room="${room}"`);

    const cleanup = getWsClient().subscribe(
      {
        query: MESSAGE_ADDED_SUBSCRIPTION,
        variables: { room },
      },
      {
        next: (result) => {
          console.log(`[subscription] messageAdded in room="${room}"`, result.data);
          queryClient.invalidateQueries({ queryKey: ["messages", room] });
        },
        error: (err) => {
          console.error(`[subscription] error for room="${room}"`, err);
        },
        complete: () => {
          console.log(`[subscription] completed for room="${room}"`);
        },
      },
    );

    return () => {
      console.log(`[subscription] unsubscribing from room="${room}"`);
      cleanup();
    };
  }, [room, queryClient]);
}
