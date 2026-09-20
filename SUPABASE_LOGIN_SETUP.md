# Apple and Google login for RELUSTT

Verified against the official provider documentation on 2026-09-20. Provider settings have not been changed by this document. Use RELUSTT's existing Supabase project, not the reference boilerplate's project.

**Current setup, 2026-09-21:** Apple and Google are enabled in the actual project and provider authorization redirects respond correctly. The Site URL and web/app redirect allowlist below are saved. Real OAuth account creation and the complete purchase-to-app flow remain to be tested. These instructions are a maintenance reference; do not recreate working clients or paste secrets into source. See `ACCESS_VERIFICATION_2026-09-21.md`.

## 1. Shared addresses

Open [Supabase](https://supabase.com/dashboard/project/bnycfsujwbusxyeqnrhf) → Authentication → URL Configuration.

| Setting | RELUSTT value |
| --- | --- |
| Site URL | `https://relustt.site` |
| Website activation redirect allowlist | `https://relustt.site/activate*` (the existing flow appends `?session_id=...`) |
| iOS redirect allowlist | `relustt://auth/callback` |
| Preview redirect allowlist | Add the specific deployed preview host's `/activate*` URL |
| Callback entered in Google/Apple consoles | `https://bnycfsujwbusxyeqnrhf.supabase.co/auth/v1/callback` |

The provider callback and the app redirect are different: Google/Apple returns to Supabase; Supabase then returns to `/activate` or the app. Avoid wildcard hosts in Production. Local port 8000 is currently a static preview, so it cannot perform the API-backed purchase/activation flow.

[Supabase redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls).

## 2. Google

1. Open [Google Cloud Console](https://console.cloud.google.com/) and select or create your own RELUSTT project.
2. Open **Google Auth Platform → Branding**. Enter RELUSTT, the support email, homepage and privacy/terms URLs. Configure **Audience** for the users you intend to admit; add test users while in testing.
3. Under **Data Access**, use `openid`, email and profile scopes for login.
4. Open **Clients → Create client → Web application**. Name it RELUSTT Web.
5. Add `https://relustt.site` to **Authorized JavaScript origins**; add the preview origin when needed.
6. Put the shared Supabase callback above in **Authorized redirect URIs**. Create the client.
7. In **Supabase → Authentication → Sign In / Providers → Google**, enable the provider. Paste Google's **Client ID** into **Client IDs**, and **Client secret** into **Client Secret**. Save.
8. Test with an allowed account, then update the Google audience/publishing status before public launch.

The current iOS implementation also uses Supabase's browser OAuth flow. If you later adopt the native Google SDK, add its client ID while keeping the web ID first.

Sources: [Supabase Google setup](https://supabase.com/docs/guides/auth/social-login/auth-google), [Google OAuth clients](https://support.google.com/cloud/answer/15549257).

## 3. Apple

1. Open [Apple Developer → Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list). Use the team that owns RELUSTT.
2. Open the existing app's **App ID** and enable **Sign in with Apple**. Keep that capability in Xcode's Signing & Capabilities.
3. Under **Identifiers**, add a **Services ID** for web sign-in, for example `site.relustt.web` if available. This is a new identifier you register, not an existing credential supplied here.
4. Open the Services ID → **Sign in with Apple → Configure**. Select RELUSTT's primary App ID.
5. Enter `bnycfsujwbusxyeqnrhf.supabase.co` under **Domains and Subdomains** and the shared Supabase callback above under **Return URLs**. Save the configuration.

These identifier/domain steps follow [Apple's web sign-in guide](https://developer.apple.com/help/account/capabilities/configure-sign-in-with-apple-for-the-web/).

6. Under **Keys**, create a Sign in with Apple key associated with that primary App ID. Save the downloaded `.p8` privately. Record its **Key ID** and your **Team ID**.
7. Use the client-secret generator in [Supabase's Apple guide](https://supabase.com/docs/guides/auth/social-login/auth-apple) with the Team ID, Services ID, Key ID and `.p8` to generate the signed client-secret JWT.
8. In **Supabase → Authentication → Sign In / Providers → Apple**, enable Apple. Put the **Services ID first** in **Client IDs**, and the generated JWT in **Secret Key**. Add the app bundle ID as another client ID only if using native identity-token login.
9. Regenerate and replace the JWT before its expiry; Apple's OAuth client secret lasts at most six months. Keep the signing `.p8` private and available for rotation.

### Credential placement

| Credential | Destination |
| --- | --- |
| Google web Client ID | Supabase Google provider → Client IDs |
| Google Client secret | Supabase Google provider → Client Secret |
| Apple Services ID | Supabase Apple provider → Client IDs, first entry |
| Apple Team ID, Key ID and `.p8` | Inputs to generate the Apple JWT; `.p8` stays private |
| Generated Apple client-secret JWT | Supabase Apple provider → Secret Key |
| Supabase publishable key | Website public config and iOS client configuration |
| Supabase service-role key | Vercel server environment only |

No provider secret belongs in browser JavaScript, Git, the quiz answers, or chat. The Apple secret is the generated JWT, not the text of the `.p8` file.

## 4. Verify the actual RELUSTT journey

Configure the website's own `.env.example` values in a backend-enabled Preview environment. Complete a Stripe test purchase, choose Apple/Google on `/activate`, and check **Supabase → Authentication → Users** for the account. OAuth creates the Auth account at sign-in; payment alone does not fabricate a login.

Check that the subscription belongs to that UUID and that `relustt_quiz_profiles.user_id` matches it. Sign into the updated iOS app with the same provider/account. Its profile fetch uses that authenticated UUID and must return the purchased answers. Test a second account and verify it cannot read the first account's answers.

Apple's private relay address can differ from a Google email address. Tell customers to use the same sign-in method after purchase and in the app; do not merge accounts merely because typed emails resemble one another.

Database rollout and reports: [FUNNEL_TRACKING.md](FUNNEL_TRACKING.md).
