# PEP 3156: Asynchronous IO Support Rebooted — the asyncio Module

Date: 2012-12-12
Status: Final (supersedes PEP 3153; shipped as `asyncio` in Python 3.4, 2014)
Author: Guido van Rossum

## Context

PEP 3153 defined transports and protocols but specified no event loop, so it
was never implementable. Meanwhile Twisted, Tornado, and others each ran
incompatible loops. Python needs one concrete, standard-library async engine —
not just an interface.

## Decision

Supersede PEP 3153 with a complete design: a pluggable **event loop**,
**coroutines** driven by `yield from` (later `async`/`await`), **Futures** and
**Tasks** for pending results, and the transport/protocol layer from PEP 3153
kept but now backed by a real loop. Ship it as the `asyncio` module.

## Consequences

- Async IO becomes a batteries-included standard-library feature (`asyncio`),
  Python 3.4+.
- Third-party loops (uvloop) can plug into the same interface.
- Directly supersedes PEP 3153: the transport/protocol ideas live on, but the
  "no event loop" decision is reversed — a concrete loop is now mandatory.

## Rationale recorded for future reference

The reboot keeps what PEP 3153 got right (transport/protocol split) and fixes
what killed it (no engine). Any answer that pointed to PEP 3153 as the standard
async mechanism is now stale — PEP 3156 / `asyncio` is the answer.
