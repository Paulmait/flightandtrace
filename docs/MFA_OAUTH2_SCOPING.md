# MFA and OAuth2/SSO Implementation Scoping for FlightTrace

## MFA (Multi-Factor Authentication)
- **Backend:**
  - Add endpoints for TOTP (Google Authenticator), email, and SMS verification (FastAPI).
  - Store MFA secret per user (encrypted).
  - Enforce MFA on login if enabled.
- **Frontend:**
  - Add screens for MFA setup, code entry, and recovery.
  - UX: Prompt for MFA after password login if enabled.
- **Tech:** Use `pyotp` for TOTP, Twilio/SendGrid for SMS/email, QR code for setup.

## OAuth2/SSO
- **Backend:**
  - Add endpoints for OAuth2 login (Google, Microsoft, etc.) using `authlib` or `fastapi-users`.
  - Map OAuth2 users to internal user records.
- **Frontend:**
  - Add OAuth2 login buttons (Google, Microsoft, etc.).
  - Handle redirect/callback and token exchange.
- **Tech:** Use Supabase Auth or FastAPI OAuth2 integrations.

## Next Steps
- Scaffold backend endpoints and frontend screens/components for both features.
- Add feature flags to enable/disable in production.
- Update documentation and onboarding flows.
