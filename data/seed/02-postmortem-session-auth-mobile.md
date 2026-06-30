# Postmortem: Mobile App Login Broken by Cross-Origin Cookies

Date: 2024-03-01
Severity: SEV2
Related: ADR-001 (Server-Side Session Auth)

## Summary

The new mobile app (React Native, calling the API from a non-browser
context) could not maintain login state. Session cookies set by the API
were not being persisted/sent by the mobile HTTP client the way they are by
a browser, causing every authenticated request to silently fall back to
anonymous.

## Root cause

ADR-001's session-auth design assumed all clients are browsers that honor
HttpOnly cookies automatically. This assumption was correct in January 2024
when only the web client existed, but became wrong once a mobile client was
added in March 2024. Cookie-based session auth does not transfer cleanly to
non-browser HTTP clients without extra plumbing (manual cookie jar
management), which the mobile team had not built.

## Correction

ADR-001's recommendation (server-side session + cookie) is now superseded.
See ADR-004: switch to JWT bearer tokens passed in the `Authorization`
header, which works identically for browser and non-browser clients.

## Impact

~3 hours of mobile users unable to log in after the mobile app's launch.
No data loss. Web client unaffected.
