# ADR-002: Open a New DB Connection Per Request

Date: 2024-02-05
Status: Accepted (superseded by ADR-006, 2024-05-20)
Author: backend-team

## Context

Early in the project (low traffic, single backend instance), we needed a
simple, correct way to talk to Postgres without worrying about connection
lifecycle bugs (stale connections, leaked transactions across requests).

## Decision

Open a fresh `psycopg2` connection at the start of each request, close it
at the end. No pooling. Simplicity prioritized over throughput at this
traffic level (~50 req/s peak).

## Consequences

- Zero risk of one request's transaction state leaking into another's.
- Each request pays full TCP+TLS+auth handshake cost to Postgres.
- Will not scale past Postgres's max_connections limit as traffic grows —
  flagged at the time as "revisit when peak req/s gets within 5x of
  max_connections."
