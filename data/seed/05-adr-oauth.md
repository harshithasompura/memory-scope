# ADR-007: Switch to OAuth 2.0 / OIDC with RS256

Date: 2024-06-18
Status: Accepted (supersedes ADR-004)
Author: platform-team

## Context

Security review (postmortem 2024-06-17) found ADR-004's shared HS256 secret
unsafe once third-party services need to verify our tokens. We need
asymmetric signing so verification doesn't require holding a secret capable
of forging tokens.

## Decision

Adopt OAuth 2.0 / OIDC. Auth server signs access tokens with RS256 using a
private key that never leaves the auth server. Public key is published via
a JWKS endpoint for any verifier (internal services, third-party partners)
to fetch and use for verification only. Access tokens remain short-lived
(15 min, unchanged from ADR-004); refresh-token revocation model unchanged.

## Consequences

- Partners and internal services can verify tokens without ever holding a
  secret that could be used to forge them.
- Adds operational overhead: key rotation policy, JWKS endpoint uptime
  becomes a dependency for every verifier.
- Slightly higher CPU cost for RS256 verification vs HS256, judged
  negligible at our request volume.
