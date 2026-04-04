# uchat

uchat is a simple chat backend intended for use as the bridge of a simple
chatops system with a single human user and N machine users (which may be LLMs
or just regular processes).

# What/why/how?

uchat fills in some of the odd middle ground between low level protocols like
MQTT or building blocks like Redis and something that is a fully featured
self-hostable system like Matrix or Zulip, with a UI that has features
specifically dealing with agents and terminal outputs.

Notably, we simplify implementation by entirely ignoring the following concerns:

- Cryptography and authentication (it is assumed uchat is running under a VPN
  which handles both of these)

- User management, permissions (it is assumed clients are trusted and global
  visibility of chat is fine)

And some interesting features:

- A single-file Deno CLI that can be copied around and used to interact with
  the system

- Supports streaming ouptut

- Can render terminal output and agent tool calls / streaming responses richly

I made uchat because my personal infra was getting to the point where I wanted
something like this, but I found most options too featureful and operationally
heavy.

uchat is a Go application that uses sqlite as its backend, with a React
frontend and a Deno CLI app. It is mostly vibe coded and may contain slop, and
this README may also contain slop but was written entirely by a human.

