# AgentDesk Department Architecture

AgentDesk uses a department boundary model for internal administration.

## Access model

| Department | Role | Scope |
|---|---|---|
| Platform | PLATFORM_ADMIN | Full control across all departments |
| UI/UX | UI_UX_DESIGNER | Homepage and design system only |
| Security | SECURITY_ADMIN | Security controls, audit and security tooling |
| Hosting | HOSTING_ADMIN | Deployment, hosting and infrastructure controls |
| Integrations | INTEGRATIONS_ADMIN | Provider configuration and integration controls |
| Business | BUSINESS_ADMIN | Business operations and customer workspace controls |

## Rules

1. Platform Admin is the only global owner role.
2. Department roles must not inherit access to another department.
3. Backend authorization is authoritative. Hiding a tab in React is not security.
4. New department APIs should use the centralized department access helper instead of scattered role checks.
5. Tenant/customer authorization remains separate from internal department authorization.
6. Design changes should be stored as versioned configuration, not by rewriting React source files at runtime.
7. UI/UX changes must not change security, billing, integrations or hosting code.
8. Every future department should have its own router, service layer and UI module.

## Homepage Design Studio

The Design Studio stores a controlled JSON design configuration in PostgreSQL.

It controls:
- brand colors
- heading and body fonts
- typography scale
- hero copy
- homepage section visibility
- homepage section order foundation

The public homepage reads this configuration at runtime.

This intentionally does not mutate source code. Runtime source-code rewriting would make deployments unpredictable and could introduce security and rollback problems. The result is still Canva-like from the designer perspective: change the design, publish, and the homepage changes without editing React components.

## Recommended next separation

- src/server/security/
- src/server/hosting/
- src/server/integrations/
- src/server/business/
- src/components/admin/security/
- src/components/admin/hosting/
- src/components/admin/integrations/
- src/components/admin/business/

Each module should expose a small, explicit API and should not import UI/business logic from another department.
