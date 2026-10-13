# AgentDesk: Critical review (22 findings)

**Review date:** 2026-10-13  
**Scope:** Static review of the default branch source, deployment configuration, CSS and existing CI. This is not a penetration test or live browser test. Findings are classified as confirmed code issues or verification risks so untested assumptions are not presented as proven defects.

## Findings

| # | Area | Finding | Severity | Disposition |
|---:|---|---|---|---|
| 1 | Theme tokens | Several referenced CSS variables have no stylesheet definition: `--ad-danger`, `--lux-bg`, `--lux-border`, `--lux-text`. A missing variable invalidates the property unless a fallback is supplied. | Medium | **Fixed in this PR:** canonical root fallback tokens added. |
| 2 | Theme tokens | Dashboard shell uses `--ad-background`, `--ad-text`, `--ad-surface`, `--ad-border`, `--ad-primary` in selectors but its own token block did not consistently define the full set. | High for UI | **Fixed in this PR:** shell token defaults added. |
| 3 | CSS architecture | `src/index.css` is over 3,200 lines and contains multiple generations of global theme overrides. This makes cascade order hard to reason about and makes one-page fixes regress other pages. | High | Not fully refactored here; needs component-by-component visual regression coverage. |
| 4 | CSS architecture | Theme tokens are redefined in multiple scopes and at multiple points. A change can affect only some surfaces depending on DOM scope. | Medium | Partially mitigated by root fallbacks; full token consolidation remains. |
| 5 | Design consistency | Early global body defaults use slate/navy colors while the product's later dashboard theme uses charcoal/off-white/pink. | Medium | Needs route-by-route visual review; changing all surfaces blindly could damage the public landing page. |
| 6 | Design consistency | Broad attribute selectors such as `[class*="bg-blue-"]` and `[class*="text-gray-"]` can override semantic states, provider badges and nested content, not just intended cards. | High for UI | Needs replacement with component-scoped semantic classes and screenshots. |
| 7 | Design consistency | Solid-fill overrides affect buttons, icon tiles and status panels through overlapping selectors; icon-only accents can become filled panels or lose their original state colors. | Medium | Needs targeted component styles and visual regression tests. |
| 8 | Layout | Sidebar positioning has accumulated multiple historical overrides, which caused navbar clipping and vertical offset regressions in the supplied screenshots. | High for UI | Current offset is kept as-is in this PR; don't add another override without browser measurement. |
| 9 | Layout | The console shell, document and root backgrounds are styled in separate rules. Different page heights can expose the root background below short content. | Medium | Current shell has explicit charcoal background; verify deployed route backgrounds and short-page behavior. |
| 10 | Accessibility | Contrast has been addressed with broad color remapping rather than a contrast-tested semantic palette. Some combinations may still fail WCAG contrast. | High | Needs automated contrast checks and manual review of actual rendered states. |
| 11 | Accessibility | The existing source-check script checks route strings, not keyboard navigation, focus visibility, accessible names or modal focus management. | Medium | Needs browser-based accessibility tests. |
| 12 | API reliability | There are two similar `safeFetchJson` implementations in `src/lib/dbService.ts` and `src/lib/apiClient.ts`; their response/error behavior differs. | Medium | Consolidation deferred until call sites are mapped to avoid breaking contracts. |
| 13 | API reliability | The `dbService` helper throws on non-2xx and returns raw JSON, while `apiClient` normalizes errors and may return failure objects. Callers can handle equivalent failures inconsistently. | Medium | Needs call-site migration and tests. |
| 14 | Tenant isolation | `tenantMiddleware.ts` derives a tenant identifier from request headers, query, path or body. This helper alone does not prove the tenant is authorized for the authenticated user. | Critical to verify | Verify each mounted route combines session-derived authorization with tenant selection. No isolation logic changed here. |
| 15 | Tenant isolation | The tenant middleware exposes the selected tenant identifier in `X-Tenant-Context`. Confirm this debugging header is needed in production and does not disclose identifiers unnecessarily. | Low/Medium | Review needed; not changed without confirming clients depend on it. |
| 16 | Database security | PostgreSQL TLS is configured with `rejectUnauthorized: false` for remote hosts, which encrypts traffic but does not validate the server certificate. | High | Needs provider CA/configuration plan before changing, to avoid breaking production connectivity. |
| 17 | Rate limiting | Rate-limit checks use PostgreSQL when available, but the middleware catches errors and calls `next()`, failing open during store/database errors. | High | Needs explicit availability/security policy and outage tests before changing. |
| 18 | Rate limiting | The limiter has an in-memory map as an acceleration/fallback path; per-process state cannot guarantee a shared quota across multiple instances. | Medium/High | Needs production deployment topology confirmation and shared-store tests. |
| 19 | CI reproducibility | CI and Docker use `npm install`, while the repository tree includes `bun.lock` and no `package-lock.json`. Dependency resolution can change between builds. | Medium | Needs a deliberate single package-manager decision and lockfile migration. |
| 20 | Testing/deployment | Existing CI runs typecheck, build and selected smoke/E2E checks, but it does not test the screenshot-specific sidebar alignment, visual contrast, all payment currencies/providers, or tenant access matrix. | High | Add browser-level regression and authorization matrix tests before declaring production readiness. |
| 21 | Admin permissions / integrations | The agreed product boundary is that **Integrations belongs to Platform Admin only** and must not appear as a Business Admin section. The Platform Admin must retain access to integration configuration. Any Business Admin navigation, route or UI that exposes a tenant integrations section would violate this decision; verify navigation and direct-route authorization, not just whether the menu item is hidden. | High | Product requirement confirmed from prior decisions; audit current routes and navigation, then add role-based tests. |
| 22 | Business owner onboarding / authentication | The current admin workflow does not successfully create usable login credentials for a Business Owner. This blocks owner onboarding even if the business/tenant record is created. The workflow needs a secure owner-user creation path, tenant/role assignment, credential setup or invitation, and clear success/failure feedback; do not create or expose plaintext default passwords. | Critical to onboarding | User-reported functional defect; trace the create-business and user-provisioning paths, then add an end-to-end test proving the owner can sign in and is restricted to their own tenant. |

## Additional product requirements / reported defect

- **Integrations visibility:** Keep integration management in Platform Admin only. Do not add an Integrations section to Business Admin. Verify both navigation visibility and server-side access controls so hiding a menu item is not the only protection.
- **Business Owner credentials:** The user reports that login credentials cannot currently be created for a Business Owner. Treat this as a blocking onboarding defect. Investigate whether the owner user is being created, assigned the correct tenant and role, and given a secure credential setup/invitation path. This is documented, not yet fixed by this CSS-focused PR.

## Changes included in this PR

1. Added root fallback definitions for the missing theme tokens `--ad-danger`, `--lux-bg`, `--lux-border`, and `--lux-text`.
2. Added the missing canonical dashboard tokens to the console shell so surfaces and text do not rely on undefined custom properties.

## Not claimed as fixed

This PR does **not** claim all 22 findings are fixed. Several are architecture/security risks that need targeted tests and careful changes. In particular, tenant authorization, payment processing, database TLS and rate-limit behavior must not be changed by guesswork.

## Required next validation

- Run the existing verification workflow.
- Check contrast for rendered text/status states.
- Browser-test the sidebar and short-page background at desktop and mobile widths.
- Test tenant A against tenant B for every read/write route.
- Test Razorpay INR and PayPal USD/GBP success, cancellation, duplicate webhook and retry paths.
- Confirm production PostgreSQL certificate requirements before enabling certificate verification.
