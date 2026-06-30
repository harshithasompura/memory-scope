# Postmortem: Shared JWT Secret Flagged in Third-Party Integration Security Review

Date: 2024-06-17
Severity: SEV3 (caught pre-incident, in security review)
Related: ADR-004 (JWT Bearer Auth)

## Summary

While onboarding our first third-party API partner, the security review
flagged ADR-004's single shared HS256 secret as a problem: any party able to
verify tokens (now including a partner's verification service) can also
mint forged tokens with arbitrary user IDs, because HS256 is symmetric.

## Root cause

ADR-004 assumed JWT verification would only ever happen inside our own
backend ("fine while it's all one backend" — explicitly flagged as a future
liability in the ADR itself). That assumption broke the moment a
third-party service needed to verify tokens.

## Correction

ADR-004's HS256-shared-secret recommendation is now superseded. See ADR-007:
switch to OAuth 2.0 / OIDC with RS256 (asymmetric) signing, so the private
signing key never leaves our auth server and partners only ever hold the
public verification key.

## Impact

No exploit occurred — caught in review before the partner integration shipped.
