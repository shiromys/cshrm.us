import { Resend as ResendSDK } from "resend";

// Lazy init — avoids "Missing API key" error during Next.js build-time static analysis
let _client: ResendSDK | null = null;
function getClient(): ResendSDK {
  if (!_client) _client = new ResendSDK(process.env.RESEND_API_KEY ?? "");
  return _client;
}

const FROM = process.env.EMAIL_FROM_ADDRESS ?? "noreply@mail.cloudsourcehrm.us";
const FROM_NAME = "CloudSourceHRM";

export const resend = {
  async sendEmailVerification(to: string, name: string, url: string) {
    return getClient().emails.send({
      from: `${FROM_NAME} <${FROM}>`,
      to,
      subject: "Verify your CloudSourceHRM email",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#1B4F8A;">Welcome to CloudSourceHRM, ${name}!</h2>
          <p>Please verify your email address by clicking the button below:</p>
          <a href="${url}" style="display:inline-block;background:#1B4F8A;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
            Verify Email Address
          </a>
          <p style="color:#666;font-size:14px;margin-top:24px;">
            This link expires in 24 hours. If you didn't create an account, you can ignore this email.
          </p>
        </div>
      `,
    });
  },

  async sendPasswordReset(to: string, name: string, url: string) {
    return getClient().emails.send({
      from: `${FROM_NAME} <${FROM}>`,
      to,
      subject: "Reset your CloudSourceHRM password",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#1B4F8A;">Password Reset Request</h2>
          <p>Hi ${name}, click the button below to reset your password:</p>
          <a href="${url}" style="display:inline-block;background:#1B4F8A;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
            Reset Password
          </a>
          <p style="color:#666;font-size:14px;margin-top:24px;">
            This link expires in 1 hour. If you didn't request a password reset, you can ignore this email.
          </p>
        </div>
      `,
    });
  },

  async sendTransactional(opts: {
    to: string;
    subject: string;
    html: string;
    replyTo?: string;
  }) {
    return getClient().emails.send({
      from: `${FROM_NAME} <${FROM}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      replyTo: opts.replyTo,
    });
  },

  async sendBatch(emails: Array<{
    to: string;
    subject: string;
    html: string;
    text: string;
    replyTo?: string;
  }>) {
    return getClient().batch.send(
      emails.map((e) => ({
        from: `${FROM_NAME} <${FROM}>`,
        to: e.to,
        subject: e.subject,
        html: e.html,
        text: e.text,
        replyTo: e.replyTo,
      }))
    );
  },
};

// Export as a getter so worker.ts can use resendClient.emails.send() lazily too
export const resendClient = new Proxy({} as ResendSDK, {
  get(_target, prop) {
    return getClient()[prop as keyof ResendSDK];
  },
});
