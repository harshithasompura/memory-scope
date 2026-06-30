# ADR-006: Adopt PgBouncer Connection Pooling

Date: 2024-05-20
Status: Accepted (supersedes ADR-002)
Author: backend-team

## Context

Postmortem 2024-05-19 showed per-request connections (ADR-002) exhaust
Postgres `max_connections` under traffic spikes, with no built-in ceiling.

## Decision

Run PgBouncer in transaction-pooling mode between the API and Postgres.
Fixed pool size of 30 server-side connections, regardless of how many
concurrent API requests are in flight (requests queue briefly inside
PgBouncer instead of opening new Postgres connections).

## Consequences

- Decouples request concurrency from DB connection count; traffic spikes
  queue instead of exhausting Postgres.
- Transaction-pooling mode means session-level features (advisory locks,
  prepared statements across requests) are unsafe — audited codebase for
  these before rollout, found none in use.
- Added a single new piece of infra to operate and monitor (pool
  utilization, queue wait time).
