# ADR-001: Use Server-Side Session Auth

Date: 2024-01-12
Status: Accepted (superseded by ADR-004, 2024-03-02)
Author: platform-team

## Context

We need to authenticate users across the API and the web client. Traffic is
low (under 5k DAU), all clients are first-party (no third-party API
consumers), and the infra team wants to avoid managing token signing keys.

## Decision

Use server-side sessions: on login, the server creates a session row in
Postgres, sets an HttpOnly cookie with the session ID, and looks up the
session on every request. Session store is a single Postgres table
`sessions(id, user_id, created_at, expires_at)`.

## Consequences

- Simple revocation: delete the row, session is dead immediately.
- No token signing/rotation infra needed.
- Requires a DB round-trip on every authenticated request.
- Does not scale well to multiple first-party clients (mobile app) without
  sharing cookie-based auth, which is awkward cross-origin.

## Rationale recorded for future reference

We explicitly rejected JWTs here because immediate revocation mattered more
than avoiding the DB round-trip, and we had no mobile client yet.
