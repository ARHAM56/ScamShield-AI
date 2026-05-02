# Security Specification for Sentinel Core

## 1. Data Invariants
- A User document must match the authenticated UID.
- SIEM Logs are immutable once created (create-only for users, or restricted to system).
- API Keys are sub-resources of a User and must be managed only by that user.

## 2. The Dirty Dozen Payloads (Test Cases)
1. Creating a user with a UID different from auth.uid.
2. Updating `username` to a 2MB string.
3. Creating a SIEM log with severity `ULTRA_CRIT` (invalid enum).
4. Deleting another user's API key.
5. Listing all SIEM logs without authentication.
6. Spoofing `createdAt` to a date in the past.
7. Injecting special characters into a document ID.
8. Updating an immutable `phone` field.
9. Creating a user profile without a `username`.
10. Reading another user's user document.
11. Large payload attack on `message` field in SIEM logs.
12. Creating a user with an unverified email (if email verified is required).

## 3. Test Runner (Draft)
The `firestore.rules.test.ts` would verify these boundaries.
