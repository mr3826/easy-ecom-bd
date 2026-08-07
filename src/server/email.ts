export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

function getEmailBaseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <tr>
        <td style="background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
          ${content}
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
            This email was sent from Bornohin. If you didn't request this, please ignore it.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
}

export function getPasswordResetEmail(resetUrl: string, userName: string): EmailTemplate {
  const htmlContent = `
    <h1 style="font-size: 24px; font-weight: 800; color: #1f2937; margin: 0 0 16px;">Reset your password</h1>
    <p style="font-size: 16px; color: #4b5563; line-height: 1.6; margin: 0 0 24px;">
      Hi ${userName},
    </p>
    <p style="font-size: 16px; color: #4b5563; line-height: 1.6; margin: 0 0 24px;">
      We received a request to reset your password. Click the button below to create a new password:
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${resetUrl}" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; text-decoration: none;">
        Reset Password
      </a>
    </div>
    <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 24px;">
      This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.
    </p>
    <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0;">
      Or copy and paste this link into your browser:<br>
      <a href="${resetUrl}" style="color: #6366f1; word-break: break-all;">${resetUrl}</a>
    </p>
  `;

  const textContent = `
Reset your password

Hi ${userName},

We received a request to reset your password. Visit the following link to create a new password:

${resetUrl}

This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.
  `.trim();

  return {
    subject: "Reset your Bornohin password",
    html: getEmailBaseTemplate(htmlContent),
    text: textContent,
  };
}

export function getEmailVerificationEmail(verifyUrl: string, userName: string): EmailTemplate {
  const htmlContent = `
    <h1 style="font-size: 24px; font-weight: 800; color: #1f2937; margin: 0 0 16px;">Verify your email address</h1>
    <p style="font-size: 16px; color: #4b5563; line-height: 1.6; margin: 0 0 24px;">
      Hi ${userName},
    </p>
    <p style="font-size: 16px; color: #4b5563; line-height: 1.6; margin: 0 0 24px;">
      Thanks for signing up! Please verify your email address by clicking the button below:
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${verifyUrl}" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; text-decoration: none;">
        Verify Email
      </a>
    </div>
    <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 24px;">
      This link will expire in 24 hours.
    </p>
    <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0;">
      Or copy and paste this link into your browser:<br>
      <a href="${verifyUrl}" style="color: #6366f1; word-break: break-all;">${verifyUrl}</a>
    </p>
  `;

  const textContent = `
Verify your email address

Hi ${userName},

Thanks for signing up! Please verify your email address by visiting the following link:

${verifyUrl}

This link will expire in 24 hours.
  `.trim();

  return {
    subject: "Verify your Bornohin email address",
    html: getEmailBaseTemplate(htmlContent),
    text: textContent,
  };
}

export async function sendEmail(to: string, template: EmailTemplate): Promise<{ success: boolean; error?: string }> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const fromEmail = process.env.FROM_EMAIL || "noreply@bornohin.com";
  const fromName = process.env.FROM_NAME || "Bornohin";

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    console.warn("SMTP not configured; email would be sent to:", to, template.subject);
    return { success: false, error: "SMTP not configured" };
  }

  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: Number(smtpPort) === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to send email:", error);
    return { success: false, error: String(error) };
  }
}
