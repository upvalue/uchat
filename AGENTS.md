uchat is a simple chatops system intended for a single user and N machine
users.

Backend in Go with sqlite as the store. Frontend is React, tanstack-router,
react-query. GraphQL is the communication layer. There is a standalone Deno CLI
and library in ./deno for ease of use from the command line.

Tickets live in .tickets, use `ticket --help` to interact with the ticketing system.

Run frontend tests after making frontend changes (`pnpm test`) ; tactically add them if they're not too hard to support.
Run backend tests after making backend changes (`go test ./...`); tactically add them if they're not too hard to support.

# Frontend

Don't use CDN assets, install via package manager.

