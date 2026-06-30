# Postmortem: Postgres max_connections Exhaustion During Traffic Spike

Date: 2024-05-19
Severity: SEV1
Related: ADR-002 (Connection Per Request)

## Summary

A marketing campaign drove a 4x traffic spike (50 -> 200 req/s). Postgres
hit `max_connections` (100) within minutes; new connections were refused,
and the API returned 500s for ~22 minutes until traffic was throttled at
the load balancer as a stopgap.

## Root cause

ADR-002's per-request connection model has no upper bound on concurrent
connections — it scales 1:1 with concurrent in-flight requests. This was
explicitly flagged as a future risk in the ADR ("revisit when peak req/s
gets within 5x of max_connections") but the trigger was never monitored, so
the team did not see the threshold approaching before the spike hit it.

## Correction

ADR-002's no-pooling recommendation is now superseded. See ADR-006: adopt
PgBouncer connection pooling with a fixed pool size well under
max_connections, decoupling request concurrency from DB connection count.

## Impact

22 minutes of elevated 500 rate during a marketing-driven traffic spike.
No data loss; all writes either completed or cleanly failed (no partial
transactions observed).
