#!/usr/bin/env -S deno run --allow-net --allow-env --allow-sys=hostname
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
