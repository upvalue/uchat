import { GraphQLClient } from "graphql-request";
import { createClient, type Client } from "graphql-ws";
import { getConfig } from "./config";

/** Resolve the base URL for API requests, respecting config override and vite base path. */
function getApiBase(): string {
  const config = getConfig();
  if (config?.serverUrl) return config.serverUrl;
  // In production builds, import.meta.env.BASE_URL includes the base path (e.g. "/uchat/").
  // Strip trailing slash and combine with origin to get the correct prefix.
  const basePath = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  return window.location.origin + basePath;
}

export function getGraphQLClient(): GraphQLClient {
  const url = getApiBase() + "/graphql";
  return new GraphQLClient(url);
}

let wsClient: Client | null = null;
let lastWsUrl: string | null = null;

export function getWsClient(): Client {
  const base = getApiBase();
  const wsUrl = base.replace(/^http/, "ws") + "/graphql";

  // Recreate if the URL changed (e.g. config update)
  if (wsClient && lastWsUrl !== wsUrl) {
    wsClient.dispose();
    wsClient = null;
  }

  if (!wsClient) {
    lastWsUrl = wsUrl;
    wsClient = createClient({
      url: wsUrl,
      shouldRetry: () => true,
      retryAttempts: Infinity,
    });
    console.log(`[ws] client created for ${wsUrl}`);
  }

  return wsClient;
}
