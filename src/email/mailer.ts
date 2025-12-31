/**
 * Email Service Module
 * Sends emails using Nodemailer with Ethereal (test) or production SMTP
 */

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

let transporter: Transporter | null = null;
let testAccount: { user: string; pass: string } | null = null;

/**
 * Initialize email transporter
 * Uses Ethereal for development/testing
 */
export async function initEmailTransporter(): Promise<void> {
  try {
    // Check if production SMTP is configured
    if (
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    ) {
      // Production SMTP
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      console.log("✅ Email: Production SMTP configured");
    } else {
      // Development: Use Ethereal (test email)
      testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount!.user,
          pass: testAccount!.pass,
        },
      });
      console.log("✅ Email: Ethereal test account created");
      console.log(`   📧 View emails at: https://ethereal.email/messages`);
      console.log(`   👤 Login: ${testAccount!.user}`);
      console.log(`   🔑 Password: ${testAccount!.pass}`);
    }

    // Verify connection
    await transporter.verify();
    console.log("✅ Email: Transporter verified and ready");
  } catch (error) {
    console.error("❌ Email: Failed to initialize transporter:", error);
    throw error;
  }
}

/**
 * Send email
 */
export async function sendEmail(options: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<{
  success: boolean;
  messageId?: string;
  previewUrl?: string;
  error?: string;
}> {
  if (!transporter) {
    return {
      success: false,
      error:
        "Email transporter not initialized. Call initEmailTransporter() first.",
    };
  }

  try {
    const info = await transporter.sendMail({
      from:
        process.env.EMAIL_FROM || '"Cloud Agents" <noreply@cloudagents.dev>',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    // For Ethereal, get preview URL
    const previewUrl = testAccount
      ? nodemailer.getTestMessageUrl(info)
      : undefined;

    if (previewUrl) {
      console.log(`📧 Email sent to ${options.to}`);
      console.log(`   Preview: ${previewUrl}`);
    } else {
      console.log(
        `📧 Email sent to ${options.to} (Message ID: ${info.messageId})`,
      );
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: previewUrl || undefined,
    };
  } catch (error) {
    console.error("❌ Email send failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(
  email: string,
  token: string,
): Promise<{ success: boolean; previewUrl?: string; error?: string }> {
  const verifyUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/verify-email?token=${token}`;

  const result = await sendEmail({
    to: email,
    subject: "Verify your email - Cloud Agents",
    text: `
Hello,

Please verify your email address by clicking the link below:

${verifyUrl}

This link will expire in 24 hours.

If you didn't request this, please ignore this email.

Best regards,
Cloud Agents Team
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Verify your email address</h2>
    <p>Hello,</p>
    <p>Please verify your email address by clicking the button below:</p>
    <p>
      <a href="${verifyUrl}" class="button">Verify Email</a>
    </p>
    <p>Or copy this link into your browser:</p>
    <p style="word-break: break-all; color: #4F46E5;">${verifyUrl}</p>
    <p>This link will expire in <strong>24 hours</strong>.</p>
    <div class="footer">
      <p>If you didn't request this, please ignore this email.</p>
      <p>Best regards,<br>Cloud Agents Team</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
  });

  return result;
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string,
): Promise<{ success: boolean; previewUrl?: string; error?: string }> {
  const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${token}`;

  const result = await sendEmail({
    to: email,
    subject: "Reset your password - Cloud Agents",
    text: `
Hello,

You requested to reset your password. Click the link below to set a new password:

${resetUrl}

This link will expire in 1 hour.

If you didn't request this, please ignore this email and your password will remain unchanged.

Best regards,
Cloud Agents Team
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { display: inline-block; padding: 12px 24px; background: #DC2626; color: white; text-decoration: none; border-radius: 6px; }
    .warning { background: #FEF2F2; border-left: 4px solid #DC2626; padding: 12px; margin: 20px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Reset your password</h2>
    <p>Hello,</p>
    <p>You requested to reset your password. Click the button below to set a new password:</p>
    <p>
      <a href="${resetUrl}" class="button">Reset Password</a>
    </p>
    <p>Or copy this link into your browser:</p>
    <p style="word-break: break-all; color: #DC2626;">${resetUrl}</p>
    <div class="warning">
      <strong>⚠️ Security Notice:</strong> This link will expire in <strong>1 hour</strong> for your security.
    </div>
    <div class="footer">
      <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
      <p>Best regards,<br>Cloud Agents Team</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
  });

  return result;
}

/**
 * Get test account info (Ethereal)
 */
export function getTestAccountInfo(): {
  user: string;
  pass: string;
  url: string;
} | null {
  if (!testAccount) {
    return null;
  }

  return {
    user: testAccount.user,
    pass: testAccount.pass,
    url: "https://ethereal.email/messages",
  };
}
