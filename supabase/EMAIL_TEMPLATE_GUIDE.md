# Supabase Auth Invitation Email & SMTP Configuration Guide
## H2O Water Management SaaS

This guide provides the exact production configuration required in the **Supabase Dashboard** to ensure invitation emails are delivered reliably and team members can activate their accounts.

---

### 1. Supabase Email Template Configuration

Go to: **Supabase Dashboard → Authentication → Email Templates → Invite User**

#### A. Subject Line
```text
You have been invited to join {{ .SiteURL }}
```

#### B. HTML Message Body
```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
  <div style="margin-bottom: 24px;">
    <h2 style="color: #0284c7; margin: 0 0 8px 0; font-size: 22px; font-weight: 800;">
      H2O Water Management System
    </h2>
    <span style="font-size: 13px; color: #64748b; font-weight: 500;">
      Workspace Invitation & Team Access Setup
    </span>
  </div>

  <p style="font-size: 15px; color: #1e293b; line-height: 1.6; margin: 0 0 16px 0;">
    Hello,
  </p>

  <p style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0 0 24px 0;">
    An administrator has invited you to join the <strong>H2O Water Management System</strong> workspace. To accept your invitation, set your account password, and access your workspace, please click the button below:
  </p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="{{ .ConfirmationURL }}" style="background-color: #0284c7; color: #ffffff; padding: 14px 32px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 8px; display: inline-block; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.25);">
      Accept Invitation & Activate Account
    </a>
  </div>

  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin: 24px 0;">
    <p style="font-size: 12px; color: #64748b; margin: 0 0 6px 0;">
      Button not working? Copy and paste this URL into your browser:
    </p>
    <a href="{{ .ConfirmationURL }}" style="font-size: 12px; color: #0284c7; word-break: break-all;">
      {{ .ConfirmationURL }}
    </a>
  </div>

  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

  <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0;">
    This invitation link will expire in 7 days. If you did not expect this invitation, you can safely ignore this email.<br/>
    For assistance, contact your workspace administrator.
  </p>
</div>
```

---

### 2. URL Configuration (Redirect URLs)

Go to: **Supabase Dashboard → Authentication → URL Configuration**

1. **Site URL**:
   ```text
   https://jjesdrowater-mgtsys.netlify.app
   ```
2. **Redirect URLs (Allow list)**:
   Add the following entries:
   ```text
   https://jjesdrowater-mgtsys.netlify.app/accept-invitation
   https://jjesdrowater-mgtsys.netlify.app/*
   http://localhost:3000/accept-invitation
   http://localhost:3000/*
   ```

---

### 3. Custom SMTP Configuration (Critical for Commercial Delivery)

> **IMPORTANT**: Supabase's default built-in email service has a strict rate limit of **3 emails per hour** for the entire project. In addition, emails sent from the default service may be filtered into spam folders by strict corporate mail servers.
>
> To deliver invitations reliably to all staff, enable a custom SMTP provider in:
> **Supabase Dashboard → Authentication → SMTP Settings**

#### Recommended Providers:

#### Option A: Resend (Recommended)
- **Host**: `smtp.resend.com`
- **Port**: `465` (SSL) or `587` (TLS)
- **User**: `resend`
- **Password**: `[Your Resend API Key, starting with re_]`
- **Sender Email**: `notifications@yourverifieddomain.com`
- **Sender Name**: `H2O Water Management System`

#### Option B: Twilio SendGrid
- **Host**: `smtp.sendgrid.net`
- **Port**: `587`
- **User**: `apikey`
- **Password**: `[Your SendGrid API Key]`
- **Sender Email**: `notifications@yourverifieddomain.com`

#### Option C: Postmark
- **Host**: `smtp.postmarkapp.com`
- **Port**: `587`
- **User**: `[Postmark Server API Token]`
- **Password**: `[Postmark Server API Token]`
- **Sender Email**: `notifications@yourverifieddomain.com`

#### Option D: Amazon SES
- **Host**: `email-smtp.[region].amazonaws.com`
- **Port**: `465` or `587`
- **User**: `[AWS SES IAM SMTP Username]`
- **Password**: `[AWS SES IAM SMTP Password]`

---

### 4. Edge Function Deployment

The server-side invitation Edge Function is located at:
`supabase/functions/invite-user/index.ts`

Deploy command:
```bash
supabase functions deploy invite-user
```
*(Note: JWT verification is enabled by default to secure this administrative operation. Authenticated callers pass their user session JWT via the Authorization header.)*

Edge Function Secrets (configured automatically in Supabase, or verify in Supabase Dashboard → Edge Functions):
- `SUPABASE_URL`: Your Supabase Project URL (`https://<project-ref>.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key (never exposed to browser)
- `APP_URL`: `https://jjesdrowater-mgtsys.netlify.app`
