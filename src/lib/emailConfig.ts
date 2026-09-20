/**
 * AquaFlow ERP - Transactional Email & Production SMTP Configuration
 * 
 * Supabase Auth sends transactional emails for:
 * 1. Confirmation emails (User sign-up)
 * 2. Magic links
 * 3. Password recovery
 * 4. Workspace invitations
 * 5. Email changes
 * 
 * CRITICAL PRODUCTION NOTICE:
 * The default Supabase built-in SMTP server has a strict rate limit of 3 emails/hour.
 * For production commercial launch, a custom SMTP provider (Resend, Postmark, SendGrid, or AWS SES)
 * MUST be configured in your Supabase Project Dashboard:
 * Settings -> Authentication -> SMTP Settings.
 */

export interface SmtpProviderConfig {
  name: string;
  host: string;
  port: number;
  encryption: 'SSL' | 'TLS';
  usernameKey: string;
  defaultSender: string;
  setupInstructions: string[];
}

export const RECOMMENDED_SMTP_PROVIDERS: Record<string, SmtpProviderConfig> = {
  resend: {
    name: 'Resend (Recommended)',
    host: 'smtp.resend.com',
    port: 465,
    encryption: 'SSL',
    usernameKey: 'resend',
    defaultSender: 'AquaFlow ERP <notifications@yourdomain.com>',
    setupInstructions: [
      '1. Create an account at https://resend.com and verify your custom domain.',
      '2. Generate an API Key under API Keys (starts with re_).',
      '3. In Supabase Dashboard -> Project Settings -> Authentication -> SMTP Settings:',
      '   - Enable Custom SMTP: Checked',
      '   - Sender Email: notifications@yourdomain.com',
      '   - Sender Name: AquaFlow ERP Notifications',
      '   - Host: smtp.resend.com',
      '   - Port: 465 (or 587 with TLS)',
      '   - Minimum Interval: 60 seconds (or leave 0 for unrestricted)',
      '   - User: resend',
      '   - Password: [Your Resend API Key]',
    ],
  },
  postmark: {
    name: 'Postmark',
    host: 'smtp.postmarkapp.com',
    port: 587,
    encryption: 'TLS',
    usernameKey: 'Postmark Server API Token',
    defaultSender: 'AquaFlow Notifications <alerts@yourdomain.com>',
    setupInstructions: [
      '1. Create a server in Postmark and verify Sender Signature.',
      '2. Copy your Server API Token.',
      '3. In Supabase Dashboard -> Authentication -> SMTP Settings:',
      '   - Host: smtp.postmarkapp.com',
      '   - Port: 587',
      '   - User: [Server API Token]',
      '   - Password: [Server API Token]',
    ],
  },
  sendgrid: {
    name: 'Twilio SendGrid',
    host: 'smtp.sendgrid.net',
    port: 587,
    encryption: 'TLS',
    usernameKey: 'apikey',
    defaultSender: 'AquaFlow <no-reply@yourdomain.com>',
    setupInstructions: [
      '1. Create API Key with "Mail Send" permissions.',
      '2. In Supabase SMTP Settings: User is "apikey", Password is the generated SendGrid API Key.',
    ],
  },
  ses: {
    name: 'Amazon Simple Email Service (SES)',
    host: 'email-smtp.us-east-1.amazonaws.com',
    port: 465,
    encryption: 'SSL',
    usernameKey: 'SES SMTP Username',
    defaultSender: 'AquaFlow Operations <system@yourdomain.com>',
    setupInstructions: [
      '1. In AWS Console -> SES -> SMTP Settings -> Create My SMTP Credentials.',
      '2. Use the dedicated IAM SMTP Username and Password in Supabase Dashboard.',
    ],
  },
};

/**
 * Standard email templates for water manufacturing operations
 */
export const EMAIL_TEMPLATES = {
  workspaceInvitation: (params: {
    inviteeName?: string;
    inviterName: string;
    organizationName: string;
    role: string;
    inviteLink: string;
    expiresInDays?: number;
  }) => ({
    subject: `You're invited to join ${params.organizationName} on AquaFlow ERP`,
    text: `Hello ${params.inviteeName || 'Team Member'},\n\n${params.inviterName} has invited you to join the ${params.organizationName} workspace on AquaFlow ERP as a ${params.role.replace('_', ' ').toUpperCase()}.\n\nClick the link below to accept your invitation and activate your account:\n${params.inviteLink}\n\nThis invitation link expires in ${params.expiresInDays || 7} days.\n\nBest regards,\nThe AquaFlow ERP Operations Team`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
          <div style="width: 36px; height: 36px; background: #0066fe; border-radius: 8px; display: inline-block; vertical-align: middle;"></div>
          <span style="font-size: 18px; font-weight: 800; color: #0f172a; margin-left: 8px;">AquaFlow ERP</span>
        </div>
        <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 12px;">Workspace Invitation</h2>
        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 20px;">
          Hello ${params.inviteeName || 'Team Member'},<br/><br/>
          <strong>${params.inviterName}</strong> has invited you to collaborate in the <strong>${params.organizationName}</strong> workspace on AquaFlow ERP with the role of <strong>${params.role.replace('_', ' ').toUpperCase()}</strong>.
        </p>
        <div style="margin: 28px 0; text-align: center;">
          <a href="${params.inviteLink}" style="display: inline-block; padding: 12px 28px; background: #0066fe; color: #ffffff; font-weight: 600; font-size: 14px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 12px rgba(0, 102, 254, 0.25);">
            Accept Workspace Invitation
          </a>
        </div>
        <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 16px;">
          If the button above does not work, copy and paste this link into your browser:<br/>
          <a href="${params.inviteLink}" style="color: #0066fe;">${params.inviteLink}</a><br/><br/>
          This invitation expires in ${params.expiresInDays || 7} days. If you did not expect this invitation, you can safely disregard this email.
        </p>
      </div>
    `,
  }),

  passwordReset: (params: { resetLink: string }) => ({
    subject: 'Reset your AquaFlow ERP account password',
    text: `You recently requested to reset your password for your AquaFlow ERP workspace account.\n\nClick the link below to set a new password:\n${params.resetLink}\n\nIf you did not make this request, please contact your security administrator immediately.\n\nBest regards,\nAquaFlow ERP Security`,
  }),
};
