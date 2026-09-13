# AgentDesk — Billing & Payment Architecture Documentation

## 1. Executive Summary

AgentDesk provides an enterprise-grade, multi-tenant billing and payment system integrating **Razorpay** as the sole payment gateway for international recurring subscriptions and one-time implementation setup fees across INR, USD, and GBP.

### Supported Currencies
The billing system strictly enforces support for three primary operational currencies:
1. **USD ($)** — United States Dollar
2. **INR (₹)** — Indian Rupee
3. **GBP (£)** — British Pound Sterling

> **Currency Restriction Directive**: AgentDesk strictly forbids adding unsupported currencies. All pricing models and invoice ledgers operate exclusively in USD, INR, and GBP.

---

## 2. Gateway Capabilities & Routing Rules

| Provider | Supported Currencies | Recurring Subscriptions | One-Time Payments | Key Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **Razorpay** | `INR`, `USD`, `GBP` | **Supported** (e-Mandates, International Cards) | **Supported** (Cards, UPI, NetBanking) | HTTP Basic Auth, HMAC-SHA256 Signatures |

---

## 3. Architecture & Code Structure

```
├── /src/server/billing/
│   ├── paymentProvider.ts     # Provider abstraction interface and shared data models
│   ├── razorpayProvider.ts    # Razorpay API client with HMAC-SHA256 signature verification
│   ├── billingService.ts      # Multi-tenant state engine, transaction ledger, and idempotency store
│   └── billingRouter.ts       # Express router mounting /api/billing/* and /api/webhooks/*
├── /src/components/
│   ├── BillingDashboard.tsx   # Live subscription overview, usage tracking, statements & payment methods
│   └── PaymentCheckoutModal.tsx # Interactive tokenized checkout for setup fees and plan changes
└── /.env.example              # Credentials reference for Razorpay production keys
```

---

## 4. API Endpoints Reference

### Public & Tenant Configuration
- `GET /api/billing/config?currency=USD&country=US`
  - Returns supported currencies, active gateway providers, public publishable keys, and operational mode.
- `GET /api/billing/tenant/:businessId`
  - Returns multi-tenant billing record, active payment methods, invoice statements, and real transaction history.

### Checkout & Subscription Lifecycle
- `POST /api/billing/create-checkout-session`
  - Initializes an implementation fee order or monthly subscription stream with Razorpay.
- `POST /api/billing/verify-payment`
  - Server-side verification of payment tokens and signatures; activates subscription and issues an invoice ledger entry.
- `POST /api/billing/subscription/update`
  - Upgrades or downgrades tenant plan tier (Starter, Growth, Scale, Enterprise, Enterprise Custom).
- `POST /api/billing/subscription/pause`
  - Pauses automated recurring fee collection.
- `POST /api/billing/subscription/resume`
  - Re-activates automated recurring collection.
- `POST /api/billing/subscription/cancel`
  - Cancels auto-renewal at period end.

### Payment Method Management
- `POST /api/billing/payment-methods/add`
  - Stores a safe, tokenized payment method (Card Brand, Last 4 digits, Expiry, Provider Token).
- `POST /api/billing/payment-methods/set-primary`
  - Sets a specific payment method as the default charging instrument.
- `POST /api/billing/payment-methods/remove`
  - Removes a payment method. **Safety Rule:** Prevents deleting the sole payment method if the tenant has an active subscription.

### Webhook Ingestion
- `POST /api/webhooks/razorpay` (or `POST /api/billing/webhooks/razorpay`)
  - Handles `payment.captured`, `subscription.activated`, `subscription.paused`, `subscription.cancelled` with HMAC signature verification and idempotency check.

---

## 5. Security & Multi-Tenant Isolation

1. **Zero Raw Card Storage**:
   AgentDesk strictly adheres to PCI-DSS Level 1 principles. The database and client application never store raw credit card numbers, CVVs, or bank credentials. All payment methods are referenced using provider vault tokens (`tok_...`, `vault_...`).
2. **Secret Isolation**:
   `RAZORPAY_KEY_SECRET` is strictly kept server-side inside `server.ts` and `billingService.ts` and is never exposed to the client.
3. **Multi-Tenant Scoping**:
   All billing records, transactions, payment methods, and invoices are strictly indexed and partitioned by `businessId`.
4. **Idempotent Webhooks**:
   Incoming webhook event IDs are cached in `processedWebhookEvents` to guarantee that network re-deliveries do not cause duplicate invoice creations or double-billing.

---

## 6. Environment Configuration Guide

Add the following environment variables to your Cloud Run container or `.env` configuration:

```env
# Razorpay Credentials
RAZORPAY_KEY_ID="rzp_live_..."
RAZORPAY_KEY_SECRET="..."
RAZORPAY_WEBHOOK_SECRET="..."
```

When credentials are not set, AgentDesk automatically activates its **Sandbox Simulation Mode**, allowing end-to-end testing of payments, subscriptions, and invoice generation without connecting to live bank rails.
