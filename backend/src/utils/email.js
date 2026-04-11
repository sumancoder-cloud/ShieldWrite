const nodemailer = require('nodemailer');

const resolveTransport = () => {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpUser || !smtpPass) {
    throw new Error('SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS.');
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
};

const sendOtpEmail = async ({ to, firstName, otp }) => {
  const transporter = resolveTransport();
  const sender = process.env.SMTP_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from: sender,
    to,
    subject: 'ShieldWrite OTP Verification Code',
    text: `Hi ${firstName || 'there'}, your ShieldWrite OTP is ${otp}. It will expire in ${process.env.OTP_TTL_SECONDS || 300} seconds.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:20px;">
        <h2 style="margin:0 0 12px;color:#111;">ShieldWrite Verification</h2>
        <p style="margin:0 0 14px;color:#333;">Hi ${firstName || 'there'}, use this OTP to complete login:</p>
        <div style="font-size:28px;letter-spacing:6px;font-weight:700;background:#f3f4f6;padding:14px 18px;border-radius:10px;display:inline-block;">${otp}</div>
        <p style="margin:14px 0 0;color:#555;">This code expires in ${process.env.OTP_TTL_SECONDS || 300} seconds.</p>
        <p style="margin:6px 0 0;color:#777;font-size:12px;">If you did not request this, you can ignore this email.</p>
      </div>
    `,
  });
};

const sendEmailVerificationEmail = async ({ to, firstName, verificationUrl }) => {
  const transporter = resolveTransport();
  const sender = process.env.SMTP_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from: sender,
    to,
    subject: 'Verify your ShieldWrite email',
    text: `Hi ${firstName || 'there'}, verify your email by opening: ${verificationUrl}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:20px;">
        <h2 style="margin:0 0 12px;color:#111;">Verify your email</h2>
        <p style="margin:0 0 14px;color:#333;">Hi ${firstName || 'there'}, click below to verify your ShieldWrite account:</p>
        <a href="${verificationUrl}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:12px 16px;border-radius:8px;font-weight:600;">Verify Email</a>
        <p style="margin:14px 0 0;color:#777;font-size:12px;word-break:break-all;">If button does not work, open this URL: ${verificationUrl}</p>
      </div>
    `,
  });
};

const sendSecurityAlertEmail = async ({ to, subject, message, details }) => {
  const transporter = resolveTransport();
  const sender = process.env.SMTP_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from: sender,
    to,
    subject,
    text: `${message}\n\n${details || ''}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:20px;">
        <h2 style="margin:0 0 12px;color:#b91c1c;">Security Alert</h2>
        <p style="margin:0 0 10px;color:#111;">${message}</p>
        ${details ? `<pre style="white-space:pre-wrap;background:#f9fafb;padding:10px;border-radius:8px;border:1px solid #e5e7eb;color:#374151;">${details}</pre>` : ''}
      </div>
    `,
  });
};

module.exports = {
  sendOtpEmail,
  sendEmailVerificationEmail,
  sendSecurityAlertEmail,
};
