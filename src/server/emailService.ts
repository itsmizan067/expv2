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
   * Send a raw email using the configured transport.
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
    mode: 'live_gmail_smtp' | 'development_simulation';
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
 * Standard Nodemailer implementation supporting Gmail SMTP and other standard SMTP relays.
 */
export class NodemailerEmailService implements IEmailService {
  private transporter: Transporter | null = null;
  private hasWarnedMissingCredentials = false;

  constructor() {
    this.initTransporter();
  }

  private initTransporter(): void {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    const user = (process.env.SMTP_USER || '').trim();
    // Auto-strip spaces in Google App Password (users often copy with 4-char space grouping)
    const pass = (process.env.SMTP_PASSWORD || '').replace(/\s+/g, '').trim();

    if (user && pass) {
      try {
        const transportConfig: any = {
          host,
          port,
          secure,
          auth: { user, pass },
          tls: {
            rejectUnauthorized: true,
          },
          // 15-second socket timeout to prevent hung requests
          connectionTimeout: 15000,
          greetingTimeout: 15000,
          socketTimeout: 20000,
        };

        // If explicitly pointing to smtp.gmail.com, nodemailer's built-in service definition
        // handles Gmail's ports & host resolution automatically
        if (host === 'smtp.gmail.com' && !process.env.SMTP_PORT) {
          transportConfig.service = 'gmail';
        }

        this.transporter = nodemailer.createTransport(transportConfig);
        console.log(`📧 [EmailService] Gmail SMTP Transport initialized for: ${this.maskUser(user)} on ${host}:${port}`);
      } catch (err: any) {
        console.error('❌ [EmailService] Failed to create nodemailer transport:', err?.message || err);
      }
    } else {
      this.transporter = null;
      if (!this.hasWarnedMissingCredentials) {
        console.log('ℹ️ [EmailService] Gmail SMTP credentials (SMTP_USER/SMTP_PASSWORD) not configured in .env.');
        console.log('   Email verification & password reset are running in SIMULATED FALLBACK mode until valid credentials are added to .env');
        this.hasWarnedMissingCredentials = true;
      }
    }
  }

  private maskUser(user: string): string {
    if (!user || !user.includes('@')) return user || 'not-set';
    const [name, domain] = user.split('@');
    return `${name.slice(0, 2)}***@${domain}`;
  }

  public isConfigured(): boolean {
    const user = (process.env.SMTP_USER || '').trim();
    const pass = (process.env.SMTP_PASSWORD || '').replace(/\s+/g, '').trim();
    return Boolean(this.transporter && user && pass);
  }

  public async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    this.initTransporter();

    if (!this.transporter) {
      return {
        success: false,
        message: 'SMTP credentials missing: Please provide SMTP_USER and SMTP_PASSWORD in your .env file.',
        details: {
          smtpUserConfigured: Boolean(process.env.SMTP_USER),
          smtpPasswordConfigured: Boolean(process.env.SMTP_PASSWORD),
        },
      };
    }

    try {
      await this.transporter.verify();
      return {
        success: true,
        message: `SMTP connection and authentication verified successfully with ${process.env.SMTP_HOST || 'smtp.gmail.com'} for ${this.maskUser(process.env.SMTP_USER || '')}!`,
      };
    } catch (err: any) {
      console.error('❌ [EmailService] Connection verification failed:', err);
      return {
        success: false,
        message: err?.message || 'SMTP verification failed',
        details: {
          code: err?.code,
          command: err?.command,
          response: err?.response,
          responseCode: err?.responseCode,
          hint:
            err?.code === 'EAUTH'
              ? 'Gmail authentication failed: Make sure 2-Step Verification is enabled and you are using a 16-character Google App Password (not your standard Gmail login password).'
              : err?.code === 'ETIMEDOUT' || err?.code === 'ECONNREFUSED'
              ? `Could not reach ${process.env.SMTP_HOST || 'smtp.gmail.com'}:${process.env.SMTP_PORT || 587}. Your network/host may be blocking outbound port ${process.env.SMTP_PORT || 587}. Try port 465 with SMTP_SECURE=true.`
              : 'Check SMTP host, port, and security settings in .env.',
        },
      };
    }
  }

  public getStatus() {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
    const user = (process.env.SMTP_USER || '').trim();
    const from = process.env.SMTP_FROM || (user ? `"PocketBalance" <${user}>` : '"PocketBalance" <no-reply@pocketbalance.app>');

    return {
      configured: this.isConfigured(),
      host,
      port,
      userMasked: this.maskUser(user),
      from,
      mode: this.isConfigured() ? ('live_gmail_smtp' as const) : ('development_simulation' as const),
    };
  }

  public async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
    // Re-check transporter in case env vars were set after startup
    if (!this.transporter) {
      this.initTransporter();
    }

    const fromAddress =
      process.env.SMTP_FROM ||
      (process.env.SMTP_USER ? `"PocketBalance" <${process.env.SMTP_USER}>` : '"PocketBalance" <no-reply@pocketbalance.app>');

    if (!this.transporter) {
      // In development fallback mode without SMTP credentials:
      // Never log the OTP value! Only indicate that message was delivered to mock/fallback handler.
      console.log(`📬 [EmailService Fallback] Simulated email dispatch to ${this.maskUser(options.to)} | Subject: "${options.subject}"`);
      return { success: true };
    }

    try {
      const info = await this.transporter.sendMail({
        from: fromAddress,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      console.log(`✅ [EmailService] Real email successfully delivered to ${this.maskUser(options.to)} (MessageId: ${info.messageId})`);
      return { success: true };
    } catch (err: any) {
      console.error(`❌ [EmailService] Failed to send email to ${this.maskUser(options.to)}:`, err?.message || err);
      return {
        success: false,
        error: err?.message || 'SMTP delivery failure. Please check your Gmail App Password and SMTP settings.',
      };
    }
  }

  public async sendVerificationOtp(email: string, otp: string, userName?: string): Promise<{ success: boolean; error?: string }> {
    const name = userName?.trim() || 'Valued User';
    const html = buildOtpEmailHtml({
      title: 'Verify Your Email Address',
      greeting: name,
      message: 'Thank you for registering with PocketBalance! Please enter the 6-digit verification code below to verify your email address and activate your account with your 7-day free trial.',
      otp,
      warningNote: 'Never share this code with anyone. PocketBalance support representatives will never ask for your verification code.',
    });

    const text = `Hello ${name},\n\nYour PocketBalance email verification code is: ${otp}\nThis code is valid for 10 minutes.\n\nNever share this code with anyone.`;

    return this.sendEmail({
      to: email,
      subject: 'Verify your PocketBalance account with your 6-digit code',
      html,
      text,
    });
  }

  public async sendPasswordResetOtp(email: string, otp: string, userName?: string): Promise<{ success: boolean; error?: string }> {
    const name = userName?.trim() || 'Valued User';
    const html = buildOtpEmailHtml({
      title: 'Password Recovery Code',
      greeting: name,
      message: 'We received a request to reset the password for your PocketBalance account. Use the 6-digit recovery code below to authenticate and set a new password.',
      otp,
      warningNote: 'If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.',
    });

    const text = `Hello ${name},\n\nYour PocketBalance password recovery code is: ${otp}\nThis code is valid for 10 minutes.\n\nIf you did not request this, please ignore this email.`;

    return this.sendEmail({
      to: email,
      subject: 'PocketBalance Password Reset Verification Code',
      html,
      text,
    });
  }
}

// Export singleton instance of EmailService abstraction
export const emailService: IEmailService = new NodemailerEmailService();
