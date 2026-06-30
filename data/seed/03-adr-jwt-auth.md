# ADR-004: Switch to JWT Bearer Auth

Date: 2024-03-02
Status: Accepted (supersedes ADR-001) (superseded by ADR-007, 2024-06-18)
Author: platform-team

## Context

Postmortem 2024-03-01 showed server-side session cookies (ADR-001) break
for non-browser clients (mobile). We now have two first-party clients (web,
mobile) and need an auth scheme that works identically for both.

## Decision

Issue short-lived JWTs (15 min expiry) signed with a single HS256 secret on
login. Client sends the JWT in the `Authorization: Bearer` header. Server
verifies the signature and expiry locally — no DB lookup per request.
Refresh via a long-lived refresh token stored server-side (so refresh
tokens remain revocable even though access tokens aren't).

## Consequences

- No DB round-trip for access-token validation, fixes the cross-client cookie
  problem.
- Access tokens cannot be revoked before they expire (15 min blast radius
  accepted as tolerable).
- Single shared HS256 secret means any service that can verify tokens can
  also forge them — fine while it's all one backend, becomes a liability if
  we ever add third-party API consumers or split services.
