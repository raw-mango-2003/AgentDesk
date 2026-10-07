# AgentDesk Control Center Architecture

AgentDesk is designed to be operated by one owner without requiring daily code changes.

## Operating model

There is one internal administrator role:

- PLATFORM_ADMIN: full control of AgentDesk.

Customers have their normal tenant roles and cannot access the Platform Control Center.

The code is still organized into logical modules, but those modules are not exposed as separate departments. This keeps the product easier to operate and maintain.

## Control Center

The Platform Admin should be able to manage normal product configuration from one place:

- Dashboard
- Customers
- AI Employees
- Leads & CRM
- Integrations
- Billing
- Design Studio
- Security
- System

## No-code configuration principle

Normal changes should be configuration-driven rather than source-code-driven.

Examples:

- homepage colors
- fonts
- homepage copy
- section visibility
- branding
- site name
- logo
- public domain value
- pricing configuration
- AI Employee configuration
- integration settings
- feature flags

The application stores safe configuration in PostgreSQL and the frontend reads it at runtime.

## Domain connection

Buying a domain does not require changing React source code. The domain still needs a one-time DNS/Cloudflare setup at the infrastructure layer. After the domain is connected, the canonical domain can be stored in the Control Center.

## Code boundaries

Code should still be separated by technical responsibility:

- authentication and authorization
- design
- business
- AI
- integrations
- billing
- security
- infrastructure
- shared services

These are engineering boundaries, not departments the owner has to switch between.

## Safety rule

The Control Center must never rewrite production source code automatically. It changes validated configuration. Source-code changes remain a development/deployment task.

This makes the system easier to understand, safer to roll back, and much easier for a non-technical owner to operate.
