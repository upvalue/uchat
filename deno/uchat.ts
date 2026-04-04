#!/usr/bin/env -S deno run --allow-net --allow-env --allow-sys=hostname
// Built from f349cf8 (dirty) at 2026-04-04T18:52:01.630Z
// Auto-generated — do not edit. Run: deno run deno/build.ts
// Source: deno/_generated.ts (codegen) + deno/_cli.ts (hand-maintained)
//
// Programmatic usage:
//
//   import { UchatClient } from "./uchat.ts";
//
//   const client = new UchatClient("http://localhost:6767");
//
//   // List rooms
//   const { rooms } = await client.rooms();
//
//   // Create a room
//   await client.createRoom("alerts");
//
//   // Send a message (body is always a JSON object)
//   await client.sendMessage("alerts", "bot", { body: "disk full" });
//   // ... or omit user to default to hostname:
//   await client.sendMessage("alerts", undefined, { body: "disk full" });
//
//   // Read messages
//   const { messages } = await client.messages("alerts");
//
//   // Edit a message
//   await client.editMessage("msg_abc123", { body: "disk ok now" });
//
//   // Watch a room for new messages (WebSocket subscription)
//   const sub = client.watch("alerts", (msg) => console.log(msg));
//   // later: sub.close();
//
// Also exported: gql(), subscribe(), formatMessage() for lower-level use.


export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  JSON: { input: Record<string, unknown>; output: Record<string, unknown>; }
  Time: { input: string; output: string; }
};

export type Message = {
  body: Scalars['JSON']['output'];
  id: Scalars['ID']['output'];
  revision: Scalars['Int']['output'];
  room: Scalars['String']['output'];
  source: Scalars['String']['output'];
  streaming?: Maybe<Scalars['Time']['output']>;
  timestamp: Scalars['Time']['output'];
  user: Scalars['String']['output'];
};

export type Mutation = {
  createRoom: Room;
  deleteRoom: Scalars['Boolean']['output'];
  editMessage: Message;
  markRead: Scalars['Boolean']['output'];
  sendMessage: Message;
  updateRoom: Room;
};


export type MutationCreateRoomArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  folder?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};


export type MutationDeleteRoomArgs = {
  folder?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};


export type MutationEditMessageArgs = {
  body: Scalars['JSON']['input'];
  id: Scalars['ID']['input'];
  streaming?: InputMaybe<Scalars['Time']['input']>;
};


export type MutationMarkReadArgs = {
  messageID: Scalars['ID']['input'];
  room: Scalars['String']['input'];
  user: Scalars['String']['input'];
};


export type MutationSendMessageArgs = {
  body: Scalars['JSON']['input'];
  room: Scalars['String']['input'];
  source?: InputMaybe<Scalars['String']['input']>;
  streaming?: InputMaybe<Scalars['Time']['input']>;
  user: Scalars['String']['input'];
};


export type MutationUpdateRoomArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  folder?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

export type Query = {
  messages: Array<Message>;
  rooms: Array<Room>;
  unreadCounts: Array<UnreadCount>;
  users: Array<User>;
};


export type QueryMessagesArgs = {
  room: Scalars['String']['input'];
};


export type QueryRoomsArgs = {
  folder?: InputMaybe<Scalars['String']['input']>;
};


export type QueryUnreadCountsArgs = {
  user: Scalars['String']['input'];
};

export type Room = {
  description?: Maybe<Scalars['String']['output']>;
  folder?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  position: Scalars['Int']['output'];
};

export type Subscription = {
  messageAdded: Message;
};


export type SubscriptionMessageAddedArgs = {
  folder?: InputMaybe<Scalars['String']['input']>;
  room?: InputMaybe<Scalars['String']['input']>;
};

export type UnreadCount = {
  count: Scalars['Int']['output'];
  room: Scalars['String']['output'];
};

export type User = {
  avatar?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
};

export type RoomsQueryVariables = Exact<{
  folder?: InputMaybe<Scalars['String']['input']>;
}>;


export type RoomsQuery = { rooms: Array<{ name: string, folder?: string | null, description?: string | null, position: number }> };

export type CreateRoomMutationVariables = Exact<{
  name: Scalars['String']['input'];
  folder?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
}>;


export type CreateRoomMutation = { createRoom: { name: string, folder?: string | null, description?: string | null, position: number } };

export type UsersQueryVariables = Exact<{ [key: string]: never; }>;


export type UsersQuery = { users: Array<{ name: string, avatar?: string | null }> };

export type MessagesQueryVariables = Exact<{
  room: Scalars['String']['input'];
}>;


export type MessagesQuery = { messages: Array<{ id: string, room: string, user: string, body: Record<string, unknown>, timestamp: string, source: string, revision: number, streaming?: string | null }> };

export type SendMessageMutationVariables = Exact<{
  room: Scalars['String']['input'];
  user: Scalars['String']['input'];
  body: Scalars['JSON']['input'];
  source?: InputMaybe<Scalars['String']['input']>;
  streaming?: InputMaybe<Scalars['Time']['input']>;
}>;


export type SendMessageMutation = { sendMessage: { id: string, room: string, user: string, body: Record<string, unknown>, timestamp: string, source: string, revision: number, streaming?: string | null } };

export type EditMessageMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  body: Scalars['JSON']['input'];
  streaming?: InputMaybe<Scalars['Time']['input']>;
}>;


export type EditMessageMutation = { editMessage: { id: string, room: string, user: string, body: Record<string, unknown>, timestamp: string, source: string, revision: number, streaming?: string | null } };

export type UnreadCountsQueryVariables = Exact<{
  user: Scalars['String']['input'];
}>;


export type UnreadCountsQuery = { unreadCounts: Array<{ room: string, count: number }> };

export type MarkReadMutationVariables = Exact<{
  room: Scalars['String']['input'];
  user: Scalars['String']['input'];
  messageID: Scalars['ID']['input'];
}>;


export type MarkReadMutation = { markRead: boolean };

export type UpdateRoomMutationVariables = Exact<{
  name: Scalars['String']['input'];
  folder?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
}>;


export type UpdateRoomMutation = { updateRoom: { name: string, folder?: string | null, description?: string | null, position: number } };

export type DeleteRoomMutationVariables = Exact<{
  name: Scalars['String']['input'];
  folder?: InputMaybe<Scalars['String']['input']>;
}>;


export type DeleteRoomMutation = { deleteRoom: boolean };

export type MessageAddedSubscriptionVariables = Exact<{
  room: Scalars['String']['input'];
}>;


export type MessageAddedSubscription = { messageAdded: { id: string, room: string, user: string, body: Record<string, unknown>, timestamp: string, source: string, revision: number, streaming?: string | null } };

export type MessageAddedGlobalSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type MessageAddedGlobalSubscription = { messageAdded: { id: string, room: string, user: string, body: Record<string, unknown>, timestamp: string, source: string, revision: number, streaming?: string | null } };

export type MessageAddedByFolderSubscriptionVariables = Exact<{
  folder: Scalars['String']['input'];
}>;


export type MessageAddedByFolderSubscription = { messageAdded: { id: string, room: string, user: string, body: Record<string, unknown>, timestamp: string, source: string, revision: number, streaming?: string | null } };

// deno/_cli.ts — Hand-maintained Deno CLI for uchat.
// This file is merged with _generated.ts by build.ts to produce uchat.ts.

// ---------------------------------------------------------------------------
// GraphQL HTTP client
// ---------------------------------------------------------------------------

interface GqlResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export async function gql<T>(
  endpoint: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  const json: GqlResponse<T> = await res.json();
  if (json.errors?.length) {
    throw new Error(`GraphQL: ${json.errors.map((e) => e.message).join("; ")}`);
  }
  return json.data!;
}

// ---------------------------------------------------------------------------
// GraphQL WebSocket (graphql-ws protocol) for subscriptions
// ---------------------------------------------------------------------------

export function subscribe<T>(
  wsUrl: string,
  query: string,
  variables: Record<string, unknown>,
  onData: (data: T) => void,
  onError?: (err: unknown) => void,
): { close: () => void } {
  const ws = new WebSocket(wsUrl, "graphql-transport-ws");
  let closed = false;

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: "connection_init" }));
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(String(event.data));
    switch (msg.type) {
      case "connection_ack":
        ws.send(
          JSON.stringify({
            id: "1",
            type: "subscribe",
            payload: { query, variables },
          }),
        );
        break;
      case "next":
        onData(msg.payload.data as T);
        break;
      case "error":
        onError?.(msg.payload);
        break;
      case "complete":
        break;
    }
  };

  ws.onerror = (e) => onError?.(e);
  ws.onclose = () => {
    if (!closed) {
      setTimeout(() => {
        if (!closed) {
          const s = subscribe(wsUrl, query, variables, onData, onError);
          closeFn = s.close;
        }
      }, 2000);
    }
  };

  let closeFn = () => {
    closed = true;
    ws.close();
  };

  return {
    close: () => closeFn(),
  };
}

// ---------------------------------------------------------------------------
// Query strings (match operations.graphql)
// ---------------------------------------------------------------------------

const ROOMS_QUERY = `query Rooms($folder: String) { rooms(folder: $folder) { name folder description position } }`;

const CREATE_ROOM_MUTATION = `mutation CreateRoom($name: String!, $folder: String, $description: String) {
  createRoom(name: $name, folder: $folder, description: $description) { name folder description position }
}`;

const MESSAGES_QUERY = `query Messages($room: String!) {
  messages(room: $room) { id room user body timestamp source streaming }
}`;

const SEND_MESSAGE_MUTATION = `mutation SendMessage($room: String!, $user: String!, $body: JSON!, $source: String, $streaming: Time) {
  sendMessage(room: $room, user: $user, body: $body, source: $source, streaming: $streaming) { id room user body timestamp source streaming }
}`;

const EDIT_MESSAGE_MUTATION = `mutation EditMessage($id: ID!, $body: JSON!, $streaming: Time) {
  editMessage(id: $id, body: $body, streaming: $streaming) { id room user body timestamp source streaming }
}`;

const MESSAGE_ADDED_SUBSCRIPTION = `subscription MessageAdded($room: String!) {
  messageAdded(room: $room) { id room user body timestamp source streaming }
}`;

const MESSAGE_ADDED_BY_FOLDER_SUBSCRIPTION = `subscription MessageAddedByFolder($folder: String!) {
  messageAdded(folder: $folder) { id room user body timestamp source streaming }
}`;

// ---------------------------------------------------------------------------
// Client API (typed using generated types)
// ---------------------------------------------------------------------------

export class UchatClient {
  private endpoint: string;
  private wsUrl: string;

  constructor(serverUrl: string) {
    const base = serverUrl.replace(/\/+$/, "");
    this.endpoint = `${base}/graphql`;
    this.wsUrl = `${base.replace(/^http/, "ws")}/graphql`;
  }

  async rooms(folder?: string): Promise<RoomsQuery> {
    return gql<RoomsQuery>(this.endpoint, ROOMS_QUERY, { folder: folder ?? null });
  }

  async createRoom(name: string, folder?: string, description?: string): Promise<CreateRoomMutation> {
    return gql<CreateRoomMutation>(this.endpoint, CREATE_ROOM_MUTATION, { name, folder: folder ?? null, description: description ?? null });
  }

  async messages(room: string): Promise<MessagesQuery> {
    return gql<MessagesQuery>(this.endpoint, MESSAGES_QUERY, { room });
  }

  async sendMessage(
    room: string,
    user: string | undefined,
    body: Record<string, unknown>,
    source: string = "api",
    streaming?: string | null,
  ): Promise<SendMessageMutation> {
    if (!user) {
      user = Deno.hostname();
    }
    return gql<SendMessageMutation>(this.endpoint, SEND_MESSAGE_MUTATION, {
      room,
      user,
      body,
      source,
      streaming: streaming ?? null,
    });
  }

  async editMessage(
    id: string,
    body: Record<string, unknown>,
    streaming?: string | null,
  ): Promise<EditMessageMutation> {
    return gql<EditMessageMutation>(this.endpoint, EDIT_MESSAGE_MUTATION, {
      id,
      body,
      streaming: streaming ?? null,
    });
  }

  watch(
    room: string,
    onMessage: (msg: MessageAddedSubscription["messageAdded"]) => void,
  ): { close: () => void } {
    return subscribe<MessageAddedSubscription>(
      this.wsUrl,
      MESSAGE_ADDED_SUBSCRIPTION,
      { room },
      (data) => onMessage(data.messageAdded),
      (err) => console.error("[watch] error:", err),
    );
  }

  watchFolder(
    folder: string,
    onMessage: (msg: MessageAddedSubscription["messageAdded"]) => void,
  ): { close: () => void } {
    return subscribe<MessageAddedSubscription>(
      this.wsUrl,
      MESSAGE_ADDED_BY_FOLDER_SUBSCRIPTION,
      { folder },
      (data) => onMessage(data.messageAdded),
      (err) => console.error("[watchFolder] error:", err),
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function formatMessage(m: {
  id: string;
  user: string;
  body: Record<string, unknown>;
  timestamp: string;
}): string {
  const text =
    typeof m.body?.body === "string" ? m.body.body : JSON.stringify(m.body);
  const ts = new Date(m.timestamp).toISOString();
  return `[${ts}] ${m.user}: ${text}  (${m.id})`;
}

async function readAll(reader: Deno.Reader & { readable: ReadableStream<Uint8Array> }): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of reader.readable) {
    chunks.push(chunk);
  }
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function getClient(opts: { url?: string }): UchatClient {
  const serverUrl = opts.url ?? Deno.env.get("UCHAT_URL") ?? "http://localhost:6767";
  return new UchatClient(serverUrl);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

if (import.meta.main) {
(async () => {
const { Command } = await import("jsr:@cliffy/command@1");

await new Command()
  .name("uchat")
  .version("0.1.0")
  .description("Deno CLI client for uchat")
  .globalOption("--url <url:string>", "Server URL (env: UCHAT_URL)", {
    default: undefined,
  })
  .command("rooms", "List rooms")
  .option("--folder <folder:string>", "Filter by folder")
  .action(async (opts) => {
    const { rooms } = await getClient(opts).rooms(opts.folder);
    for (const r of rooms) {
      const prefix = r.folder ? `[${r.folder}] ` : "";
      console.log(`${prefix}${r.name}`);
    }
  })
  .command("create-room", "Create a room (use folder/name for foldered rooms)")
  .arguments("<name:string>")
  .option("--folder <folder:string>", "Folder to group the room under (alternative to folder/name syntax)")
  .action(async (opts, name) => {
    let folder = opts.folder;
    // Support "folder/name" syntax as a shorthand
    if (!folder && name.includes("/")) {
      const slashIdx = name.indexOf("/");
      folder = name.slice(0, slashIdx);
      name = name.slice(slashIdx + 1);
    }
    const { createRoom } = await getClient(opts).createRoom(name, folder);
    const prefix = createRoom.folder ? ` in folder "${createRoom.folder}"` : "";
    console.log(`Created room: ${createRoom.name} (position ${createRoom.position}${prefix})`);
  })
  .command("messages", "Show messages in a room")
  .arguments("<room:string>")
  .action(async (opts, room) => {
    const { messages } = await getClient(opts).messages(room);
    for (const m of messages) console.log(formatMessage(m));
  })
  .command("send", "Send a message (reads from stdin if no text given)")
  .arguments("<room:string> [text...:string]")
  .option("--user <user:string>", "Username (default: hostname)")
  .option("--format <format:string>", "Message format (e.g. ansi)")
  .option("--cols <cols:integer>", "Terminal column width (stored with message; used with --format ansi)", { default: 120 })
  .action(async (opts, room, ...textParts) => {
    let text: string;
    if (textParts.length > 0) {
      text = textParts.join(" ");
    } else {
      const buf = await readAll(Deno.stdin);
      text = new TextDecoder().decode(buf);
    }
    const body: Record<string, unknown> = { body: text };
    if (opts.format) body.format = opts.format;
    if (opts.format === "ansi") body.cols = opts.cols;
    const { sendMessage } = await getClient(opts).sendMessage(room, opts.user, body);
    console.log(formatMessage(sendMessage));
  })
  .command("capture", "Run a command with a PTY and send its output as an ANSI message\n\n  Example: uchat capture general fastfetch")
  .arguments("<room:string> [cmd...:string]")
  .option("--user <user:string>", "Username (default: hostname)")
  .option("--cols <cols:integer>", "Terminal column width (default: 120)", { default: 120 })
  .action(async (opts, room, ...cmdParts) => {
    if (cmdParts.length === 0) {
      console.error("Error: no command specified. Usage: uchat capture <room> <command...>");
      Deno.exit(1);
    }
    const cols = opts.cols;
    const cmd = cmdParts.join(" ");
    // Use script(1) to run the command under a PTY so programs that detect
    // whether stdout is a terminal (like fastfetch) output colors and layout.
    // -q: quiet (no "Script started/done" header), -c: command, /dev/null: discard typescript log.
    const proc = new Deno.Command("script", {
      args: ["-qc", `COLUMNS=${cols} ${cmd}`, "/dev/null"],
      stdout: "piped",
      stderr: "inherit",
    });
    const result = await proc.output();
    if (!result.success) {
      console.error(`Command exited with code ${result.code}`);
      Deno.exit(result.code);
    }
    const text = new TextDecoder().decode(result.stdout);
    const body: Record<string, unknown> = { body: text, format: "ansi", cols };
    const { sendMessage } = await getClient(opts).sendMessage(room, opts.user, body);
    console.log(formatMessage(sendMessage));
  })
  .command("edit", "Edit a message")
  .arguments("<id:string> <text...:string>")
  .action(async (opts, id, ...textParts) => {
    const text = textParts.join(" ");
    const { editMessage } = await getClient(opts).editMessage(id, {
      body: text,
    });
    console.log(formatMessage(editMessage));
  })
  .command("watch", "Watch a room for new messages")
  .arguments("<room:string>")
  .action(async (opts, room) => {
    console.error(`Watching room "${room}"... (Ctrl+C to stop)`);
    getClient(opts).watch(room, (msg) => {
      console.log(formatMessage(msg));
    });
    await new Promise(() => {});
  })
  .command("watch-folder", "Watch all rooms in a folder")
  .arguments("<folder:string>")
  .action(async (opts, folder) => {
    console.error(`Watching folder "${folder}"... (Ctrl+C to stop)`);
    getClient(opts).watchFolder(folder, (msg) => {
      console.log(formatMessage(msg));
    });
    await new Promise(() => {});
  })
  .parse(Deno.args);
})();
}

