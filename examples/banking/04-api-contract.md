# API Contract — Transfers

> Owner: `api-reviewer` (+ `backend-engineer`). Guarded by `api-change-guard` hook. Source of truth: `openapi/transfers.v1.yaml`; this doc is the human-readable companion.
> Traces to: `03-technical-spec.md`, `adr-0007-idempotent-transfers.md`.

## Overview
Purpose: create and read instant P2P transfers. Style: REST/JSON. Base path: `/v1`.
Version: `v1` (URI-versioned). Introduced in release **v2.4.0**.

## Conventions
- **Versioning:** URI (`/v1`); breaking changes bump to `/v2`. Additive changes stay in `v1`.
- **Auth:** `Authorization: Bearer <JWT>` (short TTL). Object-level authZ: caller must own
  `source_account_id` (else `403`, no existence leak).
- **Idempotency:** `POST /v1/transfers` **requires** an `Idempotency-Key` header (UUID, unique
  per intent, reused verbatim on retry). See adr-0007. Missing → `400`.
- **Errors:** envelope `{ "error": { "code", "message", "details" } }` with correct HTTP status.
- **Money:** `amount_minor` is an **integer** in USD minor units (cents). Never a float/string decimal.
- **Pagination:** cursor-based (`limit` + `cursor`) on list.
- **Rate limits:** 10 transfers/sender/hour (business velocity) + gateway coarse limit; both surface `429`.

## Endpoints

### `POST /v1/transfers`
- **Purpose:** create and synchronously settle a transfer.
- **Auth / scope:** Bearer JWT, scope `transfers:write`, must own source account.
- **Idempotent:** yes — `Idempotency-Key` header required.
- **Request:**
```json
{
  "source_account_id": "acct_9f1c...",
  "dest_account_id":   "acct_3b7e...",
  "amount_minor":      2500,
  "currency":          "USD",
  "memo":              "dinner"
}
```
- **Success (201):**
```json
{
  "transfer_id": "txn_7a2d...",
  "status":      "completed",
  "source_account_id": "acct_9f1c...",
  "dest_account_id":   "acct_3b7e...",
  "amount_minor": 2500,
  "currency": "USD",
  "created_at": "2026-07-01T14:05:22Z"
}
```
- **Responses:**
  | Status | Meaning | `error.code` | Body |
  |--------|---------|--------------|------|
  | 201 | Created & settled (also returned on idempotent replay of same body) | — | transfer |
  | 400 | Validation error / missing `Idempotency-Key` / non-integer amount | `validation_error` | error envelope |
  | 401 | Missing/invalid JWT | `unauthenticated` | error envelope |
  | 403 | Caller does not own source account | `forbidden` | error envelope |
  | 409 | Same `Idempotency-Key`, different request body | `idempotency_key_reuse` | error envelope |
  | 422 | Insufficient funds / recipient not found / self-transfer / out-of-range amount | `insufficient_funds` \| `recipient_not_found` \| `validation_error` | error envelope |
  | 429 | Velocity, daily, or per-transfer limit exceeded | `limit_exceeded` (`details.limit`) | error envelope |
  | 503 | Downstream (account/fraud/DB) unavailable — retryable | `service_unavailable` | error envelope |

### `GET /v1/transfers/{id}`
- **Purpose:** fetch one transfer the caller is party to.
- **Auth:** Bearer JWT, scope `transfers:read`; caller must be sender or recipient.
- **Responses:**
  | Status | Meaning | Body |
  |--------|---------|------|
  | 200 | Found | transfer |
  | 401 | Auth | error envelope |
  | 403 | Not a party to this transfer | error envelope |
  | 404 | Not found | error envelope |

### `GET /v1/transfers`
- **Purpose:** list caller's transfers, newest first.
- **Query:** `limit` (default 20, max 100), `cursor` (opaque), `status` (optional filter).
- **Response (200):**
```json
{
  "data": [ { "transfer_id": "txn_7a2d...", "status": "completed", "amount_minor": 2500, "currency": "USD", "created_at": "2026-07-01T14:05:22Z" } ],
  "page": { "next_cursor": "eyJvZmZzZXQiOjIwfQ==", "has_more": true }
}
```

## Error envelope example
```json
{ "error": { "code": "limit_exceeded", "message": "Daily send limit reached.", "details": { "limit": "daily", "cap_minor": 1000000 } } }
```

## Backward-compatibility checklist
- [x] No field removed/renamed without a version bump.
- [x] New fields optional with safe defaults (`memo` optional).
- [x] Enum additions (`status`) tolerated by clients (documented; unknown-value handling required).
- [x] `Idempotency-Key` requirement documented; clients regenerate SDK from `openapi/transfers.v1.yaml`.
- [x] `amount_minor` typed as integer in schema (guard against float clients).
