# Security and authorization model

## Principles

- Minimum necessary access; read-only analytics and CRM roles by default.
- Provider and Supabase service-role keys remain server-only.
- Public intake validates shape, limits competitors, validates URL protocol, and rate-limits repeated IP fingerprints in D1.
- Demo write actions are clearly disabled or labeled as local preview behavior.
- No shared passwords. Production connections must use scoped user roles or delegated credentials.

## Tenant isolation

Organization-owned Supabase tables enable row-level security. Membership checks derive access from `organization_members`; write policies require an owner or analyst role where appropriate. The browser receives an ordinary user token, never the service role.

## Deployment requirements

Before accepting real customer data, configure the legal entity, counsel-approved terms/privacy language, production Supabase project, refresh-token rotation, incident contacts, retention schedule, access revocation process, and monitored secret management.
