#!/usr/bin/env -S deno run --allow-net --allow-env
//
// Echo bot: watches a room and echoes back messages from the "web" source.
//
// Usage: ./deno/echo-bot.ts <room> [--url http://localhost:6767]
//

import { UchatClient, formatMessage } from "./uchat.ts";

const room = Deno.args[0];
if (!room) {
  console.error("Usage: echo-bot.ts <room> [--url <server-url>]");
  Deno.exit(1);
}

let serverUrl = Deno.env.get("UCHAT_URL") ?? "http://localhost:6767";
const urlIdx = Deno.args.indexOf("--url");
if (urlIdx !== -1 && Deno.args[urlIdx + 1]) {
  serverUrl = Deno.args[urlIdx + 1];
}

const client = new UchatClient(serverUrl);

console.error(`Echo bot watching room "${room}" for web messages... (Ctrl+C to stop)`);

client.watch(room, async (msg) => {
  if (msg.source !== "web") return;
  const text =
    typeof msg.body?.body === "string" ? msg.body.body : JSON.stringify(msg.body);
  console.error(`Echoing message from ${msg.user}: ${text}`);
  const { sendMessage } = await client.sendMessage(room, "echo-bot", { body: text }, "bot");
  console.log(formatMessage(sendMessage));
});

// Keep process alive
await new Promise(() => {});
