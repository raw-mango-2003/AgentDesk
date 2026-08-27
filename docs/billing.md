# AI RevenueOS — Real Billing & Payment Architecture Documentation

## 1. Executive Summary

AI RevenueOS provides an enterprise-grade, multi-tenant billing and payment system integrating **Razorpay** and **PayPal** for international recurring subscriptions and one-time implementation setup fees.

### Supported Currencies
The billing system strictly enforces support for three primary operational currencies:
1. **USD ($)** — United States Dollar
2. **INR (₹)** — Indian Rupee
3. **GBP (£)** — British Pound Sterling

> **Currency Restriction Directive**: AI RevenueOS strictly forbids adding unsupported currencies (such as EUR, CAD, AUD, AED, SAR, SGD, NZD). All pricing models and invoice ledgers operate exclusively in USD, INR, and GBP.

---

## 2. Gateway Capabilities & Routing Rules

| Provider | Supported Currencies | Recurring Subscriptions | One-Time Payments | Key Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **Razorpay** | `INR`, `USD`, `GBP` | **Supported** (e-Mandates, Cards) | **Supported** (Cards, UPI, NetBanking) | HTTP Basic Auth, HMAC-SHA256 Signatures |
| **PayPal** | `USD`, `GBP` | **Supported** (Vault Billing Agreements) | **Supported** (Orders API v2) | OAuth2 Client Credentials Bearer Tokens |

### ⚠️ Strict PayPal INR Rule
**PayPal recurring subscriptions do NOT support INR**.
- Any attempt to create an INR subscription or transaction via PayPal is rejected by the server with an explicit validation error:
  `"PayPal does not support INR subscriptions. Please select Razorpay for INR billing."`
- In the user interface, selecting `INR` dynamically recommends Razorpay and disables PayPal recurring options.

---

## 3. Architecture & Code Structure

```
├── /src/server/billing/
│   ├── paymentProvider.ts     # Provider abstraction interface and shared data models
│   ├── razorpayProvider.ts    # Razorpay API client with HMAC-SHA256 signature verification
│   ├── paypalProvider.ts      # PayPal v2 API client with OAuth2 token caching and INR guards
│   ├── billingService.ts      # Multi-tenant state engine, transaction ledger, and idempotency store
│   └── billingRouter.ts       # Express router mounting /api/billing/* and /api/webhooks/*
├── /src/components/
│   ├── BillingDashboard.tsx   # Live subscription overview, usage tracking, statements & payment methods
│   └── PaymentCheckoutModal.tsx # Interactive tokenized checkout for setup fees and plan changes
└── /.env.example              # Credentials reference for Razorpay & PayPal production keys
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
  - Initializes an implementation fee order or monthly subscription stream with the chosen provider.
- `POST /api/billing/verify-payment`
  - Server-side verification of payment tokens and signatures; activates subscription and issues an invoice ledger entry.
- `POST /api/billing/subscription/update`
  - Upgrades or downgrades tenant plan tier (Starter, Growth, Enterprise, Enterprise Custom).
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
- `POST /api/webhooks/paypal` (or `POST /api/billing/webhooks/paypal`)
  - Handles `PAYMENT.CAPTURE.COMPLETED`, `BILLING.SUBSCRIPTION.ACTIVATED`, `BILLING.SUBSCRIPTION.SUSPENDED`, `BILLING.SUBSCRIPTION.CANCELLED`.

---

## 5. Security & Multi-Tenant Isolation

1. **Zero Raw Card Storage**:
   AI RevenueOS strictly adheres to PCI-DSS Level 1 principles. The database and client application never store raw credit card numbers, CVVs, or bank credentials. All payment methods are referenced using provider vault tokens (`tok_...`, `vault_...`).
2. **Secret Isolation**:
   `RAZORPAY_KEY_SECRET` and `PAYPAL_CLIENT_SECRET` are strictly kept server-side inside `server.ts` and `billingService.ts` and are never exposed to the client.
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

# PayPal Credentials
PAYPAL_CLIENT_ID="A..."
PAYPAL_CLIENT_SECRET="..."
PAYPAL_ENVIRONMENT="live" # or "sandbox"
PAYPAL_WEBHOOK_ID="..."
```

When credentials are not set, AI RevenueOS automatically activates its **Sandbox Simulation Mode**, allowing end-to-end testing of payments, subscriptions, and invoice generation without connecting to live bank rails.
