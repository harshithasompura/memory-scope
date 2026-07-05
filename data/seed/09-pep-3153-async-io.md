# PEP 3153: Asynchronous IO Support

Date: 2011-05-29
Status: Superseded (superseded by PEP 3156, 2012-12-12)
Author: Laurens Van Houtven

## Context

Python has no standard way to do asynchronous IO. Every framework — Twisted,
Tornado, asyncore — ships its own event loop and its own idea of a callback,
so libraries written for one cannot run on another. We need a common
abstraction the standard library can bless.

## Decision

Define a standard separation between **transports** (move bytes over a
connection) and **protocols** (interpret those bytes). A protocol is handed a
transport and reacts to `data_received`, `connection_lost`, and similar
callbacks. This is the interface layer, deliberately abstract.

## Consequences

- Gives frameworks a shared vocabulary for transports and protocols.
- Deliberately specifies **no concrete event loop / reactor**. PEP 3153 defines
  the interfaces but leaves the actual asynchronous engine unspecified.
- Because there is no reference event loop, nothing can actually run against it.
  Adoption stalls: an interface with no implementation is not usable.

## Rationale recorded for future reference

The transport/protocol split is sound and survives. The fatal gap is refusing
to specify the event loop — without one, PEP 3153 is a diagram, not a library.
This is the specific thing the reboot fixes.
