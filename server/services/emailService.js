const nodemailer = require('nodemailer');

const MAIN_ADMIN_EMAIL = process.env.MAIN_ADMIN_EMAIL || 'sayemmd035@gmail.com';

/**
 * Configure Nodemailer Transporter
 */
const createTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER || process.env.GMAIL_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASS;

  if (user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return null;
};

/**
 * Send Admin Authorization OTP to Main Admin Gmail
 */
const sendAdminOtpEmail = async ({ toEmail = MAIN_ADMIN_EMAIL, otp, registrantName, registrantEmail }) => {
  const transporter = createTransporter();
  const recipient = toEmail || MAIN_ADMIN_EMAIL;

  const subject = `[ApexExam] Security Alert: Authorization OTP for New Admin Registration`;

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0a0d14; border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 14px; color: #f8fafc;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #818cf8; margin: 0; font-size: 24px; font-weight: 800;">ApexExam System Security</h1>
        <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Primary Administrator Authorization Request</p>
      </div>

      <div style="background: rgba(18, 25, 43, 0.9); padding: 20px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); margin-bottom: 24px;">
        <p style="margin-top: 0; color: #e2e8f0; font-size: 15px; line-height: 1.6;">
          Hello <strong>Primary Admin</strong>,
        </p>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          A user is requesting to register an <strong>Administrator (Examiner / Teacher)</strong> account on your ApexExam platform.
        </p>
        
        <div style="background: rgba(255, 255, 255, 0.04); padding: 14px; border-radius: 8px; margin: 16px 0;">
          <div style="font-size: 13px; color: #94a3b8;">Applicant Details:</div>
          <div style="font-size: 15px; font-weight: 600; color: #f8fafc; margin-top: 4px;">Name: ${registrantName || 'Not specified'}</div>
          <div style="font-size: 14px; color: #818cf8; margin-top: 2px;">Email: ${registrantEmail}</div>
        </div>

        <p style="color: #cbd5e1; font-size: 14px;">
          To authorize this new administrator, provide them with the following one-time grant code:
        </p>

        <div style="text-align: center; margin: 25px 0;">
          <div style="display: inline-block; padding: 16px 36px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; font-size: 32px; font-weight: 800; letter-spacing: 8px; border-radius: 12px; box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);">
            ${otp}
          </div>
          <div style="color: #fda4af; font-size: 12px; margin-top: 10px; font-weight: 500;">
            ⏰ Valid for 10 minutes only. Do not share if you did not approve this request.
          </div>
        </div>
      </div>

      <div style="text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 16px;">
        ApexExam Verification Service • Sent to Primary Administrator (${recipient})
      </div>
    </div>
  `;

  const textContent = `
ApexExam Primary Administrator Verification
---------------------------------------------
A user has requested to create an Administrator account:
- Applicant Name: ${registrantName || 'N/A'}
- Applicant Email: ${registrantEmail}

Your 6-digit Authorization Code is: ${otp}
This code will expire in 10 minutes.
If you did not authorize this, please ignore this email.
`;

  if (transporter) {
    try {
      const fromAddr = process.env.SMTP_FROM || `"ApexExam Security" <${process.env.SMTP_USER || process.env.GMAIL_USER}>`;
      const info = await transporter.sendMail({
        from: fromAddr,
        to: recipient,
        subject,
        text: textContent,
        html: htmlContent,
      });
      console.log(`[EMAIL SUCCESS] Admin OTP sent to ${recipient} (Message ID: ${info.messageId})`);
      return { success: true, sentTo: recipient, messageId: info.messageId };
    } catch (err) {
      console.error('[EMAIL ERROR] Failed to send email via SMTP:', err.message);
      // Fall through to terminal log
    }
  }

  // Development / Fallback logger
  console.log('\n======================================================');
  console.log('🔑 [ADMIN REGISTRATION OTP - PRIMARY ADMIN NOTIFICATION]');
  console.log(`📩 Recipient (Main Admin Gmail): ${recipient}`);
  console.log(`👤 Requesting Registrant: ${registrantName} <${registrantEmail}>`);
  console.log(`🔢 6-DIGIT GRANT OTP: >>> ${otp} <<<`);
  console.log('⏰ Expiration: 10 minutes');
  console.log('======================================================\n');

  return { success: true, sentTo: recipient, isDevFallback: true };
};

module.exports = {
  MAIN_ADMIN_EMAIL,
  sendAdminOtpEmail,
};
