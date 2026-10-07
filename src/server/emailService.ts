import nodemailer, { Transporter } from 'nodemailer';
import dotenv from 'dotenv';

// Ensure environment variables are loaded immediately regardless of ESM import order
dotenv.config();

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface IEmailService {
  /**
   * Send a 6-digit OTP email for new user registration & account activation.
   * Note: The OTP value is never logged to stdout or files.
   */
  sendVerificationOtp(email: string, otp: string, userName?: string): Promise<{ success: boolean; error?: string }>;

  /**
   * Send a 6-digit OTP email for password recovery.
   * Note: The OTP value is never logged to stdout or files.
   */
  sendPasswordResetOtp(email: string, otp: string, userName?: string): Promise<{ success: boolean; error?: string }>;

  /**
   * Send a raw email using the configured Gmail transport.
   */
  sendEmail(options: SendEmailOptions): Promise<{ success: boolean; error?: string }>;

  /**
   * Verify if the SMTP transport is configured with valid credentials.
   */
  isConfigured(): boolean;

  /**
   * Test the live SMTP handshake and authentication against Gmail.
   */
  testConnection(): Promise<{ success: boolean; message: string; details?: any }>;

  /**
   * Inspect SMTP configuration and mode.
   */
  getStatus(): {
    configured: boolean;
    host: string;
    port: number;
    userMasked: string;
    from: string;
    mode: 'live_gmail_smtp' | 'unconfigured';
  };
}

/**
 * Modern HTML Template generator with PocketBalance brand styling,
 * high-contrast 6-digit OTP display, and security warnings.
 */
function buildOtpEmailHtml(params: {
  title: string;
  greeting: string;
  message: string;
  otp: string;
  warningNote: string;
}): string {
  const { title, greeting, message, otp, warningNote } = params;
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0b1120;
      color: #f1f5f9;
    }
    .container {
      max-width: 560px;
      margin: 32px auto;
      background-color: #111827;
      border: 1px solid #1f2937;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
    }
    .header-bar {
      height: 6px;
      background: linear-gradient(90deg, #10b981 0%, #06b6d4 100%);
    }
    .content {
      padding: 36px 32px;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 24px;
    }
    .brand-logo {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #10b981, #0d9488);
      border-radius: 10px;
      display: inline-block;
      text-align: center;
      line-height: 36px;
      font-weight: bold;
      color: #ffffff;
      font-size: 18px;
    }
    .brand-title {
      font-size: 19px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.02em;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 16px 0;
    }
    p {
      font-size: 14px;
      line-height: 1.6;
      color: #94a3b8;
      margin: 0 0 20px 0;
    }
    .otp-card {
      background: #0f172a;
      border: 1.5px dashed #059669;
      border-radius: 16px;
      padding: 24px;
      text-align: center;
      margin: 28px 0;
    }
    .otp-code {
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      font-size: 38px;
      font-weight: 800;
      letter-spacing: 10px;
      color: #34d399;
      margin: 4px 0 10px 0;
      text-shadow: 0 0 20px rgba(52, 211, 153, 0.25);
    }
    .otp-hint {
      font-size: 12px;
      color: #64748b;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
    }
    .warning-box {
      background-color: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.25);
      border-radius: 12px;
      padding: 14px 18px;
      font-size: 12.5px;
      line-height: 1.5;
      color: #fcd34d;
      margin-bottom: 24px;
    }
    .footer {
      border-top: 1px solid #1f2937;
      padding: 20px 32px;
      font-size: 11px;
      color: #475569;
      text-align: center;
      background-color: #0b1120;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-bar"></div>
    <div class="content">
      <div class="brand">
        <span class="brand-logo">PB</span>
        <span class="brand-title">PocketBalance</span>
      </div>

      <h1>${title}</h1>
      <p>Hello <strong>${greeting}</strong>,</p>
      <p>${message}</p>

      <div class="otp-card">
        <div class="otp-hint">Your 6-Digit Verification Code</div>
        <div class="otp-code">${otp}</div>
        <p style="margin: 0; font-size: 12px; color: #10b981; font-weight: 600;">⏱️ Valid for 10 minutes</p>
      </div>

      <div class="warning-box">
        <strong>⚠️ Security Notice:</strong> ${warningNote}
      </div>

      <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">
        If you did not request this email, please ignore it or contact system support immediately.
      </p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} PocketBalance • Personal Income & Expense Management System.<br>
      This is an automated notification. Please do not reply directly to this email.
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Standard Nodemailer implementation supporting pure Gmail SMTP.
 */
export class NodemailerEmailService implements IEmailService {
  private transporter: Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter(): void {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    const user = (process.env.SMTP_USER || process.env.GMAIL_USER || '').replace(/^["']|["']$/g, '').trim();
    const pass = (process.env.SMTP_PASSWORD || process.env.GMAIL_APP_PASSWORD || '')
      .replace(/^["']|["']$/g, '')
      .replace(/\s+/g, '')
      .trim();

    if (user && pass) {
      try {
        const isGmail = host === 'smtp.gmail.com' || user.endsWith('@gmail.com');
        const transportConfig: any = {
          host,
          port,
          secure,
          auth: { user, pass },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 15000,
        };

        if (isGmail) {
          transportConfig.service = 'gmail';
        }

        this.transporter = nodemailer.createTransport(transportConfig);
        console.log(`📧 [EmailService] Gmail SMTP Transport initialized for: ${this.maskUser(user)}`);
      } catch (err: any) {
        console.error('❌ [EmailService] Failed to create nodemailer transport:', err?.message || err);
      }
    } else {
      this.transporter = null;
    }
  }

  private maskUser(user: string): string {
    if (!user || !user.includes('@')) return user || 'not-set';
    const [name, domain] = user.split('@');
    return `${name.slice(0, 2)}***@${domain}`;
  }

  public isConfigured(): boolean {
    const webhookUrl = (process.env.GMAIL_WEBHOOK_URL || process.env.EMAIL_WEBHOOK_URL || '').trim();
    if (webhookUrl) return true;

    const brevoKey = (process.env.BREVO_API_KEY || '').trim();
    if (brevoKey) return true;

    const user = (process.env.SMTP_USER || process.env.GMAIL_USER || '').trim();
    const pass = (process.env.SMTP_PASSWORD || process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '').trim();
    return Boolean(user && pass);
  }

  public async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    const webhookUrl = (process.env.GMAIL_WEBHOOK_URL || process.env.EMAIL_WEBHOOK_URL || '').trim();
    if (webhookUrl) {
      try {
        const res = await fetch(webhookUrl, { redirect: 'follow' });
        if (res.ok) {
          return {
            success: true,
            message: 'Google Apps Script HTTPS Relay verified and connected successfully (100% Render-compatible)!',
          };
        }
      } catch (err: any) {
        return {
          success: false,
          message: 'Failed to reach Google Apps Script Webhook: ' + (err?.message || err),
        };
      }
    }

    const brevoKey = (process.env.BREVO_API_KEY || '').trim();
    if (brevoKey) {
      try {
        const res = await fetch('https://api.brevo.com/v3/account', {
          headers: { 'api-key': brevoKey, 'accept': 'application/json' },
        });
        if (res.ok) {
          return {
            success: true,
            message: 'Brevo API authentication verified successfully over HTTPS (Render-compatible)!',
          };
        }
      } catch (err: any) {
        return {
          success: false,
          message: 'Failed to connect to Brevo API: ' + (err?.message || err),
        };
      }
    }

    this.initTransporter();

    if (!this.transporter) {
      return {
        success: false,
        message: 'SMTP credentials missing: Please provide GMAIL_WEBHOOK_URL, BREVO_API_KEY, or SMTP_USER/SMTP_PASSWORD in your .env or Render Dashboard.',
        details: {
          smtpUserConfigured: Boolean(process.env.SMTP_USER || process.env.GMAIL_USER),
          smtpPasswordConfigured: Boolean(process.env.SMTP_PASSWORD || process.env.GMAIL_APP_PASSWORD),
        },
      };
    }

    try {
      await this.transporter.verify();
      return {
        success: true,
        message: `Gmail SMTP authentication successful with ${process.env.SMTP_HOST || 'smtp.gmail.com'} for ${this.maskUser(process.env.SMTP_USER || '')}!`,
      };
    } catch (err: any) {
      console.error('❌ [EmailService] Connection verification failed:', err);
      const isTimeout = err?.code === 'ETIMEDOUT' || err?.message?.toLowerCase().includes('timeout');
      return {
        success: false,
        message: err?.message || 'SMTP verification failed',
        details: {
          code: err?.code,
          command: err?.command,
          response: err?.response,
          hint: isTimeout
            ? "Outbound SMTP port 587/465 is blocked by Render's free tier firewall. To send real emails from Render Free tier, add GMAIL_WEBHOOK_URL (Google Apps Script HTTPS relay) in Render Dashboard (Environment tab) to send over HTTPS port 443."
            : err?.code === 'EAUTH'
            ? 'Gmail authentication failed: Verify 2-Step Verification is active and use a 16-character Google App Password (not standard account password).'
            : 'Check SMTP host, port, and credentials.',
        },
      };
    }
  }

  public getStatus() {
    const webhookUrl = (process.env.GMAIL_WEBHOOK_URL || process.env.EMAIL_WEBHOOK_URL || '').trim();
    const brevoKey = (process.env.BREVO_API_KEY || '').trim();
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
    const user = (process.env.SMTP_USER || process.env.GMAIL_USER || '').replace(/^["']|["']$/g, '').trim();
    const from = process.env.SMTP_FROM || (user ? `"PocketBalance" <${user}>` : '"PocketBalance" <no-reply@pocketbalance.app>');

    return {
      configured: this.isConfigured(),
      host: webhookUrl ? 'script.google.com (HTTPS)' : brevoKey ? 'api.brevo.com (HTTPS)' : host,
      port: webhookUrl || brevoKey ? 443 : port,
      userMasked: webhookUrl ? 'Google Apps Script Relay' : brevoKey ? 'Brevo HTTPS API' : this.maskUser(user),
      from,
      mode: webhookUrl
        ? ('live_google_relay_http' as const)
        : brevoKey
        ? ('live_brevo_http' as const)
        : this.isConfigured()
        ? ('live_gmail_smtp' as const)
        : ('unconfigured' as const),
    };
  }

  public async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
    const webhookUrl = (process.env.GMAIL_WEBHOOK_URL || process.env.EMAIL_WEBHOOK_URL || '').trim();

    // 1. If GMAIL_WEBHOOK_URL is set, send via Google Apps Script HTTPS Relay (Port 443 - 100% Free, NO new signup!)
    if (webhookUrl) {
      try {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          redirect: 'follow',
          body: JSON.stringify({
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text,
          }),
        });

        const data: any = await res.json().catch(() => ({}));
        if (res.ok && data?.success !== false) {
          console.log(`✅ [EmailService:GoogleRelay] Real email sent to ${this.maskUser(options.to)} via Google HTTPS`);
          return { success: true };
        } else {
          console.error('❌ [EmailService:GoogleRelay] Delivery failed:', data);
          return { success: false, error: data?.error || 'Google Apps Script relay error' };
        }
      } catch (err: any) {
        console.error('❌ [EmailService:GoogleRelay] Error calling Google Relay:', err?.message || err);
        return { success: false, error: err?.message || 'Failed to dispatch email via Google Relay' };
      }
    }

    const brevoKey = (process.env.BREVO_API_KEY || '').trim();

    // 2. If BREVO_API_KEY is present, dispatch via Brevo HTTPS API
    if (brevoKey) {
      try {
        const senderEmail = (process.env.SMTP_USER || 'pocket.balance.exp@gmail.com').trim();
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'api-key': brevoKey,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            sender: {
              name: 'PocketBalance',
              email: senderEmail,
            },
            to: [{ email: options.to }],
            subject: options.subject,
            htmlContent: options.html,
            textContent: options.text,
          }),
        });

        const data: any = await res.json();
        if (res.ok && (data?.messageId || data?.id)) {
          console.log(`✅ [EmailService:Brevo HTTPS] Real email delivered to ${this.maskUser(options.to)} via HTTPS (ID: ${data.messageId || data.id})`);
          return { success: true };
        } else {
          console.error('❌ [EmailService:Brevo HTTPS] Delivery failed:', data);
          return { success: false, error: data?.message || 'Brevo HTTPS delivery failure' };
        }
      } catch (err: any) {
        console.error('❌ [EmailService:Brevo HTTPS] Error calling Brevo API:', err?.message || err);
        return { success: false, error: err?.message || 'Failed to dispatch email via Brevo API' };
      }
    }

    // 2. Otherwise dispatch via Nodemailer Gmail SMTP
    if (!this.transporter) {
      this.initTransporter();
    }

    if (!this.transporter) {
      return {
        success: false,
        error: 'SMTP credentials missing (SMTP_USER or SMTP_PASSWORD not set).',
      };
    }

    const fromAddress =
      process.env.SMTP_FROM ||
      (process.env.SMTP_USER ? `"PocketBalance" <${process.env.SMTP_USER}>` : '"PocketBalance" <no-reply@pocketbalance.app>');

    try {
      const info = await this.transporter.sendMail({
        from: fromAddress,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      console.log(`✅ [EmailService] Gmail sent email to ${this.maskUser(options.to)} (ID: ${info.messageId})`);
      return { success: true };
    } catch (err: any) {
      console.error(`❌ [EmailService] Failed to send email to ${this.maskUser(options.to)}:`, err?.message || err);
      const isTimeout = err?.code === 'ETIMEDOUT' || err?.message?.toLowerCase().includes('timeout');
      const errorMsg = isTimeout
        ? "Outbound SMTP port 587/465 is blocked by Render's free tier firewall. To send real emails from Render Free tier, add a free BREVO_API_KEY in Render Dashboard (Environment tab) to send over HTTPS port 443."
        : err?.message || 'SMTP delivery failure.';
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  public async sendVerificationOtp(email: string, otp: string, userName?: string): Promise<{ success: boolean; error?: string }> {
    const name = userName?.trim() || 'Valued User';
    const html = buildOtpEmailHtml({
      title: 'Verify Your Email Address',
      greeting: name,
      message: 'Thank you for registering with PocketBalance! Please enter the 6-digit verification code below to verify your email address.',
      otp,
      warningNote: 'Never share this code with anyone. PocketBalance support will never ask for your verification code.',
    });

    const text = `Hello ${name},\n\nYour PocketBalance email verification code is: ${otp}\nThis code is valid for 10 minutes.\n\nNever share this code with anyone.`;

    return this.sendEmail({
      to: email,
      subject: `Your PocketBalance Verification Code is ${otp}`,
      html,
      text,
    });
  }

  public async sendPasswordResetOtp(email: string, otp: string, userName?: string): Promise<{ success: boolean; error?: string }> {
    const name = userName?.trim() || 'Valued User';
    const html = buildOtpEmailHtml({
      title: 'Password Recovery Code',
      greeting: name,
      message: 'We received a request to reset the password for your PocketBalance account. Use the 6-digit recovery code below to set a new password.',
      otp,
      warningNote: 'If you did not request a password reset, you can safely ignore this email.',
    });

    const text = `Hello ${name},\n\nYour PocketBalance password recovery code is: ${otp}\nThis code is valid for 10 minutes.`;

    return this.sendEmail({
      to: email,
      subject: `Your PocketBalance Password Reset Code is ${otp}`,
      html,
      text,
    });
  }
}

// Export singleton instance
export const emailService: IEmailService = new NodemailerEmailService();
