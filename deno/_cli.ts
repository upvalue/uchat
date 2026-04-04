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
