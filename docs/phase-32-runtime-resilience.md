# Phase 32: Runtime resilience

## Scope
- Correct the production verification workflow's health-test output commands so the shell script contains real line breaks rather than escaped newline text.
- Preserve the existing health endpoint assertions and application behavior.

## Validation
- CI must parse and execute the production startup smoke-test step successfully.
- Confirm the readiness and liveness assertions pass against PostgreSQL-backed startup.

No application UI, colors, authentication, tenant isolation, billing, or integration code is changed.
